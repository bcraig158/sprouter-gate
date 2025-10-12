const sqlite3 = require('sqlite3').verbose();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { DateTime } = require('luxon');

// Environment variables
const JWT_SECRET = process.env.JWT_SECRET || '86d2bbcb5cd6a7b84f1e84473a95c976fd1febc5955da91779765d8df109304812e3c2b6410eb4c92cfa524f17e0263649f3b164297c0c94dcc0798682f1c8fe';
const DB_PATH = process.env.DATABASE_PATH || '/tmp/sprouter_events.db';

// Database helper functions
function runQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DB_PATH);
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
      db.close();
    });
  });
}

function getQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DB_PATH);
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
      db.close();
    });
  });
}

// Initialize database
async function initDatabase() {
  try {
    // Create tables
    await runQuery(`
      CREATE TABLE IF NOT EXISTS students (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id TEXT UNIQUE NOT NULL,
        household_id TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await runQuery(`
      CREATE TABLE IF NOT EXISTS households (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        household_id TEXT UNIQUE NOT NULL,
        volunteer_code TEXT,
        volunteer_redeemed BOOLEAN DEFAULT FALSE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await runQuery(`
      CREATE TABLE IF NOT EXISTS volunteer_codes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT UNIQUE NOT NULL,
        email TEXT NOT NULL,
        name TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await runQuery(`
      CREATE TABLE IF NOT EXISTS user_logins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        user_type TEXT NOT NULL,
        session_id TEXT,
        ip_address TEXT,
        user_agent TEXT,
        login_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME
      )
    `);

    // Add sample data
    await runQuery(`
      INSERT OR IGNORE INTO students (student_id, household_id) 
      VALUES (?, ?)
    `, ['33727', 'HH_33727']);

    await runQuery(`
      INSERT OR IGNORE INTO households (household_id, volunteer_redeemed) 
      VALUES (?, ?)
    `, ['HH_33727', false]);

    await runQuery(`
      INSERT OR IGNORE INTO volunteer_codes (code, email, name) 
      VALUES (?, ?, ?)
    `, ['339933', 'admin@maidu.com', 'Admin']);

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization error:', error);
  }
}

// Main handler
exports.handler = async (event, context) => {
  try {
    // Initialize database on first run
    await initDatabase();

    const { httpMethod, path, body, headers } = event;
    const pathSegments = path.split('/').filter(Boolean);
    const endpoint = pathSegments[pathSegments.length - 1];

    console.log(`API call: ${httpMethod} ${path} -> ${endpoint}`);

    // Health check
    if (httpMethod === 'GET' && endpoint === 'health') {
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
        },
        body: JSON.stringify({ 
          status: 'OK', 
          timestamp: new Date().toISOString(),
          endpoint: endpoint
        })
      };
    }

    // Student login
    if (httpMethod === 'POST' && endpoint === 'login') {
      const { studentId } = JSON.parse(body || '{}');

      if (!studentId) {
        return {
          statusCode: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({ 
            success: false, 
            message: 'Student ID is required' 
          })
        };
      }

      // Find student
      const student = await getQuery(
        'SELECT * FROM students WHERE student_id = ?',
        [studentId]
      );

      if (!student) {
        console.log(`❌ Invalid student login attempt: ${studentId}`);
        return {
          statusCode: 404,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({ 
            success: false, 
            message: 'Student ID not found. Please check your Student ID and try again.' 
          })
        };
      }

      console.log(`✅ Valid student login: ${studentId} (Household: ${student.household_id})`);

      // Generate JWT token
      const token = jwt.sign(
        { 
          householdId: student.household_id,
          studentId: student.student_id 
        },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      // Track login
      const sessionId = bcrypt.hashSync(student.household_id + Date.now(), 10);
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      await runQuery(`
        INSERT INTO user_logins (user_id, user_type, session_id, ip_address, user_agent, login_timestamp, expires_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        student.household_id,
        'student',
        sessionId,
        headers['x-forwarded-for'] || headers['x-real-ip'] || '',
        headers['user-agent'] || '',
        new Date().toISOString(),
        expiresAt
      ]);

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: true,
          token,
          householdId: student.household_id,
          isVolunteer: false
        })
      };
    }

    // Volunteer login
    if (httpMethod === 'POST' && endpoint === 'volunteer-login') {
      const { volunteerCode, email } = JSON.parse(body || '{}');

      if (!volunteerCode || !email) {
        return {
          statusCode: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({ 
            success: false, 
            message: 'Volunteer code and email are required' 
          })
        };
      }

      // Find volunteer
      const volunteer = await getQuery(
        'SELECT * FROM volunteer_codes WHERE code = ? AND email = ?',
        [volunteerCode.trim(), email.trim().toLowerCase()]
      );

      if (!volunteer) {
        console.log(`❌ Invalid volunteer login attempt: ${volunteerCode} / ${email}`);
        return {
          statusCode: 404,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({ 
            success: false, 
            message: 'Invalid volunteer code or email. Please try again.' 
          })
        };
      }

      console.log(`✅ Valid volunteer login: ${volunteerCode} (${volunteer.name})`);

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

      // Track login
      const sessionId = bcrypt.hashSync(volunteerHouseholdId + Date.now(), 10);
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      await runQuery(`
        INSERT INTO user_logins (user_id, user_type, session_id, ip_address, user_agent, login_timestamp, expires_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        volunteerHouseholdId,
        'volunteer',
        sessionId,
        headers['x-forwarded-for'] || headers['x-real-ip'] || '',
        headers['user-agent'] || '',
        new Date().toISOString(),
        expiresAt
      ]);

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: true,
          token,
          householdId: volunteerHouseholdId,
          isVolunteer: true,
          isAdmin: isAdmin
        })
      };
    }

    // Analytics endpoint
    if (httpMethod === 'GET' && endpoint === 'analytics') {
      const totalLogins = await getQuery('SELECT COUNT(*) as count FROM user_logins');
      const studentLogins = await getQuery('SELECT COUNT(*) as count FROM user_logins WHERE user_type = ?', ['student']);
      const volunteerLogins = await getQuery('SELECT COUNT(*) as count FROM user_logins WHERE user_type = ?', ['volunteer']);

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          totalLogins: totalLogins?.count || 0,
          studentLogins: studentLogins?.count || 0,
          volunteerLogins: volunteerLogins?.count || 0,
          totalShowSelections: 0,
          totalPurchases: 0,
          totalRevenue: 0,
          showBreakdown: {},
          recentActivity: [],
          topUsers: [],
          dailyLimits: []
        })
      };
    }

    // Handle OPTIONS requests for CORS
    if (httpMethod === 'OPTIONS') {
      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
        },
        body: ''
      };
    }

    // Not found
    return {
      statusCode: 404,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ 
        error: 'Not found',
        method: httpMethod,
        path: path,
        endpoint: endpoint
      })
    };

  } catch (error) {
    console.error('Function error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error.message
      })
    };
  }
};