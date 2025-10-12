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
      res.status(404).json({ 
        success: false, 
        message: 'Student ID not found' 
      });
      return;
    }

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
      `INSERT INTO user_logins (user_id, user_type, identifier, email, name, ip_address, user_agent, login_timestamp) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        student.household_id,
        'student',
        studentId,
        '', // Student email not available in current schema
        '', // Student name not available in current schema
        req.ip,
        req.get('User-Agent') || '',
        new Date().toISOString()
      ]
    );

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
      res.status(404).json({ 
        success: false, 
        message: 'Invalid volunteer code or email' 
      });
      return;
    }

    // Generate JWT token for volunteer
    const volunteerHouseholdId = `VOL_${volunteerCode}`;
    const token = jwt.sign(
      { 
        householdId: volunteerHouseholdId,
        volunteerCode: volunteerCode,
        isVolunteer: true
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
      `INSERT INTO user_logins (user_id, user_type, identifier, email, name, ip_address, user_agent, login_timestamp) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        volunteerHouseholdId,
        'volunteer',
        volunteerCode,
        volunteer.email,
        volunteer.name,
        req.ip,
        req.get('User-Agent') || '',
        new Date().toISOString()
      ]
    );

    // Log the volunteer login
    await runQuery(
      'INSERT INTO audit_log (household_id, action, details, ip_address) VALUES (?, ?, ?, ?)',
      [volunteerHouseholdId, 'volunteer_login', `Volunteer: ${volunteer.name} (${volunteer.email})`, req.ip]
    );

    const response: LoginResponse = {
      success: true,
      token,
      householdId: volunteerHouseholdId,
      isVolunteer: true
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

    // Track show selection
    const nightInfo = getNightForEvent(eventKey);
    if (nightInfo) {
      await runQuery(
        `INSERT INTO show_selections (user_id, user_type, show_id, show_date, show_time, tickets_requested) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          householdId,
          household.volunteer_redeemed ? 'volunteer' : 'student',
          eventKey,
          nightInfo.date,
          nightInfo.time,
          ticketsRequested
        ]
      );
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

    // Generate purchase intent (in a real implementation, this would integrate with Sprouter)
    const intentId = `intent_${householdId}_${eventKey}_${Date.now()}`;
    
    // Log the intent creation
    await runQuery(
      'INSERT INTO audit_log (household_id, action, details, ip_address) VALUES (?, ?, ?, ?)',
      [householdId, 'issue_intent', `Event: ${eventKey}, Tickets: ${ticketsRequested}, Intent: ${intentId}`, req.ip]
    );

    // Return Sprouter embed URL (placeholder - replace with actual Sprouter URLs)
    const sprouterUrl = `https://sprouter.com/embed/${eventKey}?intent=${intentId}&tickets=${ticketsRequested}`;

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

// GET /api/analytics
router.get('/analytics', async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    // Get analytics data
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

    // Get show breakdown
    const showBreakdown = await allQuery<{
      show_id: string;
      selections: number;
      purchases: number;
      revenue: number;
    }>(
      `SELECT 
        show_id,
        COUNT(*) as selections,
        COUNT(CASE WHEN p.payment_status = 'completed' THEN 1 END) as purchases,
        COALESCE(SUM(CASE WHEN p.payment_status = 'completed' THEN p.total_cost ELSE 0 END), 0) as revenue
       FROM show_selections ss
       LEFT JOIN purchases p ON ss.user_id = p.user_id AND ss.show_id = p.show_id
       GROUP BY show_id`
    );

    // Get recent activity
    const recentActivity = await allQuery<{
      id: string;
      user_id: string;
      user_type: string;
      action: string;
      timestamp: string;
      details: string;
    }>(
      `SELECT 
        ul.id,
        ul.user_id,
        ul.user_type,
        'login' as action,
        ul.login_timestamp as timestamp,
        CONCAT(ul.user_type, ' login: ', ul.identifier) as details
       FROM user_logins ul
       UNION ALL
       SELECT 
        ss.id,
        ss.user_id,
        ss.user_type,
        'selection' as action,
        ss.selection_timestamp as timestamp,
        CONCAT('Selected show: ', ss.show_id) as details
       FROM show_selections ss
       ORDER BY timestamp DESC
       LIMIT 20`
    );

    // Get top users
    const topUsers = await allQuery<{
      user_id: string;
      user_type: string;
      identifier: string;
      name: string;
      total_selections: number;
      total_purchases: number;
      total_spent: number;
    }>(
      `SELECT 
        ul.user_id,
        ul.user_type,
        ul.identifier,
        ul.name,
        COUNT(DISTINCT ss.id) as total_selections,
        COUNT(DISTINCT p.id) as total_purchases,
        COALESCE(SUM(p.total_cost), 0) as total_spent
       FROM user_logins ul
       LEFT JOIN show_selections ss ON ul.user_id = ss.user_id
       LEFT JOIN purchases p ON ul.user_id = p.user_id AND p.payment_status = 'completed'
       GROUP BY ul.user_id, ul.user_type, ul.identifier, ul.name
       ORDER BY total_selections DESC, total_spent DESC
       LIMIT 10`
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
          selections: show.selections,
          purchases: show.purchases,
          revenue: show.revenue
        };
        return acc;
      }, {} as any),
      recentActivity,
      topUsers
    };

    res.json(analyticsData);
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
