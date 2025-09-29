import { open } from 'sqlite';
import path from 'path';
import fs from 'fs';

const DB_PATH = process.env.DATABASE_PATH || './data/sprouter_events.db';

async function initDatabase() {
  // Ensure data directory exists
  const dataDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const db = await open({
    filename: DB_PATH,
    driver: require('sqlite3').Database
  });
  
  try {
    console.log('🗄️  Initializing database...');
    
    // Students table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS students (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id TEXT UNIQUE NOT NULL,
        household_id TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Households table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS households (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        household_id TEXT UNIQUE NOT NULL,
        volunteer_code TEXT,
        volunteer_redeemed BOOLEAN DEFAULT FALSE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Volunteer codes table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS volunteer_codes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT UNIQUE NOT NULL,
        is_used BOOLEAN DEFAULT FALSE,
        used_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Family night state table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS family_night_state (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        household_id TEXT NOT NULL,
        night TEXT NOT NULL,
        tickets_requested INTEGER DEFAULT 0,
        tickets_purchased INTEGER DEFAULT 0,
        shows_selected TEXT DEFAULT '[]',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(household_id, night)
      )
    `);

    // Sessions table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT UNIQUE NOT NULL,
        household_id TEXT NOT NULL,
        expires_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Audit log table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS audit_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        household_id TEXT NOT NULL,
        action TEXT NOT NULL,
        details TEXT,
        ip_address TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes for better performance
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_students_household_id ON students(household_id)`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_sessions_household_id ON sessions(household_id)`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at)`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_family_night_state_household_id ON family_night_state(household_id)`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_audit_log_household_id ON audit_log(household_id)`);

    console.log('✅ Database tables created successfully!');
    
  } catch (error) {
    console.error('❌ Database initialization error:', error);
    throw error;
  } finally {
    await db.close();
  }
}

async function main() {
  try {
    await initDatabase();
    console.log('🎉 Database initialization completed!');
  } catch (error) {
    console.error('Failed to initialize database:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { initDatabase };
