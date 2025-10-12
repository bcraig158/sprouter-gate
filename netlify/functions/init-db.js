const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

// Database path
const DB_PATH = process.env.DATABASE_PATH || './data/sprouter_events.db';

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize database
function initDatabase() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error('Error opening database:', err);
        reject(err);
        return;
      }
      console.log('Connected to SQLite database');
    });

    // Create tables
    const createTables = `
      -- Students table
      CREATE TABLE IF NOT EXISTS students (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id TEXT UNIQUE NOT NULL,
        household_id TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- Households table
      CREATE TABLE IF NOT EXISTS households (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        household_id TEXT UNIQUE NOT NULL,
        volunteer_code TEXT,
        volunteer_redeemed BOOLEAN DEFAULT FALSE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- Volunteer codes table
      CREATE TABLE IF NOT EXISTS volunteer_codes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT UNIQUE NOT NULL,
        email TEXT NOT NULL,
        name TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- User logins table
      CREATE TABLE IF NOT EXISTS user_logins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        user_type TEXT NOT NULL,
        session_id TEXT,
        ip_address TEXT,
        user_agent TEXT,
        login_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME
      );

      -- Show selections table
      CREATE TABLE IF NOT EXISTS show_selections (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        user_type TEXT NOT NULL,
        show_date TEXT NOT NULL,
        show_time TEXT NOT NULL,
        show_id TEXT NOT NULL,
        tickets_requested INTEGER NOT NULL,
        tickets_purchased INTEGER DEFAULT 0,
        selection_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- Purchases table
      CREATE TABLE IF NOT EXISTS purchases (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        user_type TEXT NOT NULL,
        show_id TEXT NOT NULL,
        tickets_purchased INTEGER NOT NULL,
        total_cost REAL NOT NULL,
        payment_status TEXT DEFAULT 'pending',
        purchase_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        transaction_id TEXT
      );
    `;

    db.exec(createTables, (err) => {
      if (err) {
        console.error('Error creating tables:', err);
        reject(err);
        return;
      }
      console.log('Database tables created successfully');
      resolve();
    });

    db.close();
  });
}

// Add sample data
async function addSampleData() {
  const db = new sqlite3.Database(DB_PATH);

  // Add sample student
  await new Promise((resolve, reject) => {
    db.run(`
      INSERT OR IGNORE INTO students (student_id, household_id) 
      VALUES (?, ?)
    `, ['33727', 'HH_33727'], (err) => {
      if (err) reject(err);
      else resolve();
    });
  });

  // Add sample household
  await new Promise((resolve, reject) => {
    db.run(`
      INSERT OR IGNORE INTO households (household_id, volunteer_redeemed) 
      VALUES (?, ?)
    `, ['HH_33727', false], (err) => {
      if (err) reject(err);
      else resolve();
    });
  });

  // Add admin volunteer
  await new Promise((resolve, reject) => {
    db.run(`
      INSERT OR IGNORE INTO volunteer_codes (code, email, name) 
      VALUES (?, ?, ?)
    `, ['339933', 'admin@maidu.com', 'Admin'], (err) => {
      if (err) reject(err);
      else resolve();
    });
  });

  db.close();
  console.log('Sample data added successfully');
}

// Main initialization
async function main() {
  try {
    await initDatabase();
    await addSampleData();
    console.log('Database initialization completed successfully');
  } catch (error) {
    console.error('Database initialization failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { initDatabase, addSampleData };
