const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { DateTime } = require('luxon');
const crypto = require('crypto');
const secureStorage = require('./secureStorage');
const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

// Database connection
const dbPath = process.env.DATABASE_PATH || path.join(__dirname, 'sprouter_events.db');
const db = new sqlite3.Database(dbPath);

// Environment variables
const JWT_SECRET = process.env.JWT_SECRET || '86d2bbcb5cd6a7b84f1e84473a95c976fd1febc5955da91779765d8df109304812e3c2b6410eb4c92cfa524f17e0263649f3b164297c0c94dcc0798682f1c8fe';

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

// Legacy helper functions - no longer used (authentication moved to auth.js)
// These functions are kept for backward compatibility but are not called
function findStudent(studentId) {
  // Legacy function - authentication now handled by auth.js
  return null;
}

function findVolunteer(code, email) {
  // Legacy function - authentication now handled by auth.js
  return null;
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
    if (path.startsWith('/.netlify/functions/api')) {
      route = path.replace('/.netlify/functions/api', '');
    } else if (path.startsWith('/api/')) {
      route = path.replace('/api', '');
    }
    route = route || '/';
    
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
    
    // Legacy authentication routes removed - authentication now handled by auth.js
    if (false && route === '/login' && httpMethod === 'POST') {
      try {
        const { studentId } = JSON.parse(body);
      
      if (!studentId) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ 
            success: false, 
            message: 'Student ID is required' 
          })
        };
      }
      
      const student = findStudent(studentId);
      if (!student) {
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
    
    // Legacy volunteer login route removed - authentication now handled by auth.js
    if (false && route === '/volunteer-login' && httpMethod === 'POST') {
      try {
        const { volunteerCode, email } = JSON.parse(body);
      
      if (!volunteerCode || !email) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ 
            success: false, 
            message: 'Volunteer code and email are required' 
          })
        };
      }
      
      const volunteer = findVolunteer(volunteerCode, email);
      if (!volunteer) {
        return {
          statusCode: 404,
          headers: corsHeaders,
          body: JSON.stringify({ 
            success: false, 
            message: 'Invalid volunteer code or email. Please check your credentials and try again.' 
          })
        };
      }
      
      // Check if admin
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
      const { eventKey, eventType, userId, userType, metadata } = JSON.parse(body);
      
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
      const sessionDataArray = JSON.parse(body);
      
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
      const activityDataArray = JSON.parse(body);
      
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
        const { activities } = JSON.parse(body);
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
        const { sessions: sessionData } = JSON.parse(body);
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
        const { show_id, show_name, user_id, user_type } = JSON.parse(body);
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
        const { show_id, quantity, user_id, user_type } = JSON.parse(body);
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
        const { show_id, quantity, total_cost, user_id, user_type } = JSON.parse(body);
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
        availableRoutes: ['/health', '/analytics', '/export-data', '/track_activity', '/track_session', '/track_show_selection', '/track_purchase_intent', '/track_purchase_completed']
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

