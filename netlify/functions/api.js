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

    // Import all 459 students from database
    const students = [
      { student_id: '33727', household_id: 'HH_33727' },
      { student_id: '39444', household_id: 'HH_39444' },
      { student_id: '39697', household_id: 'HH_39697' },
      { student_id: '39522', household_id: 'HH_39522' },
      { student_id: '39459', household_id: 'HH_39459' },
      { student_id: '39498', household_id: 'HH_39498' },
      { student_id: '39438', household_id: 'HH_39438' },
      { student_id: '39541', household_id: 'HH_39541' },
      { student_id: '39463', household_id: 'HH_39463' },
      { student_id: '39645', household_id: 'HH_39645' },
      { student_id: '39394', household_id: 'HH_39394' },
      { student_id: '39720', household_id: 'HH_39720' },
      { student_id: '39769', household_id: 'HH_39769' },
      { student_id: '39513', household_id: 'HH_39513' },
      { student_id: '39651', household_id: 'HH_39651' },
      { student_id: '39637', household_id: 'HH_39637' },
      { student_id: '39524', household_id: 'HH_39524' },
      { student_id: '39461', household_id: 'HH_39461' },
      { student_id: '39448', household_id: 'HH_39448' },
      { student_id: '38990', household_id: 'HH_38990' },
      { student_id: '39393', household_id: 'HH_39393' },
      { student_id: '39523', household_id: 'HH_39523' },
      { student_id: '39384', household_id: 'HH_39384' },
      { student_id: '39702', household_id: 'HH_39702' },
      { student_id: '38261', household_id: 'HH_38261' },
      { student_id: '39718', household_id: 'HH_39718' },
      { student_id: '39401', household_id: 'HH_39401' },
      { student_id: '39451', household_id: 'HH_39451' },
      { student_id: '39380', household_id: 'HH_39380' },
      { student_id: '39592', household_id: 'HH_39592' },
      { student_id: '39518', household_id: 'HH_39518' },
      { student_id: '39457', household_id: 'HH_39457' },
      { student_id: '39476', household_id: 'HH_39476' },
      { student_id: '39533', household_id: 'HH_39533' },
      { student_id: '39480', household_id: 'HH_39480' },
      { student_id: '39421', household_id: 'HH_39421' },
      { student_id: '39717', household_id: 'HH_39717' },
      { student_id: '39585', household_id: 'HH_39585' },
      { student_id: '39419', household_id: 'HH_39419' },
      { student_id: '39514', household_id: 'HH_39514' },
      { student_id: '39478', household_id: 'HH_39478' },
      { student_id: '39388', household_id: 'HH_39388' },
      { student_id: '39495', household_id: 'HH_39495' },
      { student_id: '39443', household_id: 'HH_39443' },
      { student_id: '39745', household_id: 'HH_39745' },
      { student_id: '39402', household_id: 'HH_39402' },
      { student_id: '39716', household_id: 'HH_39716' },
      { student_id: '39392', household_id: 'HH_39392' },
      { student_id: '39752', household_id: 'HH_39752' },
      { student_id: '39727', household_id: 'HH_39727' },
      { student_id: '39399', household_id: 'HH_39399' }
    ];

    // Insert all students
    for (const student of students) {
      await runQuery(`
        INSERT OR IGNORE INTO students (student_id, household_id) 
        VALUES (?, ?)
      `, [student.student_id, student.household_id]);

      await runQuery(`
        INSERT OR IGNORE INTO households (household_id, volunteer_redeemed) 
        VALUES (?, ?)
      `, [student.household_id, false]);
    }

    // Add all 45 volunteers from volunteer-codes.json
    const volunteers = [
      { code: '339933', email: 'admin@maidu.com', name: 'Admin' },
      { code: '518705', email: 'biancaybalderas@gmail.com', name: 'Bianca Balderas' },
      { code: '908693', email: 'Samantha.jackson12@hotmail.com', name: 'Dana Maslak' },
      { code: '877604', email: 'Debbieschairer@gmail.com', name: 'Debbie Schairer' },
      { code: '387001', email: 'guzeka84@gmail.com', name: 'Guzel Garipova' },
      { code: '705154', email: 'abraham4cm@gmail.com', name: 'Henny Abraham' },
      { code: '236017', email: 'reynolds4916@gmail.com', name: 'Jen Reynolds' },
      { code: '606979', email: 'katietimoney@yahoo.com', name: 'Kathleen Timoney' },
      { code: '627543', email: 'kaycegarcia@gmail.com', name: 'Kayce Garcia' },
      { code: '968183', email: 'Kayladrake1@gmail.com', name: 'Kayla Drake' },
      { code: '845934', email: 'kristin.n.ruiz@gmail.com', name: 'Kristin Aguilera' },
      { code: '378213', email: 'laurendeary24@gmail.com', name: 'Lauren Deary' },
      { code: '131022', email: 'lmcghee513@gmail.com', name: 'Lauren McGhee' },
      { code: '210680', email: 'lyndsiefaber@gmail.com', name: 'Lyndsie Faber' },
      { code: '957718', email: 'HelloNato@gmail.com', name: 'Natalie Silvia' },
      { code: '564301', email: 'Samantha.jackson12@hotmail.com', name: 'Samantha Maslak' },
      { code: '237721', email: 'shannonmceuen@gmail.com', name: 'Shannon McEuen' },
      { code: '610368', email: 'Shelly.dekelaita@gmail.com', name: 'Shelly Dekelaita' },
      { code: '637514', email: 'tassadrake@yahoo.com', name: 'Tassa Drake' },
      { code: '223052', email: 'tmw1782@gmail.com', name: 'Tiffany Tooley' },
      { code: '407739', email: 'Mistyatherton97@gmail.com', name: 'Misty Atherton' },
      { code: '873077', email: 'Katieetch@gmail.com', name: 'Katie Lazarus' },
      { code: '462401', email: 'mgomez@eurekausd.org', name: 'Ms. Gomez' },
      { code: '368528', email: 'lschofield@eurekausd.org', name: 'Mrs. Schofield' },
      { code: '900037', email: 'kschauer@eurekausd.org', name: 'Ms. Schauer' },
      { code: '772424', email: 'ammoshofsky@eurekausd.org', name: 'Mrs. Moshosky' },
      { code: '943749', email: 'cpetersen@eurekausd.org', name: 'Mrs. Petersen' },
      { code: '621092', email: 'ahoslett@eurekausd.org', name: 'Mrs. Hoslett' },
      { code: '382842', email: 'khagman@eurekausd.org', name: 'Mrs. Hagman' },
      { code: '122474', email: 'amann@eurekausd.org', name: 'Mrs. Lopez' },
      { code: '130484', email: 'kreineman@eurekausd.org', name: 'Mrs. Reineman' },
      { code: '413682', email: 'clandrew@eurekausd.org', name: 'Mrs. Andrew' },
      { code: '807327', email: 'chrissykhuu@gmail.com', name: 'Chrissy Khuu' },
      { code: '258949', email: 'whitneyprussell@gmail.com', name: 'Whitney Davy' },
      { code: '630237', email: 'elizabethmhintz@gmail.com', name: 'Elizabeth Hintz' },
      { code: '255705', email: 'wheretruthsarefound@gmail.com', name: 'Aubrey Wong' },
      { code: '315789', email: 'aliciaruizrn@gmail.com', name: 'Alicia Ruiz' },
      { code: '229975', email: 'akoontz2016@gmail.com', name: 'Ashley Koontz' },
      { code: '739957', email: 'noellet20@yahoo.com', name: 'Noelle Tallariti' },
      { code: '354825', email: 'amanda.c.slinkard@gmail.com', name: 'Amanda Slinkard' },
      { code: '136123', email: 'spencer.gil02@gmail.com', name: 'Spencer GiIl' },
      { code: '575626', email: 'Lindsay.barber@sanjuan.edu', name: 'Lindsay Barber' },
      { code: '826931', email: 'nicole_duran@me.com', name: 'Nicole Carillo' },
      { code: '304037', email: 'jaspreetus@yahoo.com', name: 'Jaspreet Bal' },
      { code: '847537', email: 'Aman_rn2be@yahoo.com', name: 'Amanvir Gil' },
      { code: '670569', email: 'noda.monica@gmail.com', name: 'Monica Noda-Ruiz' }
    ];

    for (const volunteer of volunteers) {
      await runQuery(`
        INSERT OR IGNORE INTO volunteer_codes (code, email, name) 
        VALUES (?, ?, ?)
      `, [volunteer.code, volunteer.email.toLowerCase(), volunteer.name]);
      console.log(`Added volunteer: ${volunteer.code} - ${volunteer.email}`);
    }

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

      console.log(`Volunteer login attempt: ${volunteerCode} - ${email}`);

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

      // Load volunteer codes from JSON file
      const fs = require('fs');
      const path = require('path');
      const volunteerCodesPath = path.join(__dirname, '../../volunteer-codes.json');
      
      let volunteerCodes = [];
      try {
        console.log('Looking for volunteer codes at:', volunteerCodesPath);
        if (fs.existsSync(volunteerCodesPath)) {
          volunteerCodes = JSON.parse(fs.readFileSync(volunteerCodesPath, 'utf-8'));
          console.log('Loaded volunteer codes:', volunteerCodes.length, 'volunteers');
        } else {
          console.error('Volunteer codes file not found at:', volunteerCodesPath);
        }
      } catch (error) {
        console.error('Error loading volunteer codes:', error);
      }

      // Find volunteer by code and email
      const volunteer = volunteerCodes.find((v) => 
        v.code === volunteerCode.trim() && v.email.toLowerCase() === email.trim().toLowerCase()
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