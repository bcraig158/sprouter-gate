import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { DateTime } from 'luxon';
import { runQuery, getQuery, allQuery } from '../db';
import { 
  calculateAllowance, 
  getCurrentPhase, 
  getAvailableEvents,
  canRequestTicketsForNight,
  getNightForEvent
} from '../utils/limits';
import { 
  trackUserActivity, 
  trackShowSelection, 
  trackPurchaseIntent, 
  trackPurchase, 
  trackSprouterSuccess,
  checkDailyPurchaseLimits,
  getUserActivityTimeline,
  getDetailedAnalytics
} from '../utils/analytics';

// Extend Express Request interface to include householdId
declare global {
  namespace Express {
    interface Request {
      householdId?: string;
    }
  }
}

const router = express.Router();

// JWT secret from environment
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

interface LoginRequest {
  studentId: string;
}

interface VolunteerLoginRequest {
  volunteerCode: string;
  email: string;
}

interface LoginResponse {
  success: boolean;
  token?: string;
  householdId?: string;
  isVolunteer?: boolean;
  isAdmin?: boolean;
  message?: string;
}

interface StateResponse {
  householdId: string;
  isVolunteer: boolean;
  currentPhase: 'initial' | 'second-wave';
  allowance: any;
  nightStates: any[];
  availableEvents: any[];
}

interface SelectSlotRequest {
  night: 'tue' | 'thu';
  eventKey: string;
  ticketsRequested: number;
}

interface IssueIntentRequest {
  eventKey: string;
  ticketsRequested: number;
}

// Middleware to verify JWT token
function verifyToken(req: express.Request, res: express.Response, next: express.NextFunction): void {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    res.status(401).json({ error: 'No token provided' });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.householdId = decoded.householdId;
    next();
  } catch (error) {
    console.error('JWT verification error:', error);
    res.status(401).json({ error: 'Invalid token' });
    return;
  }
}

// POST /api/login
router.post('/login', async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    const { studentId }: LoginRequest = req.body;

    if (!studentId) {
      res.status(400).json({ 
        success: false, 
        message: 'Student ID is required' 
      });
      return;
    }

    // Find student by student ID
    const student = await getQuery<{ id: number; student_id: string; household_id: string }>(
      'SELECT * FROM students WHERE student_id = ?',
      [studentId]
    );

    if (!student) {
      console.log(`❌ Invalid student login attempt: ${studentId}`);
      res.status(404).json({ 
        success: false, 
        message: 'Student ID not found. Please check your Student ID and try again.' 
      });
      return;
    }

    console.log(`✅ Valid student login: ${studentId} (Household: ${student.household_id})`);

    // Get household information
    const household = await getQuery<{ 
      id: number; 
      household_id: string; 
      volunteer_code: string | null; 
      volunteer_redeemed: boolean 
    }>(
      'SELECT * FROM households WHERE household_id = ?',
      [student.household_id]
    );

    if (!household) {
      res.status(500).json({ 
        success: false, 
        message: 'Household not found' 
      });
      return;
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        householdId: student.household_id,
        studentId: student.student_id 
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Create session
    const sessionId = bcrypt.hashSync(student.household_id + Date.now(), 10);
    const expiresAt = DateTime.now().plus({ hours: 24 }).toISO();

    await runQuery(
      'INSERT INTO sessions (session_id, household_id, expires_at) VALUES (?, ?, ?)',
      [sessionId, student.household_id, expiresAt]
    );

    // Enhanced login tracking
    await runQuery(
      `INSERT INTO user_logins (user_id, user_type, identifier, email, name, ip_address, user_agent, login_timestamp, session_id) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        student.household_id,
        'student',
        studentId,
        '', // Student email not available in current schema
        '', // Student name not available in current schema
        req.ip,
        req.get('User-Agent') || '',
        new Date().toISOString(),
        sessionId
      ]
    );

    // Track login activity
    await trackUserActivity({
      user_id: student.household_id,
      user_type: 'student',
      activity_type: 'login',
      activity_details: `Student login: ${studentId}`,
      session_id: sessionId,
      ip_address: req.ip,
      user_agent: req.get('User-Agent') || '',
      metadata: {
        student_id: studentId,
        login_source: 'web'
      }
    });

    // Log the login
    await runQuery(
      'INSERT INTO audit_log (household_id, action, details, ip_address) VALUES (?, ?, ?, ?)',
      [student.household_id, 'login', `Student ID: ${studentId}`, req.ip]
    );

    const response: LoginResponse = {
      success: true,
      token,
      householdId: student.household_id,
      isVolunteer: household.volunteer_redeemed
    };

    res.json(response);
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

// POST /api/volunteer-login
router.post('/volunteer-login', async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    const { volunteerCode, email }: VolunteerLoginRequest = req.body;

    if (!volunteerCode || !email) {
      res.status(400).json({ 
        success: false, 
        message: 'Volunteer code and email are required' 
      });
      return;
    }

    // Load volunteer codes from JSON file
    const fs = require('fs');
    const path = require('path');
    const volunteerCodesPath = path.join(__dirname, '../../../volunteer-codes.json');
    
    if (!fs.existsSync(volunteerCodesPath)) {
      res.status(500).json({ 
        success: false, 
        message: 'Volunteer codes not found' 
      });
      return;
    }

    const volunteerCodes = JSON.parse(fs.readFileSync(volunteerCodesPath, 'utf-8'));
    
    // Find volunteer by code and email
    const volunteer = volunteerCodes.find((v: any) => 
      v.code === volunteerCode && v.email.toLowerCase() === email.toLowerCase()
    );

    if (!volunteer) {
      console.log(`❌ Invalid volunteer login attempt: ${volunteerCode} / ${email}`);
      res.status(404).json({ 
        success: false, 
        message: 'Invalid volunteer code or email. Please check your credentials and try again.' 
      });
      return;
    }

    console.log(`✅ Valid volunteer login: ${volunteer.name} (${volunteer.email})`);

    // Check if this is an admin login
    const isAdmin = volunteerCode === '339933' && volunteer.email.toLowerCase() === 'admin@maidu.com';
    
    // Generate JWT token for volunteer (or admin)
    const volunteerHouseholdId = isAdmin ? 'ADMIN' : `VOL_${volunteerCode}`;
    const token = jwt.sign(
      { 
        householdId: volunteerHouseholdId,
        volunteerCode: volunteerCode,
        isVolunteer: true,
        isAdmin: isAdmin
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Create session for volunteer
    const sessionId = bcrypt.hashSync(volunteerHouseholdId + Date.now(), 10);
    const expiresAt = DateTime.now().plus({ hours: 24 }).toISO();

    await runQuery(
      'INSERT INTO sessions (session_id, household_id, expires_at) VALUES (?, ?, ?)',
      [sessionId, volunteerHouseholdId, expiresAt]
    );

    // Enhanced volunteer login tracking
    await runQuery(
      `INSERT INTO user_logins (user_id, user_type, identifier, email, name, ip_address, user_agent, login_timestamp, session_id) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        volunteerHouseholdId,
        'volunteer',
        volunteerCode,
        volunteer.email,
        volunteer.name,
        req.ip,
        req.get('User-Agent') || '',
        new Date().toISOString(),
        sessionId
      ]
    );

    // Track volunteer login activity
    await trackUserActivity({
      user_id: volunteerHouseholdId,
      user_type: 'volunteer',
      activity_type: 'login',
      activity_details: `Volunteer login: ${volunteer.name} (${volunteer.email})`,
      session_id: sessionId,
      ip_address: req.ip,
      user_agent: req.get('User-Agent') || '',
      metadata: {
        volunteer_code: volunteerCode,
        volunteer_name: volunteer.name,
        volunteer_email: volunteer.email,
        login_source: 'web'
      }
    });

    // Log the volunteer login
    await runQuery(
      'INSERT INTO audit_log (household_id, action, details, ip_address) VALUES (?, ?, ?, ?)',
      [volunteerHouseholdId, 'volunteer_login', `Volunteer: ${volunteer.name} (${volunteer.email})`, req.ip]
    );

    const response: LoginResponse = {
      success: true,
      token,
      householdId: volunteerHouseholdId,
      isVolunteer: true,
      isAdmin: isAdmin
    };

    res.json(response);
  } catch (error) {
    console.error('Volunteer login error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

// GET /api/state
router.get('/state', verifyToken, async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    const householdId = req.householdId;
    
    if (!householdId) {
      res.status(401).json({ error: 'No household ID found' });
      return;
    }

    // Get household information
    const household = await getQuery<{ 
      household_id: string; 
      volunteer_redeemed: boolean 
    }>(
      'SELECT household_id, volunteer_redeemed FROM households WHERE household_id = ?',
      [householdId]
    );

    if (!household) {
      res.status(404).json({ error: 'Household not found' });
      return;
    }

    // Get current phase and allowance
    const currentPhase = getCurrentPhase();
    const allowance = calculateAllowance(household.volunteer_redeemed, currentPhase);

    // Get night states for both nights
    const nightStates = await allQuery<{
      night: string;
      tickets_requested: number;
      tickets_purchased: number;
      shows_selected: string;
    }>(
      'SELECT night, tickets_requested, tickets_purchased, shows_selected FROM family_night_state WHERE household_id = ?',
      [householdId]
    );

    // Get available events
    const availableEvents = getAvailableEvents();

    const response: StateResponse = {
      householdId,
      isVolunteer: household.volunteer_redeemed,
      currentPhase,
      allowance,
      nightStates,
      availableEvents
    };

    res.json(response);
  } catch (error) {
    console.error('State error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/select-slot
router.post('/select-slot', verifyToken, async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    const { night, eventKey, ticketsRequested }: SelectSlotRequest = req.body;
    const householdId = req.householdId;

    if (!night || !eventKey || !ticketsRequested) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    if (!householdId) {
      res.status(401).json({ error: 'No household ID found' });
      return;
    }

    // Get household information
    const household = await getQuery<{ volunteer_redeemed: boolean }>(
      'SELECT volunteer_redeemed FROM households WHERE household_id = ?',
      [householdId]
    );

    if (!household) {
      res.status(404).json({ error: 'Household not found' });
      return;
    }

    // Get current night state
    const currentState = await getQuery<{
      tickets_requested: number;
      tickets_purchased: number;
      shows_selected: string;
    }>(
      'SELECT tickets_requested, tickets_purchased, shows_selected FROM family_night_state WHERE household_id = ? AND night = ?',
      [householdId, night]
    );

    const currentTicketsRequested = currentState?.tickets_requested || 0;
    const currentTicketsPurchased = currentState?.tickets_purchased || 0;
    const currentShows = currentState?.shows_selected ? JSON.parse(currentState.shows_selected) : [];

    // Validate the request
    const validation = canRequestTicketsForNight(
      night,
      currentTicketsRequested,
      currentTicketsPurchased,
      household.volunteer_redeemed
    );

    if (!validation.canRequest) {
      res.status(400).json({ 
        error: validation.reason,
        allowance: validation.allowance
      });
      return;
    }

    // Check if event is still available
    const nightInfo = getNightForEvent(eventKey);
    if (!nightInfo || nightInfo.night !== night) {
      res.status(400).json({ error: 'Invalid event for this night' });
      return;
    }

    // Update or create night state
    const newTicketsRequested = currentTicketsRequested + ticketsRequested;
    const newShows = [...currentShows, eventKey];

    await runQuery(
      `INSERT OR REPLACE INTO family_night_state 
       (household_id, night, tickets_requested, tickets_purchased, shows_selected, updated_at) 
       VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [householdId, night, newTicketsRequested, currentTicketsPurchased, JSON.stringify(newShows)]
    );

    // Track show selection with enhanced analytics
    const showNightInfo = getNightForEvent(eventKey);
    if (showNightInfo) {
      // Get the specific event details
      const eventDetails = showNightInfo.events.find(e => e.key === eventKey);
      if (eventDetails) {
        const showDateTime = `${eventDetails.date}T${eventDetails.time}:00`;
        await trackShowSelection({
          user_id: householdId,
          user_type: household.volunteer_redeemed ? 'volunteer' : 'student',
          show_id: eventKey,
          show_date: eventDetails.date,
          show_time: eventDetails.time,
          show_datetime: showDateTime,
          tickets_requested: ticketsRequested,
          session_id: req.headers['x-session-id'] as string,
          ip_address: req.ip,
          user_agent: req.get('User-Agent')
        });
      }
    }

    // Log the action
    await runQuery(
      'INSERT INTO audit_log (household_id, action, details, ip_address) VALUES (?, ?, ?, ?)',
      [householdId, 'select_slot', `Night: ${night}, Event: ${eventKey}, Tickets: ${ticketsRequested}`, req.ip]
    );

    res.json({ 
      success: true, 
      message: 'Slot selected successfully',
      newTicketsRequested,
      showsSelected: newShows
    });
  } catch (error) {
    console.error('Select slot error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/issue-intent
router.post('/issue-intent', verifyToken, async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    const { eventKey, ticketsRequested }: IssueIntentRequest = req.body;
    const householdId = req.householdId;

    if (!eventKey || !ticketsRequested) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    if (!householdId) {
      res.status(401).json({ error: 'No household ID found' });
      return;
    }

    // Get night for this event
    const nightInfo = getNightForEvent(eventKey);
    if (!nightInfo) {
      res.status(400).json({ error: 'Invalid event key' });
      return;
    }

    // Get current night state
    const currentState = await getQuery<{
      tickets_requested: number;
      tickets_purchased: number;
      shows_selected: string;
    }>(
      'SELECT tickets_requested, tickets_purchased, shows_selected FROM family_night_state WHERE household_id = ? AND night = ?',
      [householdId, nightInfo.night]
    );

    if (!currentState) {
      res.status(400).json({ error: 'No slot selected for this night' });
      return;
    }

    const currentShows = JSON.parse(currentState.shows_selected);
    if (!currentShows.includes(eventKey)) {
      res.status(400).json({ error: 'Event not selected for this night' });
      return;
    }

    // Check daily purchase limits before allowing intent
    const household = await getQuery<{ volunteer_redeemed: boolean }>(
      'SELECT volunteer_redeemed FROM households WHERE household_id = ?',
      [householdId]
    );

    if (!household) {
      res.status(404).json({ error: 'Household not found' });
      return;
    }

    const limitCheck = await checkDailyPurchaseLimits(
      householdId, 
      household.volunteer_redeemed ? 'volunteer' : 'student', 
      eventKey, 
      ticketsRequested
    );

    if (!limitCheck.canPurchase) {
      res.status(400).json({ 
        error: limitCheck.reason,
        currentTickets: limitCheck.currentTickets,
        maxAllowed: limitCheck.maxAllowed
      });
      return;
    }

    // Generate purchase intent (in a real implementation, this would integrate with Sprouter)
    const intentId = `intent_${householdId}_${eventKey}_${Date.now()}`;
    
    // Get night info for enhanced tracking
    const intentNightInfo = getNightForEvent(eventKey);
    if (!intentNightInfo) {
      res.status(400).json({ error: 'Invalid event key' });
      return;
    }

    // Get the specific event details
    const eventDetails = intentNightInfo.events.find(e => e.key === eventKey);
    if (!eventDetails) {
      res.status(400).json({ error: 'Event details not found' });
      return;
    }

    const showDateTime = `${eventDetails.date}T${eventDetails.time}:00`;
    
    // Track purchase intent
    await trackPurchaseIntent({
      user_id: householdId,
      user_type: household.volunteer_redeemed ? 'volunteer' : 'student',
      show_id: eventKey,
      show_date: eventDetails.date,
      show_time: eventDetails.time,
      show_datetime: showDateTime,
      tickets_requested: ticketsRequested,
      intent_id: intentId,
      sprouter_url: `https://proposal.xraypayment.com/embed/${eventKey}?intent=${intentId}&tickets=${ticketsRequested}`,
      session_id: req.headers['x-session-id'] as string,
      ip_address: req.ip,
      user_agent: req.get('User-Agent')
    });

    // Log the intent creation
    await runQuery(
      'INSERT INTO audit_log (household_id, action, details, ip_address) VALUES (?, ?, ?, ?)',
      [householdId, 'issue_intent', `Event: ${eventKey}, Tickets: ${ticketsRequested}, Intent: ${intentId}`, req.ip]
    );

    // Return Sprouter embed URL (using updated xraypayment.com domains)
    const sprouterUrl = `https://proposal.xraypayment.com/embed/${eventKey}?intent=${intentId}&tickets=${ticketsRequested}`;

    res.json({
      success: true,
      intentId,
      sprouterUrl,
      eventKey,
      ticketsRequested
    });
  } catch (error) {
    console.error('Issue intent error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/track-purchase
router.post('/track-purchase', verifyToken, async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    const { 
      showId, 
      showDate, 
      showTime, 
      ticketsPurchased, 
      totalCost, 
      paymentStatus, 
      transactionId, 
      sprouterTransactionId, 
      sprouterOrderId, 
      paymentMethod 
    } = req.body;
    
    const householdId = req.householdId;
    
    if (!householdId) {
      res.status(401).json({ error: 'No household ID found' });
      return;
    }

    // Get household information
    const household = await getQuery<{ volunteer_redeemed: boolean }>(
      'SELECT volunteer_redeemed FROM households WHERE household_id = ?',
      [householdId]
    );

    if (!household) {
      res.status(404).json({ error: 'Household not found' });
      return;
    }

    const showDateTime = `${showDate}T${showTime}:00`;

    // Track the purchase
    await trackPurchase({
      user_id: householdId,
      user_type: household.volunteer_redeemed ? 'volunteer' : 'student',
      show_id: showId,
      show_date: showDate,
      show_time: showTime,
      show_datetime: showDateTime,
      tickets_purchased: ticketsPurchased,
      total_cost: totalCost,
      payment_status: paymentStatus,
      transaction_id: transactionId,
      sprouter_transaction_id: sprouterTransactionId,
      sprouter_order_id: sprouterOrderId,
      session_id: req.headers['x-session-id'] as string,
      ip_address: req.ip,
      user_agent: req.get('User-Agent') || '',
      payment_method: paymentMethod
    });

    res.json({ success: true, message: 'Purchase tracked successfully' });
  } catch (error) {
    console.error('Track purchase error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/track-sprouter-success
router.post('/track-sprouter-success', verifyToken, async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    const { 
      showId, 
      showDate, 
      showTime, 
      sprouterTransactionId, 
      sprouterOrderId, 
      returnUrl 
    } = req.body;
    
    const householdId = req.householdId;
    
    if (!householdId) {
      res.status(401).json({ error: 'No household ID found' });
      return;
    }

    // Get household information
    const household = await getQuery<{ volunteer_redeemed: boolean }>(
      'SELECT volunteer_redeemed FROM households WHERE household_id = ?',
      [householdId]
    );

    if (!household) {
      res.status(404).json({ error: 'Household not found' });
      return;
    }

    const showDateTime = `${showDate}T${showTime}:00`;

    // Track Sprouter success
    await trackSprouterSuccess({
      user_id: householdId,
      user_type: household.volunteer_redeemed ? 'volunteer' : 'student',
      show_id: showId,
      show_date: showDate,
      show_time: showTime,
      show_datetime: showDateTime,
      sprouter_transaction_id: sprouterTransactionId,
      sprouter_order_id: sprouterOrderId,
      session_id: req.headers['x-session-id'] as string,
      ip_address: req.ip,
      user_agent: req.get('User-Agent') || '',
      return_url: returnUrl
    });

    res.json({ success: true, message: 'Sprouter success tracked successfully' });
  } catch (error) {
    console.error('Track Sprouter success error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/user-activity/:userId
router.get('/user-activity/:userId', async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const { limit = '50' } = req.query;
    
    const activity = await getUserActivityTimeline(userId, parseInt(limit as string));
    res.json(activity);
  } catch (error) {
    console.error('Get user activity error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/analytics
router.get('/analytics', async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    const { timeframe = 'all' } = req.query;
    
    // Get enhanced analytics data
    const analytics = await getDetailedAnalytics(timeframe as any);
    
    // Get comprehensive metrics
    const totalLogins = await getQuery<{ count: number }>(
      'SELECT COUNT(*) as count FROM user_logins'
    );

    const studentLogins = await getQuery<{ count: number }>(
      'SELECT COUNT(*) as count FROM user_logins WHERE user_type = "student"'
    );

    const volunteerLogins = await getQuery<{ count: number }>(
      'SELECT COUNT(*) as count FROM user_logins WHERE user_type = "volunteer"'
    );

    const totalShowSelections = await getQuery<{ count: number }>(
      'SELECT COUNT(*) as count FROM show_selections'
    );

    const totalPurchases = await getQuery<{ count: number }>(
      'SELECT COUNT(*) as count FROM purchases WHERE payment_status = "completed"'
    );

    const totalRevenue = await getQuery<{ total: number }>(
      'SELECT SUM(total_cost) as total FROM purchases WHERE payment_status = "completed"'
    );

    // Get detailed show breakdown with enhanced tracking
    const showBreakdown = await allQuery<{
      show_id: string;
      show_date: string;
      show_time: string;
      selections: number;
      purchase_intents: number;
      purchases: number;
      sprouter_successes: number;
      revenue: number;
      conversion_rate: number;
    }>(
      `SELECT 
        ss.show_id,
        ss.show_date,
        ss.show_time,
        COUNT(DISTINCT ss.id) as selections,
        COUNT(DISTINCT pi.id) as purchase_intents,
        COUNT(DISTINCT CASE WHEN p.payment_status = 'completed' THEN p.id END) as purchases,
        COUNT(DISTINCT ssv.id) as sprouter_successes,
        COALESCE(SUM(CASE WHEN p.payment_status = 'completed' THEN p.total_cost ELSE 0 END), 0) as revenue,
        ROUND(
          (COUNT(DISTINCT CASE WHEN p.payment_status = 'completed' THEN p.id END) * 100.0 / 
           NULLIF(COUNT(DISTINCT ss.id), 0)), 2
        ) as conversion_rate
       FROM show_selections ss
       LEFT JOIN purchase_intents pi ON ss.user_id = pi.user_id AND ss.show_id = pi.show_id
       LEFT JOIN purchases p ON ss.user_id = p.user_id AND ss.show_id = p.show_id
       LEFT JOIN sprouter_success_visits ssv ON ss.user_id = ssv.user_id AND ss.show_id = ssv.show_id
       GROUP BY ss.show_id, ss.show_date, ss.show_time
       ORDER BY ss.show_date, ss.show_time`
    );

    // Get comprehensive user activity timeline
    const recentActivity = await allQuery<{
      activity_type: string;
      activity_details: string;
      show_id: string;
      activity_timestamp: string;
      user_id: string;
      user_type: string;
      metadata: string;
    }>(
      `SELECT 
        activity_type,
        activity_details,
        show_id,
        activity_timestamp,
        user_id,
        user_type,
        metadata
       FROM user_activity_timeline 
       ORDER BY activity_timestamp DESC 
       LIMIT 50`
    );

    // Get detailed user analytics
    const topUsers = await allQuery<{
      user_id: string;
      user_type: string;
      identifier: string;
      name: string;
      total_selections: number;
      total_purchase_intents: number;
      total_purchases: number;
      total_sprouter_successes: number;
      total_spent: number;
      last_activity: string;
    }>(
      `SELECT 
        ul.user_id,
        ul.user_type,
        ul.identifier,
        ul.name,
        COUNT(DISTINCT ss.id) as total_selections,
        COUNT(DISTINCT pi.id) as total_purchase_intents,
        COUNT(DISTINCT CASE WHEN p.payment_status = 'completed' THEN p.id END) as total_purchases,
        COUNT(DISTINCT ssv.id) as total_sprouter_successes,
        COALESCE(SUM(CASE WHEN p.payment_status = 'completed' THEN p.total_cost ELSE 0 END), 0) as total_spent,
        MAX(uat.activity_timestamp) as last_activity
       FROM user_logins ul
       LEFT JOIN show_selections ss ON ul.user_id = ss.user_id
       LEFT JOIN purchase_intents pi ON ul.user_id = pi.user_id
       LEFT JOIN purchases p ON ul.user_id = p.user_id
       LEFT JOIN sprouter_success_visits ssv ON ul.user_id = ssv.user_id
       LEFT JOIN user_activity_timeline uat ON ul.user_id = uat.user_id
       GROUP BY ul.user_id, ul.user_type, ul.identifier, ul.name
       ORDER BY total_selections DESC, total_spent DESC
       LIMIT 20`
    );

    // Get daily purchase limits violations
    const limitViolations = await allQuery<{
      user_id: string;
      user_type: string;
      purchase_date: string;
      total_tickets_purchased: number;
      limit_exceeded: boolean;
    }>(
      `SELECT 
        user_id,
        user_type,
        purchase_date,
        total_tickets_purchased,
        limit_exceeded
       FROM daily_purchase_limits 
       WHERE limit_exceeded = TRUE
       ORDER BY purchase_date DESC, total_tickets_purchased DESC`
    );

    const analyticsData = {
      totalLogins: totalLogins?.count || 0,
      studentLogins: studentLogins?.count || 0,
      volunteerLogins: volunteerLogins?.count || 0,
      totalShowSelections: totalShowSelections?.count || 0,
      totalPurchases: totalPurchases?.count || 0,
      totalRevenue: totalRevenue?.total || 0,
      showBreakdown: showBreakdown.reduce((acc, show) => {
        acc[show.show_id] = {
          show_date: show.show_date,
          show_time: show.show_time,
          selections: show.selections,
          purchase_intents: show.purchase_intents,
          purchases: show.purchases,
          sprouter_successes: show.sprouter_successes,
          revenue: show.revenue,
          conversion_rate: show.conversion_rate
        };
        return acc;
      }, {} as any),
      recentActivity: recentActivity.map(activity => ({
        ...activity,
        metadata: activity.metadata ? JSON.parse(activity.metadata) : null
      })),
      topUsers,
      limitViolations,
      timeframe
    };

    res.json(analyticsData);
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
