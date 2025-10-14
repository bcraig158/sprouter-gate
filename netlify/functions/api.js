'use strict';
// --- BEGIN: Netlify Functions path resolution ---
const path = require('path');
const fs = require('fs');

// For Netlify Functions, files are bundled with the function
// Database and volunteer codes are in the same directory as this function
const dbPath = path.join(__dirname, 'sprouter_events.db');
const volunteerCodesPath = path.join(__dirname, 'volunteer-codes.json');
// --- END: Netlify Functions path resolution ---

const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { DateTime } = require('luxon');
const crypto = require('crypto');
const secureStorage = require('./secureStorage');
const sqlite3 = require('sqlite3').verbose();

// Database connection for Netlify Functions
// Database connection established

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
    
    // Processing route: ${route}
    
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
          endpoints: ['/health', '/analytics', '/export-data', '/track_activity', '/track_session', '/track-batch', '/debug-data']
        })
      };
    }
    
    // Debug data endpoint (for testing data collection)
    if (route === '/debug-data' && httpMethod === 'GET') {
      try {
        // Get counts from secureStorage
        const analyticsData = await secureStorage.getAnalytics();
        const userLoginsCount = analyticsData.userLogins?.length || 0;
        const activitiesCount = analyticsData.activities?.length || 0;
        const sessionsCount = analyticsData.sessions?.length || 0;
        const recentLogins = analyticsData.userLogins?.slice(-5) || [];
        const recentActivities = analyticsData.activities?.slice(-5) || [];
        
        return {
          statusCode: 200,
          headers: corsHeaders,
          body: JSON.stringify({
            success: true,
            data: {
              counts: {
                userLogins: userLoginsCount,
                activities: activitiesCount,
                sessions: sessionsCount
              },
              recentLogins,
              recentActivities,
              timestamp: new Date().toISOString()
            }
          })
        };
      } catch (error) {
        return {
          statusCode: 500,
          headers: corsHeaders,
          body: JSON.stringify({ success: false, error: error.message })
        };
      }
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
          isAdmin: isAdmin,
          type: isAdmin ? 'admin' : 'volunteer'
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
    
    // Track batch data (for beacon API)
    if (route === '/track-batch' && httpMethod === 'POST') {
      try {
        // Handle both parsed and unparsed body
        let requestData;
        if (typeof body === 'string') {
          requestData = JSON.parse(body);
        } else {
          requestData = body;
        }
        const { activities, sessions } = requestData;
        
        let activitiesTracked = 0;
        let sessionsTracked = 0;
        
        // Process activities
        if (activities && Array.isArray(activities)) {
          for (const activityData of activities) {
            const { userId, userType, activityType, page, metadata } = activityData;
            
            const enhancedActivityData = {
              user_id: userId,
              user_type: userType,
              activity_type: activityType,
              page: page,
              metadata: metadata || {},
              timestamp: new Date().toISOString(),
              ip_address: headers['x-forwarded-for'] || headers['x-real-ip'] || '',
              user_agent: headers['user-agent'] || ''
            };
            
            // Store activity data in secureStorage
            try {
              await secureStorage.storeActivity(enhancedActivityData);
              activitiesTracked++;
            } catch (err) {
              console.error('❌ Batch activity secureStorage error:', err);
            }
          }
        }
        
        // Process sessions
        if (sessions && Array.isArray(sessions)) {
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
            
            // Store session data in secureStorage
            try {
              await secureStorage.storeSession(enhancedSessionData);
              sessionsTracked++;
            } catch (err) {
              console.error('❌ Batch session secureStorage error:', err);
            }
          }
        }
        
        return {
          statusCode: 200,
          headers: corsHeaders,
          body: JSON.stringify({ 
            success: true, 
            activitiesTracked,
            sessionsTracked
          })
        };
      } catch (error) {
        console.error('Batch tracking error:', error);
        return {
          statusCode: 500,
          headers: corsHeaders,
          body: JSON.stringify({ success: false, error: error.message })
        };
      }
    }
    
    // Track event interaction (Sprouter iframe events)
    if (route === '/track-event' && httpMethod === 'POST') {
      try {
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
      } catch (error) {
        console.error('Event tracking error:', error);
        return {
          statusCode: 500,
          headers: corsHeaders,
          body: JSON.stringify({ success: false, error: error.message })
        };
      }
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
    if ((route === '/track_activity' || route === '/track-activity') && httpMethod === 'POST') {
      try {
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
          
          // Store activity data in secureStorage
          try {
            await secureStorage.storeActivity(enhancedActivityData);
            console.log('✅ Activity stored in secureStorage:', enhancedActivityData.user_id, enhancedActivityData.activity_type);
          } catch (err) {
            console.error('❌ Activity secureStorage error:', err);
          }
        }
        
        return {
          statusCode: 200,
          headers: corsHeaders,
          body: JSON.stringify({ success: true, activitiesTracked: activities.length })
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
    
    if ((route === '/track_session' || route === '/track-session') && httpMethod === 'POST') {
      try {
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
          
          // Store session data in secureStorage
          try {
            await secureStorage.storeSession(enhancedSessionData);
            console.log('✅ Session stored in secureStorage:', enhancedSessionData.user_id, enhancedSessionData.page);
          } catch (err) {
            console.error('❌ Session secureStorage error:', err);
          }
        }
        
        return {
          statusCode: 200,
          headers: corsHeaders,
          body: JSON.stringify({ success: true, sessionsTracked: sessions.length })
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
        
        // Store show selection in secureStorage
        await secureStorage.storeShowSelection({
          user_id,
          user_type,
          show_id,
          show_date: new Date().toISOString().split('T')[0],
          show_time: new Date().toTimeString().split(' ')[0],
          show_datetime: new Date().toISOString(),
          tickets_requested: 1,
          selection_timestamp: new Date().toISOString(),
          session_id: 'TRACKED_SESSION',
          ip_address: '127.0.0.1',
          user_agent: 'Analytics-Tracker'
        });
        
        // Store activity in secureStorage
        await secureStorage.storeActivity({
          user_id,
          user_type,
          activity_type: 'show_selection',
          activity_details: `Selected show: ${show_name}`,
          show_id,
          session_id: 'TRACKED_SESSION',
          ip_address: '127.0.0.1',
          user_agent: 'Analytics-Tracker',
          activity_timestamp: new Date().toISOString()
        });
        
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
        
        // Store purchase intent in secureStorage
        await secureStorage.storePurchaseIntent({
          user_id,
          user_type,
          show_id,
          show_date: new Date().toISOString().split('T')[0],
          show_time: new Date().toTimeString().split(' ')[0],
          show_datetime: new Date().toISOString(),
          tickets_requested: quantity,
          intent_id: `INTENT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          intent_timestamp: new Date().toISOString(),
          session_id: 'TRACKED_SESSION',
          ip_address: '127.0.0.1',
          user_agent: 'Analytics-Tracker',
          status: 'active'
        });
        
        // Store activity in secureStorage
        await secureStorage.storeActivity({
          user_id,
          user_type,
          activity_type: 'purchase_intent',
          activity_details: `Intent to purchase ${quantity} tickets for ${show_id}`,
          show_id,
          session_id: 'TRACKED_SESSION',
          ip_address: '127.0.0.1',
          user_agent: 'Analytics-Tracker',
          activity_timestamp: new Date().toISOString()
        });
        
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
        
        // Store purchase completion in secureStorage
        await secureStorage.storePurchase({
          user_id,
          user_type,
          show_id,
          show_date: new Date().toISOString().split('T')[0],
          show_time: new Date().toTimeString().split(' ')[0],
          show_datetime: new Date().toISOString(),
          tickets_purchased: quantity,
          total_cost: total_cost,
          payment_status: 'completed',
          transaction_id: `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          purchase_timestamp: new Date().toISOString(),
          session_id: 'TRACKED_SESSION',
          ip_address: '127.0.0.1',
          user_agent: 'Analytics-Tracker'
        });
        
        // Store sprouter success in secureStorage
        await secureStorage.storeActivity({
          user_id,
          user_type,
          activity_type: 'sprouter_success',
          activity_details: `Sprouter transaction completed: SPROUTER_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          show_id,
          session_id: 'TRACKED_SESSION',
          ip_address: '127.0.0.1',
          user_agent: 'Analytics-Tracker',
          activity_timestamp: new Date().toISOString()
        });
        
        // Store activity
        await secureStorage.storeActivity({
          user_id,
          user_type,
          activity_type: 'purchase_completed',
          activity_details: `Completed purchase of ${quantity} tickets for ${show_id} - $${total_cost}`,
          show_id,
          session_id: 'TRACKED_SESSION',
          ip_address: '127.0.0.1',
          user_agent: 'Analytics-Tracker',
          activity_timestamp: new Date().toISOString()
        });
        
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
    
    // Get user state - NEW ENDPOINT
    if (route === '/state' && httpMethod === 'GET') {
      try {
        // Get user from token
        const authHeader = headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return {
            statusCode: 401,
            headers: corsHeaders,
            body: JSON.stringify({ success: false, message: 'No authorization token' })
          };
        }
        
        const token = authHeader.substring(7);
        const decoded = jwt.verify(token, JWT_SECRET);
        
        // Get user's current state from secureStorage
        const analyticsData = await secureStorage.getAnalytics();
        const userLogins = analyticsData.userLogins || [];
        const showSelections = analyticsData.showSelections || [];
        const purchases = analyticsData.purchases || [];
        
        // Find user's most recent login
        const user = userLogins
          .filter(login => login.user_id === decoded.householdId)
          .sort((a, b) => new Date(b.login_timestamp) - new Date(a.login_timestamp))[0];
        
        if (!user) {
          return {
            statusCode: 404,
            headers: corsHeaders,
            body: JSON.stringify({ success: false, message: 'User not found' })
          };
        }
        
        // Get user's show selections
        const selections = showSelections
          .filter(selection => selection.user_id === decoded.householdId)
          .sort((a, b) => new Date(b.selection_timestamp) - new Date(a.selection_timestamp));
        
        // Get user's purchases
        const userPurchases = purchases
          .filter(purchase => purchase.user_id === decoded.householdId)
          .sort((a, b) => new Date(b.purchase_timestamp) - new Date(a.purchase_timestamp));
        
        // Debug logging
        console.log('State endpoint debug:', {
          householdId: decoded.householdId,
          selectionsType: typeof selections,
          selectionsIsArray: Array.isArray(selections),
          selectionsLength: selections ? selections.length : 'null/undefined',
          purchasesType: typeof userPurchases,
          purchasesIsArray: Array.isArray(userPurchases),
          purchasesLength: userPurchases ? userPurchases.length : 'null/undefined'
        });
        
        // Determine current phase based on selections and purchases
        let currentPhase = 'initial';
        if (selections && selections.length > 0) {
          currentPhase = 'selected';
        }
        if (userPurchases && userPurchases.length > 0) {
          currentPhase = 'purchased';
        }
        
        // Build state response
        const stateResponse = {
          householdId: decoded.householdId,
          isVolunteer: user.user_type === 'volunteer',
          currentPhase: currentPhase,
          allowance: {
            baseAllowance: 1,
            volunteerBonus: user.user_type === 'volunteer' ? 2 : 0,
            isVolunteer: user.user_type === 'volunteer',
            totalAllowance: user.user_type === 'volunteer' ? 3 : 1
          },
          nightStates: [
            {
              night: 'tue',
              phase: (selections && Array.isArray(selections) && selections.some(s => s.show_id && s.show_id.includes('tue'))) ? 'selected' : 'available',
              selectedEvent: (selections && Array.isArray(selections)) ? (selections.find(s => s.show_id && s.show_id.includes('tue'))?.show_id || null) : null
            },
            {
              night: 'thu', 
              phase: (selections && Array.isArray(selections) && selections.some(s => s.show_id && s.show_id.includes('thu'))) ? 'selected' : 'available',
              selectedEvent: (selections && Array.isArray(selections)) ? (selections.find(s => s.show_id && s.show_id.includes('thu'))?.show_id || null) : null
            }
          ],
          availableEvents: [
            {
              key: 'tue-530',
              name: 'Tuesday 5:30 PM',
              date: '2025-10-28',
              time: '17:30',
              night: 'tue',
              available: !(selections && Array.isArray(selections) && selections.some(s => s.show_id === 'tue-530'))
            },
            {
              key: 'tue-630',
              name: 'Tuesday 6:30 PM', 
              date: '2025-10-28',
              time: '18:30',
              night: 'tue',
              available: !(selections && Array.isArray(selections) && selections.some(s => s.show_id === 'tue-630'))
            },
            {
              key: 'thu-530',
              name: 'Thursday 5:30 PM',
              date: '2025-10-30', 
              time: '17:30',
              night: 'thu',
              available: !(selections && Array.isArray(selections) && selections.some(s => s.show_id === 'thu-530'))
            },
            {
              key: 'thu-630',
              name: 'Thursday 6:30 PM',
              date: '2025-10-30',
              time: '18:30', 
              night: 'thu',
              available: !(selections && Array.isArray(selections) && selections.some(s => s.show_id === 'thu-630'))
            }
          ]
        };
        
        return {
          statusCode: 200,
          headers: corsHeaders,
          body: JSON.stringify({ success: true, data: stateResponse })
        };
      } catch (error) {
        console.error('State fetch error:', error);
        return {
          statusCode: 500,
          headers: corsHeaders,
          body: JSON.stringify({ success: false, error: error.message })
        };
      }
    }
    
    // Select slot - NEW ENDPOINT
    if (route === '/select-slot' && httpMethod === 'POST') {
      try {
        // Handle both parsed and unparsed body
        let requestData;
        if (typeof body === 'string') {
          requestData = JSON.parse(body);
        } else {
          requestData = body;
        }
        const { night, eventKey, ticketsRequested } = requestData;
        
        // Get user from token
        const authHeader = headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return {
            statusCode: 401,
            headers: corsHeaders,
            body: JSON.stringify({ success: false, message: 'No authorization token' })
          };
        }
        
        const token = authHeader.substring(7);
        const decoded = jwt.verify(token, JWT_SECRET);
        
        // Store selection in secureStorage
        const showDate = eventKey.includes('thu') ? '2025-10-30' : '2025-10-28';
        const showTime = eventKey.includes('630') ? '18:30' : '17:30';
        const showDatetime = `${showDate} ${showTime}:00`;
        const showName = eventKey.includes('tue') ? 
          (eventKey.includes('630') ? 'Tuesday 6:30 PM' : 'Tuesday 5:30 PM') :
          (eventKey.includes('630') ? 'Thursday 6:30 PM' : 'Thursday 5:30 PM');
        
        await secureStorage.storeShowSelection({
          user_id: decoded.householdId,
          user_type: decoded.isVolunteer ? 'volunteer' : 'student',
          show_id: eventKey,
          show_name: showName,
          show_date: showDate,
          show_time: showTime,
          show_datetime: showDatetime,
          tickets_requested: ticketsRequested,
          selection_timestamp: new Date().toISOString(),
          session_id: 'session_' + decoded.householdId + '_' + Date.now(),
          ip_address: headers['x-forwarded-for'] || headers['x-real-ip'] || '',
          user_agent: headers['user-agent'] || ''
        });
        
        return {
          statusCode: 200,
          headers: corsHeaders,
          body: JSON.stringify({ success: true, message: 'Slot selected successfully' })
        };
      } catch (error) {
        console.error('Select slot error:', error);
        return {
          statusCode: 500,
          headers: corsHeaders,
          body: JSON.stringify({ success: false, error: error.message })
        };
      }
    }
    
    // Issue intent - NEW ENDPOINT
    if (route === '/issue-intent' && httpMethod === 'POST') {
      try {
        // Handle both parsed and unparsed body
        let requestData;
        if (typeof body === 'string') {
          requestData = JSON.parse(body);
        } else {
          requestData = body;
        }
        const { eventKey, ticketsRequested } = requestData;
        
        // Get user from token
        const authHeader = headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return {
            statusCode: 401,
            headers: corsHeaders,
            body: JSON.stringify({ success: false, message: 'No authorization token' })
          };
        }
        
        const token = authHeader.substring(7);
        const decoded = jwt.verify(token, JWT_SECRET);
        
        // Create purchase intent
        const intentId = `intent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Store intent in secureStorage
        const showDate = eventKey.includes('thu') ? '2025-10-30' : '2025-10-28';
        const showTime = eventKey.includes('630') ? '18:30' : '17:30';
        const showDatetime = `${showDate} ${showTime}:00`;
        const showName = eventKey.includes('tue') ? 
          (eventKey.includes('630') ? 'Tuesday 6:30 PM' : 'Tuesday 5:30 PM') :
          (eventKey.includes('630') ? 'Thursday 6:30 PM' : 'Thursday 5:30 PM');
        
        await secureStorage.storePurchaseIntent({
          user_id: decoded.householdId,
          user_type: decoded.isVolunteer ? 'volunteer' : 'student',
          show_id: eventKey,
          show_name: showName,
          show_date: showDate,
          show_time: showTime,
          show_datetime: showDatetime,
          tickets_requested: ticketsRequested,
          intent_timestamp: new Date().toISOString(),
          session_id: 'session_' + decoded.householdId + '_' + Date.now(),
          ip_address: headers['x-forwarded-for'] || headers['x-real-ip'] || '',
          user_agent: headers['user-agent'] || '',
          intent_id: intentId
        });
        
        // Generate Sprouter URL (mock for now)
        const sprouterUrls = {
          'tue-530': 'https://events.sprouter.online/events/MTAvMjhALTU6MzBwbUAtfEAtc29ALXlvdUAtdGhpbmtALXlvdUAtY2FuQC1kYW5jZSFALTYxNzc3NjNjNzFlNGM5ZDI5MTliYTZ5eWVrMzcwcw==',
          'tue-630': 'https://events.sprouter.online/events/MTAvMjhALTY6MzBwbUAtfEAtc29ALXlvdUAtdGhpbmtALXlvdUAtY2FuQC1kYW5jZSFALWJmMjE4YjRlY2YzYTM2NzczNTYxMjV5eWVrMzcxcw==',
          'thu-530': 'https://events.sprouter.online/events/MTAvMzBALTU6MzBwbUAtfEAtc29ALXlvdUAtdGhpbmtALXlvdUAtY2FuQC1kYW5jZSFALTI0ZTQ1NDkxYTg4MjQ2NWU0MjhjZjl5eWVrMzcycw==',
          'thu-630': 'https://events.sprouter.online/events/MTAvMzBALTY6MzBwbUAtfEAtc29ALXlvdUAtdGhpbmtALXlvdUAtY2FuQC1kYW5jZSFALWJmMjE4YjRlY2YzYTM2NzczNTYxMjV5eWVrMzczcw=='
        };
        
        const response = {
          success: true,
          intentId: intentId,
          sprouterUrl: sprouterUrls[eventKey] || sprouterUrls['tue-530'],
          eventKey: eventKey,
          ticketsRequested: ticketsRequested
        };
        
        return {
          statusCode: 200,
          headers: corsHeaders,
          body: JSON.stringify(response)
        };
      } catch (error) {
        console.error('Issue intent error:', error);
        return {
          statusCode: 500,
          headers: corsHeaders,
          body: JSON.stringify({ success: false, error: error.message })
        };
      }
    }
    
    // Get purchases - NEW ENDPOINT
    if (route === '/purchases' && httpMethod === 'GET') {
      try {
        // Get user from token
        const authHeader = headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return {
            statusCode: 401,
            headers: corsHeaders,
            body: JSON.stringify({ success: false, message: 'No authorization token' })
          };
        }
        
        const token = authHeader.substring(7);
        const decoded = jwt.verify(token, JWT_SECRET);
        
        // Get user's purchases from secureStorage
        const analyticsData = await secureStorage.getAnalytics();
        const allPurchases = analyticsData.purchases || [];
        const purchases = allPurchases
          .filter(purchase => purchase.user_id === decoded.householdId)
          .sort((a, b) => new Date(b.purchase_timestamp) - new Date(a.purchase_timestamp));
        
        // Format purchases for frontend
        const formattedPurchases = purchases.map(purchase => ({
          id: purchase.id,
          eventKey: purchase.show_id,
          eventName: purchase.show_id.includes('tue') ? 
            (purchase.show_id.includes('630') ? 'Tuesday 6:30 PM' : 'Tuesday 5:30 PM') :
            (purchase.show_id.includes('630') ? 'Thursday 6:30 PM' : 'Thursday 5:30 PM'),
          eventDate: purchase.show_date,
          eventTime: purchase.show_time,
          ticketsPurchased: purchase.tickets_purchased,
          totalCost: purchase.total_cost,
          status: purchase.payment_status,
          transactionId: purchase.transaction_id,
          purchaseDate: purchase.purchase_timestamp,
          sprouterUrl: purchase.show_id === 'tue-530' ? 'https://events.sprouter.online/events/MTAvMjhALTU6MzBwbUAtfEAtc29ALXlvdUAtdGhpbmtALXlvdUAtY2FuQC1kYW5jZSFALTYxNzc3NjNjNzFlNGM5ZDI5MTliYTZ5eWVrMzcwcw==' : undefined
        }));
        
        return {
          statusCode: 200,
          headers: corsHeaders,
          body: JSON.stringify({ success: true, data: formattedPurchases })
        };
      } catch (error) {
        console.error('Get purchases error:', error);
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
        availableRoutes: ['/health', '/login', '/volunteer-login', '/track-event', '/track-activity', '/track-activity', '/track-session', '/track_session', '/track_show_selection', '/track_purchase_intent', '/track_purchase_completed', '/state', '/select-slot', '/issue-intent', '/purchases', '/export-data']
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

