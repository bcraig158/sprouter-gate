const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { DateTime } = require('luxon');
const crypto = require('crypto');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Environment variables
const JWT_SECRET = process.env.JWT_SECRET || '86d2bbcb5cd6a7b84f1e84473a95c976fd1febc5955da91779765d8df109304812e3c2b6410eb4c92cfa524f17e0263649f3b164297c0c94dcc0798682f1c8fe';

// Database connection
const dbPath = process.env.DATABASE_PATH || path.join(__dirname, 'sprouter_events.db');
const db = new sqlite3.Database(dbPath);

// Database verification
db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
  if (err) {
    console.error('Database verification error:', err);
  } else {
    console.log('Database connected successfully. Available tables:', tables.map(t => t.name));
    
    // Verify critical tables exist
    const requiredTables = ['students', 'households', 'volunteer_codes'];
    const existingTables = tables.map(t => t.name);
    const missingTables = requiredTables.filter(table => !existingTables.includes(table));
    
    if (missingTables.length > 0) {
      console.error('Missing required tables:', missingTables);
    } else {
      console.log('All required tables present');
    }
  }
});

// Session storage (simple JSON file for 30-day event)
const sessionsPath = process.env.SESSION_STORAGE_PATH || path.join(__dirname, '../../../data/sessions.json');

// Helper to load sessions
function loadSessions() {
  try {
    if (fs.existsSync(sessionsPath)) {
      return JSON.parse(fs.readFileSync(sessionsPath, 'utf8'));
    }
  } catch (err) {
    console.error('Error loading sessions:', err);
  }
  return { students: [], volunteers: [], admin: [] };
}

// Helper to save sessions
function saveSessions(sessions) {
  try {
    fs.mkdirSync(path.dirname(sessionsPath), { recursive: true });
    fs.writeFileSync(sessionsPath, JSON.stringify(sessions, null, 2));
  } catch (err) {
    console.error('Error saving sessions:', err);
  }
}

// Student authentication using existing database
async function authenticateStudent(studentId) {
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT * FROM students WHERE student_id = ?',
      [studentId],
      (err, row) => {
        if (err) reject(err);
        else resolve(row);
      }
    );
  });
}

// Volunteer authentication using JSON file (matching current system)
async function authenticateVolunteer(code, email) {
  try {
    const volunteerCodesPath = path.join(__dirname, 'volunteer-codes.json');
    
    if (!fs.existsSync(volunteerCodesPath)) {
      console.error('Volunteer codes file not found');
      return null;
    }
    
    const volunteerCodes = JSON.parse(fs.readFileSync(volunteerCodesPath, 'utf8'));
    const volunteer = volunteerCodes.find(v => 
      v.code === code && v.email.toLowerCase() === email.toLowerCase()
    );
    
    if (volunteer) {
      return {
        code: volunteer.code,
        email: volunteer.email,
        name: volunteer.name,
        used_at: new Date().toISOString()
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error authenticating volunteer:', error);
    return null;
  }
}

// Admin authentication using environment variable
async function authenticateAdmin(code) {
  try {
    const adminCode = process.env.ADMIN_CODE || 'ADMIN2024';
    
    if (code === adminCode) {
      return {
        code: adminCode,
        email: 'admin@maidu.com',
        name: 'System Administrator',
        role: 'admin',
        created_at: new Date().toISOString()
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error authenticating admin:', error);
    return null;
  }
}

// Track session with domain awareness
function trackSession(type, userId, data) {
  const sessions = loadSessions();
  const session = {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type,
    userId,
    timestamp: new Date().toISOString(),
    domain: data.domain || 'unknown',
    userAgent: data.userAgent || 'unknown',
    ip: data.ip || 'unknown',
    ...data
  };
  
  sessions[type].push(session);
  saveSessions(sessions);
  return session;
}

// Generate JWT token
function generateToken(user, sessionId) {
  return jwt.sign(
    { 
      userId: user.student_id || user.code, 
      type: user.type || 'student',
      sessionId,
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
    },
    JWT_SECRET
  );
}

exports.handler = async (event) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const { action, ...data } = JSON.parse(event.body);

    switch (action) {
      case 'login_student': {
        const student = await authenticateStudent(data.studentId);
        if (student) {
          const session = trackSession('students', student.student_id, {
            name: student.student_id,
            household_id: student.household_id,
            domain: data.domain,
            userAgent: event.headers['user-agent'],
            ip: event.headers['x-forwarded-for'] || event.headers['client-ip']
          });
          
          const token = generateToken({ student_id: student.student_id, type: 'student' }, session.id);
          
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              success: true,
              user: {
                student_id: student.student_id,
                household_id: student.household_id,
                type: 'student'
              },
              sessionId: session.id,
              token
            })
          };
        }
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ success: false, message: 'Student not found' })
        };
      }

      case 'login_volunteer': {
        const volunteer = await authenticateVolunteer(data.code, data.email);
        if (volunteer) {
          const session = trackSession('volunteers', volunteer.code, {
            email: volunteer.email,
            domain: data.domain,
            userAgent: event.headers['user-agent'],
            ip: event.headers['x-forwarded-for'] || event.headers['client-ip']
          });
          
          const token = generateToken({ code: volunteer.code, type: 'volunteer' }, session.id);
          
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              success: true,
              user: {
                code: volunteer.code,
                email: volunteer.email,
                type: 'volunteer'
              },
              sessionId: session.id,
              token
            })
          };
        }
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ success: false, message: 'Invalid volunteer code' })
        };
      }

      case 'login_admin': {
        const admin = await authenticateAdmin(data.code);
        if (admin) {
          const session = trackSession('admin', admin.code, {
            domain: data.domain,
            userAgent: event.headers['user-agent'],
            ip: event.headers['x-forwarded-for'] || event.headers['client-ip']
          });
          
          const token = generateToken({ code: admin.code, type: 'admin' }, session.id);
          
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              success: true,
              user: {
                code: admin.code,
                role: admin.role,
                type: 'admin'
              },
              sessionId: session.id,
              token
            })
          };
        }
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ success: false, message: 'Invalid admin code' })
        };
      }

      case 'verify_token': {
        try {
          const token = data.token;
          const decoded = jwt.verify(token, JWT_SECRET);
          
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              success: true,
              user: {
                userId: decoded.userId,
                type: decoded.type,
                sessionId: decoded.sessionId
              }
            })
          };
        } catch (error) {
          return {
            statusCode: 401,
            headers,
            body: JSON.stringify({ success: false, message: 'Invalid token' })
          };
        }
      }

      default:
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ success: false, message: 'Invalid action' })
        };
    }
  } catch (error) {
    console.error('Auth error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, message: 'Server error' })
    };
  }
};
