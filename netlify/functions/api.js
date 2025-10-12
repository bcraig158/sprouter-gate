const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { DateTime } = require('luxon');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Environment variables
const JWT_SECRET = process.env.JWT_SECRET || '86d2bbcb5cd6a7b84f1e84473a95c976fd1febc5955da91779765d8df109304812e3c2b6410eb4c92cfa524f17e0263649f3b164297c0c94dcc0798682f1c8fe';
const DB_PATH = process.env.DATABASE_PATH || './data/sprouter_events.db';

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

function allQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DB_PATH);
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
      db.close();
    });
  });
}

// Express app
const app = express();

// Middleware
app.use(cors({
  origin: ['https://maidutickets.com', 'https://sproutersecure.com'],
  credentials: true
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Student login endpoint
app.post('/login', async (req, res) => {
  try {
    const { studentId } = req.body;

    if (!studentId) {
      res.status(400).json({ 
        success: false, 
        message: 'Student ID is required' 
      });
      return;
    }

    // Find student by student ID
    const student = await getQuery(
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
    const household = await getQuery(
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
    const expiresAt = DateTime.now().plus({ hours: 24 }).toISOString();

    // Track user activity
    await runQuery(`
      INSERT INTO user_logins (user_id, user_type, session_id, ip_address, user_agent, login_timestamp, expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      student.household_id,
      'student',
      sessionId,
      req.headers['x-forwarded-for'] || req.connection.remoteAddress || '',
      req.headers['user-agent'] || '',
      new Date().toISOString(),
      expiresAt
    ]);

    res.json({
      success: true,
      token,
      householdId: student.household_id,
      isVolunteer: false
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

// Volunteer login endpoint
app.post('/volunteer-login', async (req, res) => {
  try {
    const { volunteerCode, email } = req.body;

    if (!volunteerCode || !email) {
      res.status(400).json({ 
        success: false, 
        message: 'Volunteer code and email are required' 
      });
      return;
    }

    // Find volunteer by code and email
    const volunteer = await getQuery(
      'SELECT * FROM volunteer_codes WHERE code = ? AND email = ?',
      [volunteerCode.trim(), email.trim().toLowerCase()]
    );

    if (!volunteer) {
      console.log(`❌ Invalid volunteer login attempt: ${volunteerCode} / ${email}`);
      res.status(404).json({ 
        success: false, 
        message: 'Invalid volunteer code or email. Please try again.' 
      });
      return;
    }

    console.log(`✅ Valid volunteer login: ${volunteerCode} (${volunteer.name})`);

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

    // Create session
    const sessionId = bcrypt.hashSync(volunteerHouseholdId + Date.now(), 10);
    const expiresAt = DateTime.now().plus({ hours: 24 }).toISOString();

    // Track user activity
    await runQuery(`
      INSERT INTO user_logins (user_id, user_type, session_id, ip_address, user_agent, login_timestamp, expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      volunteerHouseholdId,
      'volunteer',
      sessionId,
      req.headers['x-forwarded-for'] || req.connection.remoteAddress || '',
      req.headers['user-agent'] || '',
      new Date().toISOString(),
      expiresAt
    ]);

    const response = {
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

// Analytics endpoint
app.get('/analytics', async (req, res) => {
  try {
    const timeframe = req.query.timeframe || '24h';
    
    // Get basic analytics data
    const totalLogins = await getQuery('SELECT COUNT(*) as count FROM user_logins');
    const studentLogins = await getQuery('SELECT COUNT(*) as count FROM user_logins WHERE user_type = ?', ['student']);
    const volunteerLogins = await getQuery('SELECT COUNT(*) as count FROM user_logins WHERE user_type = ?', ['volunteer']);
    const totalSelections = await getQuery('SELECT COUNT(*) as count FROM show_selections');
    const totalPurchases = await getQuery('SELECT COUNT(*) as count FROM purchases');
    const totalRevenue = await getQuery('SELECT SUM(total_cost) as total FROM purchases WHERE payment_status = ?', ['completed']);

    res.json({
      totalLogins: totalLogins?.count || 0,
      studentLogins: studentLogins?.count || 0,
      volunteerLogins: volunteerLogins?.count || 0,
      totalShowSelections: totalSelections?.count || 0,
      totalPurchases: totalPurchases?.count || 0,
      totalRevenue: totalRevenue?.total || 0,
      showBreakdown: {},
      recentActivity: [],
      topUsers: [],
      dailyLimits: []
    });

  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

// Export the handler for Netlify Functions
exports.handler = async (event, context) => {
  // Set up the request and response objects
  const req = {
    method: event.httpMethod,
    url: event.path,
    headers: event.headers,
    body: event.body ? JSON.parse(event.body) : {},
    query: event.queryStringParameters || {}
  };

  const res = {
    status: (code) => ({ json: (data) => ({ statusCode: code, body: JSON.stringify(data) }) }),
    json: (data) => ({ statusCode: 200, body: JSON.stringify(data) })
  };

  // Route the request
  if (req.method === 'GET' && req.url === '/health') {
    return res.json({ status: 'OK', timestamp: new Date().toISOString() });
  }
  
  if (req.method === 'POST' && req.url === '/login') {
    return app._router.handle(req, res);
  }
  
  if (req.method === 'POST' && req.url === '/volunteer-login') {
    return app._router.handle(req, res);
  }
  
  if (req.method === 'GET' && req.url === '/analytics') {
    return app._router.handle(req, res);
  }

  return {
    statusCode: 404,
    body: JSON.stringify({ error: 'Not found' })
  };
};
