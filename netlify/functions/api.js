'use strict';
// --- BEGIN: robust path resolution for bundled assets ---
const path = require('path');
const fs = require('fs');
// Ensure DATABASE_PATH and VOLUNTEER_CODES_PATH are absolute and point to files
const resolveRel = (p, fallback) => {
  if (!p) return path.join(__dirname, fallback);
  return path.isAbsolute(p) ? p : path.join(__dirname, p);
};
// If env provides a value, make it absolute; otherwise default to files next to this function
process.env.DATABASE_PATH = resolveRel(process.env.DATABASE_PATH, 'sprouter_events.db');
process.env.VOLUNTEER_CODES_PATH = resolveRel(process.env.VOLUNTEER_CODES_PATH || 'volunteer-codes.json', 'volunteer-codes.json');
// Optional debug: log once if files are missing (helps triage in Netlify logs)
if (!fs.existsSync(process.env.DATABASE_PATH)) {
  console.warn('[api] DATABASE_PATH not found:', process.env.DATABASE_PATH);
}
if (!fs.existsSync(process.env.VOLUNTEER_CODES_PATH)) {
  console.warn('[api] VOLUNTEER_CODES_PATH not found:', process.env.VOLUNTEER_CODES_PATH);
}
// --- END: robust path resolution for bundled assets ---

const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { DateTime } = require('luxon');
const crypto = require('crypto');
const secureStorage = require('./secureStorage');
const sqlite3 = require('sqlite3').verbose();

// Database connection with improved path resolution
const dbPath = process.env.DATABASE_PATH || path.join(__dirname, 'sprouter_events.db');
console.log(`🗄️ Database path: ${dbPath}`);
console.log(`🗄️ Database exists: ${require('fs').existsSync(dbPath)}`);
console.log(`🗄️ Current directory: ${__dirname}`);
console.log(`🗄️ Files in directory: ${require('fs').readdirSync(__dirname).join(', ')}`);

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Database connection error:', err);
    console.error('❌ Error details:', err.message);
  } else {
    console.log('✅ Database connected successfully');
  }
});

// Environment variables
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

// Force redeploy - function updated


// Legacy hardcoded data removed - now using database authentication

// Legacy hardcoded volunteer data removed - now using JSON file authentication

// Initialize secure storage
let analyticsData = {
  userLogins: [],
  showSelections: [],
  purchases: [],
  sessions: {},
  metadata: {
    lastUpdated: new Date().toISOString(),
    version: '2.0',
    storage: 'netlify-secure-file',
    encryption: 'AES-256-CBC'
  }
};

// Initialize storage on startup
async function initializeStorage() {
  try {
    console.log('🔒 Initializing secure file storage...');
    
    // Load existing data
    const data = await secureStorage.getAnalytics();
    if (data) {
      analyticsData = data;
      console.log(`📊 Loaded ${analyticsData.userLogins.length} logins, ${analyticsData.showSelections.length} selections, ${analyticsData.purchases.length} purchases`);
    } else {
      console.log('📊 Starting with fresh analytics data');
    }
  } catch (error) {
    console.error('❌ Storage initialization failed:', error);
  }
}

// Initialize on startup
initializeStorage();

// Database authentication functions
function findStudent(studentId) {
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT * FROM students WHERE student_id = ?',
      [studentId],
      (err, row) => {
        if (err) {
          console.error('Database error finding student:', err);
          reject(err);
        } else {
          resolve(row);
        }
      }
    );
  });
}

function findVolunteer(code, email) {
  return new Promise((resolve, reject) => {
    // Use JSON file as primary source for volunteer authentication
    try {
      const volunteerCodesPath = path.join(__dirname, 'volunteer-codes.json');
      console.log(`📋 Volunteer codes path: ${volunteerCodesPath}`);
      console.log(`📋 Volunteer codes exists: ${fs.existsSync(volunteerCodesPath)}`);
      
      if (fs.existsSync(volunteerCodesPath)) {
        const volunteerCodes = JSON.parse(fs.readFileSync(volunteerCodesPath, 'utf8'));
        console.log(`📋 Loaded ${volunteerCodes.length} volunteer codes`);
        const volunteer = volunteerCodes.find(v => 
          v.code === code && v.email.toLowerCase() === email.toLowerCase()
        );
        console.log(`📋 Volunteer found: ${!!volunteer}`);
        resolve(volunteer);
      } else {
        console.error('❌ Volunteer codes file not found at:', volunteerCodesPath);
        resolve(null);
      }
    } catch (error) {
      console.error('❌ Error reading volunteer codes file:', error);
      resolve(null);
    }
  });
}

// ✅ PERSISTENT SESSION STORAGE
async function createSession(householdId) {
  const sessionId = bcrypt.hashSync(householdId + Date.now(), 10);
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  
  const sessionData = {
    sessionId,
    householdId,
    expiresAt,
    createdAt: new Date().toISOString()
  };
  
  await secureStorage.storeAuthSession(sessionData);
  return sessionId;
}

// ✅ FRAUD DETECTION FUNCTIONS
async function checkAllDailyLimits() {
  try {
    const analyticsData = await secureStorage.getAnalytics();
    const today = new Date().toISOString().split('T')[0];
    const violations = [];
    
    // Group purchases by user and date
    const dailyPurchases = {};
    analyticsData.purchases.forEach(purchase => {
      const purchaseDate = purchase.purchase_timestamp?.split('T')[0] || purchase.timestamp?.split('T')[0];
      if (purchaseDate === today) {
        const userId = purchase.user_id;
        if (!dailyPurchases[userId]) {
          dailyPurchases[userId] = {
            user_id: userId,
            user_type: purchase.user_type,
            total_tickets: 0,
            total_spent: 0,
            shows: new Set()
          };
        }
        dailyPurchases[userId].total_tickets += purchase.tickets_purchased || 0;
        dailyPurchases[userId].total_spent += purchase.total_cost || 0;
        dailyPurchases[userId].shows.add(purchase.show_id);
      }
    });
    
    // Check limits
    Object.values(dailyPurchases).forEach(purchase => {
      const maxTickets = purchase.user_type === 'volunteer' ? 4 : 2;
      if (purchase.total_tickets > maxTickets) {
        violations.push({
          type: 'daily_ticket_exceeded',
          user_id: purchase.user_id,
          user_type: purchase.user_type,
          current_tickets: purchase.total_tickets,
          max_allowed: maxTickets,
          total_spent: purchase.total_spent,
          shows_attended: Array.from(purchase.shows),
          timestamp: new Date().toISOString()
        });
      }
    });
    
    return violations;
  } catch (error) {
    console.error('Error checking daily limits:', error);
    return [];
  }
}

async function detectAllMultipleLogins() {
  try {
    const analyticsData = await secureStorage.getAnalytics();
    const violations = [];
    
    // Group logins by user in the last 24 hours
    const recentLogins = analyticsData.userLogins.filter(login => {
      const loginTime = new Date(login.login_timestamp);
      const now = new Date();
      return (now - loginTime) < 24 * 60 * 60 * 1000; // 24 hours
    });
    
    const userLoginCounts = {};
    recentLogins.forEach(login => {
      const userId = login.user_id;
      if (!userLoginCounts[userId]) {
        userLoginCounts[userId] = [];
      }
      userLoginCounts[userId].push(login);
    });
    
    // Check for multiple logins (more than 3 in 24 hours)
    Object.entries(userLoginCounts).forEach(([userId, logins]) => {
      if (logins.length > 3) {
        violations.push({
          type: 'multiple_logins',
          user_id: userId,
          user_type: logins[0].user_type,
          login_count: logins.length,
          logins: logins.map(l => ({
            timestamp: l.login_timestamp,
            domain: l.domain,
            ip_hash: l.ip_hash
          })),
          timestamp: new Date().toISOString()
        });
      }
    });
    
    return violations;
  } catch (error) {
    console.error('Error detecting multiple logins:', error);
    return [];
  }
}

async function detectIPSharing() {
  try {
    const analyticsData = await secureStorage.getAnalytics();
    const violations = [];
    
    // Group logins by IP address in the last 24 hours
    const recentLogins = analyticsData.userLogins.filter(login => {
      const loginTime = new Date(login.login_timestamp);
      const now = new Date();
      return (now - loginTime) < 24 * 60 * 60 * 1000; // 24 hours
    });
    
    const ipLoginCounts = {};
    recentLogins.forEach(login => {
      const ip = login.ip_hash || 'unknown';
      if (!ipLoginCounts[ip]) {
        ipLoginCounts[ip] = [];
      }
      ipLoginCounts[ip].push(login);
    });
    
    // Check for IP sharing (more than 2 different users from same IP)
    Object.entries(ipLoginCounts).forEach(([ip, logins]) => {
      const uniqueUsers = new Set(logins.map(l => l.user_id));
      if (uniqueUsers.size > 2) {
        violations.push({
          type: 'ip_sharing',
          ip_address: ip,
          unique_users: uniqueUsers.size,
          users: Array.from(uniqueUsers).map(userId => {
            const userLogins = logins.filter(l => l.user_id === userId);
            return {
              user_id: userId,
              user_type: userLogins[0].user_type,
              login_count: userLogins.length,
              first_login: userLogins[0].login_timestamp,
              last_login: userLogins[userLogins.length - 1].login_timestamp
            };
          }),
          timestamp: new Date().toISOString()
        });
      }
    });
    
    return violations;
  } catch (error) {
    console.error('Error detecting IP sharing:', error);
    return [];
  }
}

async function verifySession(sessionId) {
  try {
    const session = await secureStorage.getAuthSession(sessionId);
    
    if (!session) return null;
    
    if (new Date() > new Date(session.expiresAt)) {
      await secureStorage.deleteAuthSession(sessionId);
      return null;
    }
    
    return session;
  } catch (error) {
    console.error('Session verification error:', error);
    return null;
  }
}

// Cleanup expired sessions periodically
async function cleanupSessions() {
  try {
    const cleaned = await secureStorage.cleanupExpiredSessions();
    if (cleaned > 0) {
      console.log(`Cleaned up ${cleaned} expired sessions`);
    }
  } catch (error) {
    console.error('Session cleanup error:', error);
  }
}

// Main handler
exports.handler = async (event, context) => {
  try {
    const { httpMethod, path, headers, body } = event;
    
    // Extract the route from the Netlify path
    // Path will be like: /api/login (from redirect) or /.netlify/functions/api/login (direct)
    // We need to extract: /login
    let route = path;
    
    // Handle direct function calls
    if (path.startsWith('/.netlify/functions/api')) {
      route = path.replace('/.netlify/functions/api', '');
    } 
    // Handle API redirects
    else if (path.startsWith('/api/')) {
      route = path.replace('/api', '');
    }
    // Handle root API calls
    else if (path === '/api') {
      route = '/';
    }
    
    // Ensure route starts with /
    if (route && !route.startsWith('/')) {
      route = '/' + route;
    }
    
    // Default to root if no route
    route = route || '/';
    
    console.log(`🔍 Processing route: ${route} (from path: ${path})`);
    
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Content-Type': 'application/json'
    };
    
    // Periodic session cleanup (10% of requests)
    if (Math.random() < 0.1) {
      secureStorage.cleanupExpiredSessions().catch(err => 
        console.error('Session cleanup error:', err)
      );
    }
    
    // Handle preflight requests
    if (httpMethod === 'OPTIONS') {
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: ''
      };
    }
    
    // Health check
    if (route === '/health' || route === '/') {
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ 
          status: 'OK', 
          timestamp: new Date().toISOString(),
          message: 'API is running',
          version: '2.0',
          authentication: 'Database + JSON file',
          endpoints: ['/health', '/analytics', '/export-data', '/track_activity', '/track_session']
        })
      };
    }
    
    // Student login route - re-enabled for production
    if (route === '/login' && httpMethod === 'POST') {
      try {
        console.log('🎓 Student login attempt');
        // Handle both parsed and unparsed body
        let requestData;
        if (typeof body === 'string') {
          requestData = JSON.parse(body);
        } else {
          requestData = body;
        }
        const { studentId } = requestData;
        console.log(`🎓 Student ID: ${studentId}`);
      
        if (!studentId) {
          console.log('❌ No student ID provided');
          return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({ 
              success: false, 
              message: 'Student ID is required' 
            })
          };
        }
        
        console.log('🔍 Looking up student in database...');
        const student = await findStudent(studentId);
        console.log(`🔍 Student found: ${!!student}`);
        
        if (!student) {
          console.log('❌ Student not found in database');
          return {
            statusCode: 404,
            headers: corsHeaders,
            body: JSON.stringify({ 
              success: false, 
              message: 'Student ID not found. Please check your Student ID and try again.' 
            })
          };
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
      const sessionId = await createSession(student.household_id);
      
      // Track login in secure storage
      const loginData = {
        user_id: student.household_id,
        user_type: 'student',
        identifier: studentId,
        email: '',
        name: '',
        ip_address: headers['x-forwarded-for'] || headers['x-real-ip'] || '',
        user_agent: headers['user-agent'] || '',
        login_timestamp: new Date().toISOString(),
        session_id: sessionId,
        domain: headers.host || 'unknown'
      };
      
      // Store in secure file storage
      await secureStorage.storeLogin(loginData);
      
      // ✅ CLEANUP OLD SESSIONS (RUN IN BACKGROUND)
      cleanupSessions().catch(err => console.error('Cleanup failed:', err));
      
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          success: true,
          token,
          user: {
            student_id: student.student_id,
            household_id: student.household_id,
            type: 'student'
          },
          sessionId: sessionId,
          householdId: student.household_id,
          isVolunteer: false
        })
      };
      } catch (error) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ 
            success: false, 
            message: 'Invalid JSON in request body' 
          })
        };
      }
    }
    
    // Volunteer login route - re-enabled for production
    if (route === '/volunteer-login' && httpMethod === 'POST') {
      try {
        console.log('👥 Volunteer login attempt');
        // Handle both parsed and unparsed body
        let requestData;
        if (typeof body === 'string') {
          requestData = JSON.parse(body);
        } else {
          requestData = body;
        }
        const { volunteerCode, email } = requestData;
        console.log(`👥 Code: ${volunteerCode}, Email: ${email}`);
      
        if (!volunteerCode || !email) {
          console.log('❌ Missing volunteer credentials');
          return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({ 
              success: false, 
              message: 'Volunteer code and email are required' 
            })
          };
        }
        
        console.log('🔍 Looking up volunteer in JSON file...');
        const volunteer = await findVolunteer(volunteerCode, email);
        console.log(`🔍 Volunteer found: ${!!volunteer}`);
        
        if (!volunteer) {
          console.log('❌ Volunteer not found');
          return {
            statusCode: 404,
            headers: corsHeaders,
            body: JSON.stringify({ 
              success: false, 
              message: 'Invalid volunteer code or email. Please check your credentials and try again.' 
            })
          };
        }
      
      // Check if admin using hardcoded admin credentials from volunteer-codes.json
      const isAdmin = volunteerCode === '339933' && volunteer.email.toLowerCase() === 'admin@maidu.com';
      const volunteerHouseholdId = isAdmin ? 'ADMIN' : `VOL_${volunteerCode}`;
      
      // Generate JWT token
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
      
      // Create session
      const sessionId = await createSession(volunteerHouseholdId);
      
      // Track login in secure storage
      const loginData = {
        user_id: volunteerHouseholdId,
        user_type: 'volunteer',
        identifier: volunteerCode,
        email: volunteer.email,
        name: volunteer.name,
        ip_address: headers['x-forwarded-for'] || headers['x-real-ip'] || '',
        user_agent: headers['user-agent'] || '',
        login_timestamp: new Date().toISOString(),
        session_id: sessionId,
        domain: headers.host || 'unknown'
      };
      
      // Store in secure file storage
      await secureStorage.storeLogin(loginData);
      
      // ✅ CLEANUP OLD SESSIONS (RUN IN BACKGROUND)
      cleanupSessions().catch(err => console.error('Cleanup failed:', err));
      
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          success: true,
          token,
          user: {
            code: volunteerCode,
            email: volunteer.email,
            name: volunteer.name,
            type: 'volunteer',
            role: isAdmin ? 'admin' : 'volunteer'
          },
          sessionId: sessionId,
          householdId: volunteerHouseholdId,
          isVolunteer: true,
          isAdmin: isAdmin
        })
      };
      } catch (error) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ 
            success: false, 
            message: 'Invalid JSON in request body' 
          })
        };
      }
    }
    
    // Track event interaction
    if (route === '/track-event' && httpMethod === 'POST') {
      // Handle both parsed and unparsed body
      let requestData;
      if (typeof body === 'string') {
        requestData = JSON.parse(body);
      } else {
        requestData = body;
      }
      const { eventKey, eventType, userId, userType, metadata } = requestData;
      
      const eventData = {
        event_key: eventKey,
        event_type: eventType, // 'sprouter_embed_loaded', 'sprouter_checkout_started', 'sprouter_checkout_completed', 'sprouter_checkout_abandoned'
        user_id: userId,
        user_type: userType,
        metadata: metadata || {},
        timestamp: new Date().toISOString(),
        ip_address: headers['x-forwarded-for'] || headers['x-real-ip'] || '',
        user_agent: headers['user-agent'] || ''
      };
      
        // Store in secure file storage
        await secureStorage.storeEvent(eventData);
      
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ success: true, tracked: eventData })
      };
    }
    
    // Track page view and session activity
    if (route === '/track-session' && httpMethod === 'POST') {
      console.log('📊 Session tracking request received:', body);
      // Handle both parsed and unparsed body
      let requestData;
      if (typeof body === 'string') {
        requestData = JSON.parse(body);
      } else {
        requestData = body;
      }
      const sessionDataArray = requestData;
      
      // Handle both single session and array of sessions
      const sessions = Array.isArray(sessionDataArray) ? sessionDataArray : [sessionDataArray];
      
      for (const sessionData of sessions) {
        const { userId, userType, page, sessionId, timeOnPage, referrer } = sessionData;
        
        const enhancedSessionData = {
          user_id: userId,
          user_type: userType,
          session_id: sessionId,
          page: page,
          time_on_page: timeOnPage,
          referrer: referrer,
          timestamp: new Date().toISOString(),
          ip_address: headers['x-forwarded-for'] || headers['x-real-ip'] || '',
          user_agent: headers['user-agent'] || '',
          domain: headers.host || 'unknown'
        };
        
        // Store session data
        await secureStorage.storeSession(enhancedSessionData);
        console.log('✅ Session stored:', enhancedSessionData.user_id, enhancedSessionData.page);
      }
      
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ success: true, sessionsTracked: sessions.length })
      };
    }
    
    // Track user activity (clicks, scrolls, etc.)
    if (route === '/track-activity' && httpMethod === 'POST') {
      console.log('📊 Activity tracking request received:', body);
      // Handle both parsed and unparsed body
      let requestData;
      if (typeof body === 'string') {
        requestData = JSON.parse(body);
      } else {
        requestData = body;
      }
      const activityDataArray = requestData;
      
      // Handle both single activity and array of activities
      const activities = Array.isArray(activityDataArray) ? activityDataArray : [activityDataArray];
      
      for (const activityData of activities) {
        const { userId, userType, activityType, page, metadata } = activityData;
        
        const enhancedActivityData = {
          user_id: userId,
          user_type: userType,
          activity_type: activityType, // 'page_view', 'click', 'scroll', 'form_interaction', 'time_on_page'
          page: page,
          metadata: metadata || {},
          timestamp: new Date().toISOString(),
          ip_address: headers['x-forwarded-for'] || headers['x-real-ip'] || '',
          user_agent: headers['user-agent'] || ''
        };
        
        // Store activity data
        await secureStorage.storeActivity(enhancedActivityData);
        console.log('✅ Activity stored:', enhancedActivityData.user_id, enhancedActivityData.activity_type);
      }
      
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ success: true, activitiesTracked: activities.length })
      };
    }
    
    // Analytics endpoint removed - handled by separate analytics.js function
    
    // Data export endpoint (admin only)
    if (route === '/export-data' && httpMethod === 'GET') {
      // Check for admin authorization
      const authHeader = headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return {
          statusCode: 401,
          headers: corsHeaders,
          body: JSON.stringify({ error: 'Unauthorized - Admin token required' })
        };
      }
      
      try {
        const token = authHeader.substring(7);
        const decoded = jwt.verify(token, JWT_SECRET);
        
        if (!decoded.isAdmin) {
          return {
            statusCode: 403,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Forbidden - Admin access required' })
          };
        }
        
        // Return sanitized analytics data from secure storage
        const exportData = await secureStorage.exportData();
        
        return {
          statusCode: 200,
          headers: {
            ...corsHeaders,
            'Content-Disposition': 'attachment; filename="analytics-export.json"'
          },
          body: JSON.stringify(exportData, null, 2)
        };
      } catch (error) {
        return {
          statusCode: 401,
          headers: corsHeaders,
          body: JSON.stringify({ error: 'Invalid token' })
        };
      }
    }
    
    // Default response
    // New tracking endpoints for enhanced analytics
    if (route === '/track_activity' && httpMethod === 'POST') {
      try {
        // Handle both parsed and unparsed body
        let requestData;
        if (typeof body === 'string') {
          requestData = JSON.parse(body);
        } else {
          requestData = body;
        }
        const { activities } = requestData;
        console.log('📊 Enhanced activity tracking:', activities);
        
        // Store activities in session data
        const sessionsPath = path.join(__dirname, '../../data/sessions.json');
        let sessions = { activities: [] };
        
        try {
          if (fs.existsSync(sessionsPath)) {
            sessions = JSON.parse(fs.readFileSync(sessionsPath, 'utf8'));
          }
        } catch (err) {
          console.error('Error loading sessions:', err);
        }
        
        if (!sessions.activities) sessions.activities = [];
        sessions.activities.push(...activities);
        
        // Keep only last 1000 activities to prevent file from growing too large
        if (sessions.activities.length > 1000) {
          sessions.activities = sessions.activities.slice(-1000);
        }
        
        try {
          fs.mkdirSync(path.dirname(sessionsPath), { recursive: true });
          fs.writeFileSync(sessionsPath, JSON.stringify(sessions, null, 2));
        } catch (err) {
          console.error('Error saving sessions:', err);
        }
        
        return {
          statusCode: 200,
          headers: corsHeaders,
          body: JSON.stringify({ success: true, message: 'Activities tracked' })
        };
      } catch (error) {
        console.error('Activity tracking error:', error);
        return {
          statusCode: 500,
          headers: corsHeaders,
          body: JSON.stringify({ success: false, error: error.message })
        };
      }
    }
    
    if (route === '/track_session' && httpMethod === 'POST') {
      try {
        // Handle both parsed and unparsed body
        let requestData;
        if (typeof body === 'string') {
          requestData = JSON.parse(body);
        } else {
          requestData = body;
        }
        const { sessions: sessionData } = requestData;
        console.log('📊 Enhanced session tracking:', sessionData);
        
        // Store session data
        const sessionsPath = path.join(__dirname, '../../data/sessions.json');
        let sessions = { sessions: [] };
        
        try {
          if (fs.existsSync(sessionsPath)) {
            sessions = JSON.parse(fs.readFileSync(sessionsPath, 'utf8'));
          }
        } catch (err) {
          console.error('Error loading sessions:', err);
        }
        
        if (!sessions.sessions) sessions.sessions = [];
        sessions.sessions.push(...sessionData);
        
        // Keep only last 500 sessions
        if (sessions.sessions.length > 500) {
          sessions.sessions = sessions.sessions.slice(-500);
        }
        
        try {
          fs.mkdirSync(path.dirname(sessionsPath), { recursive: true });
          fs.writeFileSync(sessionsPath, JSON.stringify(sessions, null, 2));
        } catch (err) {
          console.error('Error saving sessions:', err);
        }
        
        return {
          statusCode: 200,
          headers: corsHeaders,
          body: JSON.stringify({ success: true, message: 'Sessions tracked' })
        };
      } catch (error) {
        console.error('Session tracking error:', error);
        return {
          statusCode: 500,
          headers: corsHeaders,
          body: JSON.stringify({ success: false, error: error.message })
        };
      }
    }
    
    // Show selection tracking
    if (route === '/track_show_selection' && httpMethod === 'POST') {
      try {
        // Handle both parsed and unparsed body
        let requestData;
        if (typeof body === 'string') {
          requestData = JSON.parse(body);
        } else {
          requestData = body;
        }
        const { show_id, show_name, user_id, user_type } = requestData;
        console.log('🎭 Tracking show selection:', { show_id, show_name, user_id, user_type });
        
        // Insert into show_selections table
        db.run(`
          INSERT INTO show_selections (user_id, user_type, show_id, show_date, show_time, show_datetime, tickets_requested, selection_timestamp, session_id, ip_address, user_agent)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          user_id, 
          user_type, 
          show_id, 
          new Date().toISOString().split('T')[0], // show_date
          new Date().toTimeString().split(' ')[0], // show_time
          new Date().toISOString(), // show_datetime
          1, // tickets_requested (default)
          new Date().toISOString(), // selection_timestamp
          'TRACKED_SESSION', // session_id
          '127.0.0.1', // ip_address
          'Analytics-Tracker' // user_agent
        ]);
        
        // Insert into user_activity_timeline
        db.run(`
          INSERT INTO user_activity_timeline (user_id, user_type, activity_type, activity_details, show_id, session_id, ip_address, user_agent, activity_timestamp)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          user_id, 
          user_type, 
          'show_selection', 
          `Selected show: ${show_name}`, 
          show_id,
          'TRACKED_SESSION',
          '127.0.0.1',
          'Analytics-Tracker',
          new Date().toISOString()
        ]);
        
        return {
          statusCode: 200,
          headers: corsHeaders,
          body: JSON.stringify({ success: true, message: 'Show selection tracked' })
        };
      } catch (error) {
        console.error('Show selection tracking error:', error);
        return {
          statusCode: 500,
          headers: corsHeaders,
          body: JSON.stringify({ success: false, error: error.message })
        };
      }
    }
    
    // Purchase intent tracking
    if (route === '/track_purchase_intent' && httpMethod === 'POST') {
      try {
        // Handle both parsed and unparsed body
        let requestData;
        if (typeof body === 'string') {
          requestData = JSON.parse(body);
        } else {
          requestData = body;
        }
        const { show_id, quantity, user_id, user_type } = requestData;
        console.log('💰 Tracking purchase intent:', { show_id, quantity, user_id, user_type });
        
        // Insert into purchase_intents table
        db.run(`
          INSERT INTO purchase_intents (user_id, user_type, show_id, show_date, show_time, show_datetime, tickets_requested, intent_id, intent_timestamp, session_id, ip_address, user_agent, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          user_id, 
          user_type, 
          show_id, 
          new Date().toISOString().split('T')[0], // show_date
          new Date().toTimeString().split(' ')[0], // show_time
          new Date().toISOString(), // show_datetime
          quantity, // tickets_requested
          `INTENT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, // intent_id
          new Date().toISOString(), // intent_timestamp
          'TRACKED_SESSION', // session_id
          '127.0.0.1', // ip_address
          'Analytics-Tracker', // user_agent
          'active' // status
        ]);
        
        // Insert into user_activity_timeline
        db.run(`
          INSERT INTO user_activity_timeline (user_id, user_type, activity_type, activity_details, show_id, session_id, ip_address, user_agent, activity_timestamp)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          user_id, 
          user_type, 
          'purchase_intent', 
          `Intent to purchase ${quantity} tickets for ${show_id}`, 
          show_id,
          'TRACKED_SESSION',
          '127.0.0.1',
          'Analytics-Tracker',
          new Date().toISOString()
        ]);
        
        return {
          statusCode: 200,
          headers: corsHeaders,
          body: JSON.stringify({ success: true, message: 'Purchase intent tracked' })
        };
      } catch (error) {
        console.error('Purchase intent tracking error:', error);
        return {
          statusCode: 500,
          headers: corsHeaders,
          body: JSON.stringify({ success: false, error: error.message })
        };
      }
    }
    
    // Purchase completion tracking
    if (route === '/track_purchase_completed' && httpMethod === 'POST') {
      try {
        // Handle both parsed and unparsed body
        let requestData;
        if (typeof body === 'string') {
          requestData = JSON.parse(body);
        } else {
          requestData = body;
        }
        const { show_id, quantity, total_cost, user_id, user_type } = requestData;
        console.log('✅ Tracking purchase completion:', { show_id, quantity, total_cost, user_id, user_type });
        
        // Insert into purchases table
        db.run(`
          INSERT INTO purchases (user_id, user_type, show_id, show_date, show_time, show_datetime, tickets_purchased, total_cost, payment_status, transaction_id, purchase_timestamp, session_id, ip_address, user_agent)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          user_id, 
          user_type, 
          show_id, 
          new Date().toISOString().split('T')[0], // show_date
          new Date().toTimeString().split(' ')[0], // show_time
          new Date().toISOString(), // show_datetime
          quantity, // tickets_purchased
          total_cost, // total_cost
          'completed', // payment_status
          `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, // transaction_id
          new Date().toISOString(), // purchase_timestamp
          'TRACKED_SESSION', // session_id
          '127.0.0.1', // ip_address
          'Analytics-Tracker' // user_agent
        ]);
        
        // Insert into sprouter_success_visits table
        db.run(`
          INSERT INTO sprouter_success_visits (user_id, user_type, show_id, show_date, show_time, show_datetime, sprouter_transaction_id, success_timestamp, session_id, ip_address, user_agent, verification_status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          user_id, 
          user_type, 
          show_id, 
          new Date().toISOString().split('T')[0], // show_date
          new Date().toTimeString().split(' ')[0], // show_time
          new Date().toISOString(), // show_datetime
          `SPROUTER_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, // sprouter_transaction_id
          new Date().toISOString(), // success_timestamp
          'TRACKED_SESSION', // session_id
          '127.0.0.1', // ip_address
          'Analytics-Tracker', // user_agent
          'verified' // verification_status
        ]);
        
        // Insert into user_activity_timeline
        db.run(`
          INSERT INTO user_activity_timeline (user_id, user_type, activity_type, activity_details, show_id, session_id, ip_address, user_agent, activity_timestamp)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          user_id, 
          user_type, 
          'purchase_completed', 
          `Completed purchase of ${quantity} tickets for ${show_id} - $${total_cost}`, 
          show_id,
          'TRACKED_SESSION',
          '127.0.0.1',
          'Analytics-Tracker',
          new Date().toISOString()
        ]);
        
        return {
          statusCode: 200,
          headers: corsHeaders,
          body: JSON.stringify({ success: true, message: 'Purchase completion tracked' })
        };
      } catch (error) {
        console.error('Purchase completion tracking error:', error);
        return {
          statusCode: 500,
          headers: corsHeaders,
          body: JSON.stringify({ success: false, error: error.message })
        };
      }
    }
    
    return {
      statusCode: 404,
      headers: corsHeaders,
      body: JSON.stringify({ 
        error: 'Route not found',
        requestedRoute: route,
        availableRoutes: ['/health', '/analytics', '/export-data', '/track-event', '/track_activity', '/track_session', '/track_show_selection', '/track_purchase_intent', '/track_purchase_completed']
      })
    };
    
  } catch (error) {
    console.error('Function error:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error.message 
      })
    };
  }
};

