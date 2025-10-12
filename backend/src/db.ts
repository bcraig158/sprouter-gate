import { open } from 'sqlite';
import path from 'path';
import fs from 'fs';

const DB_PATH = process.env.DATABASE_PATH || './data/sprouter_events.db';

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

let db: any = null;

export async function getDatabase() {
  if (!db) {
    db = await open({
      filename: DB_PATH,
      driver: require('sqlite3').Database
    });
  }
  return db;
}

export interface Student {
  id: number;
  student_id: string;
  household_id: string;
  created_at: string;
}

export interface Household {
  id: number;
  household_id: string;
  volunteer_code?: string;
  volunteer_redeemed: boolean;
  created_at: string;
}

export interface VolunteerCode {
  id: number;
  code: string;
  is_used: boolean;
  used_at?: string;
  created_at: string;
}

export interface FamilyNightState {
  id: number;
  household_id: string;
  night: string; // 'tue' or 'thu'
  tickets_requested: number;
  tickets_purchased: number;
  shows_selected: string; // JSON array of event keys
  created_at: string;
  updated_at: string;
}

export interface Session {
  id: number;
  session_id: string;
  household_id: string;
  expires_at: string;
  created_at: string;
}

export interface AuditLog {
  id: number;
  household_id: string;
  action: string;
  details: string;
  ip_address: string;
  created_at: string;
}

export async function initDatabase(): Promise<void> {
  try {
    const database = await getDatabase();
    
    // Students table
    await database.exec(`
      CREATE TABLE IF NOT EXISTS students (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id TEXT UNIQUE NOT NULL,
        household_id TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Households table
    await database.exec(`
      CREATE TABLE IF NOT EXISTS households (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        household_id TEXT UNIQUE NOT NULL,
        volunteer_code TEXT,
        volunteer_redeemed BOOLEAN DEFAULT FALSE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Volunteer codes table
    await database.exec(`
      CREATE TABLE IF NOT EXISTS volunteer_codes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT UNIQUE NOT NULL,
        is_used BOOLEAN DEFAULT FALSE,
        used_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Family night state table
    await database.exec(`
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
    await database.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT UNIQUE NOT NULL,
        household_id TEXT NOT NULL,
        expires_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Audit log table
    await database.exec(`
      CREATE TABLE IF NOT EXISTS audit_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        household_id TEXT NOT NULL,
        action TEXT NOT NULL,
        details TEXT,
        ip_address TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Enhanced user_logins table with more detailed tracking
    await database.exec(`
      CREATE TABLE IF NOT EXISTS user_logins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        user_type TEXT NOT NULL CHECK (user_type IN ('student', 'volunteer')),
        identifier TEXT NOT NULL,
        email TEXT,
        name TEXT,
        ip_address TEXT,
        user_agent TEXT,
        login_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        session_id TEXT,
        login_source TEXT DEFAULT 'web',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Enhanced show_selections table with detailed showtime tracking
    await database.exec(`
      CREATE TABLE IF NOT EXISTS show_selections (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        user_type TEXT NOT NULL CHECK (user_type IN ('student', 'volunteer')),
        show_id TEXT NOT NULL,
        show_date TEXT NOT NULL,
        show_time TEXT NOT NULL,
        show_datetime TEXT NOT NULL,
        tickets_requested INTEGER NOT NULL,
        selection_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        session_id TEXT,
        ip_address TEXT,
        user_agent TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Enhanced purchases table with Sprouter integration tracking
    await database.exec(`
      CREATE TABLE IF NOT EXISTS purchases (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        user_type TEXT NOT NULL CHECK (user_type IN ('student', 'volunteer')),
        show_id TEXT NOT NULL,
        show_date TEXT NOT NULL,
        show_time TEXT NOT NULL,
        show_datetime TEXT NOT NULL,
        tickets_purchased INTEGER NOT NULL,
        total_cost DECIMAL(10,2) NOT NULL,
        payment_status TEXT NOT NULL CHECK (payment_status IN ('pending', 'completed', 'failed', 'cancelled')),
        transaction_id TEXT,
        sprouter_transaction_id TEXT,
        sprouter_order_id TEXT,
        purchase_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        completion_timestamp DATETIME,
        session_id TEXT,
        ip_address TEXT,
        user_agent TEXT,
        payment_method TEXT,
        refund_status TEXT DEFAULT 'none',
        refund_timestamp DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Purchase intents table (when user starts checkout)
    await database.exec(`
      CREATE TABLE IF NOT EXISTS purchase_intents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        user_type TEXT NOT NULL CHECK (user_type IN ('student', 'volunteer')),
        show_id TEXT NOT NULL,
        show_date TEXT NOT NULL,
        show_time TEXT NOT NULL,
        show_datetime TEXT NOT NULL,
        tickets_requested INTEGER NOT NULL,
        intent_id TEXT UNIQUE NOT NULL,
        sprouter_url TEXT,
        intent_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        session_id TEXT,
        ip_address TEXT,
        user_agent TEXT,
        status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned', 'expired')),
        completion_timestamp DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Sprouter success page visits (verification of completed purchases)
    await database.exec(`
      CREATE TABLE IF NOT EXISTS sprouter_success_visits (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        user_type TEXT NOT NULL CHECK (user_type IN ('student', 'volunteer')),
        show_id TEXT NOT NULL,
        show_date TEXT NOT NULL,
        show_time TEXT NOT NULL,
        show_datetime TEXT NOT NULL,
        sprouter_transaction_id TEXT,
        sprouter_order_id TEXT,
        success_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        session_id TEXT,
        ip_address TEXT,
        user_agent TEXT,
        return_url TEXT,
        verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'failed')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // User activity timeline (comprehensive tracking)
    await database.exec(`
      CREATE TABLE IF NOT EXISTS user_activity_timeline (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        user_type TEXT NOT NULL CHECK (user_type IN ('student', 'volunteer')),
        activity_type TEXT NOT NULL CHECK (activity_type IN ('login', 'show_selection', 'purchase_intent', 'purchase_completed', 'purchase_failed', 'sprouter_success', 'logout', 'session_timeout')),
        activity_details TEXT,
        show_id TEXT,
        session_id TEXT,
        ip_address TEXT,
        user_agent TEXT,
        activity_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        metadata TEXT, -- JSON string for additional data
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Daily purchase limits tracking
    await database.exec(`
      CREATE TABLE IF NOT EXISTS daily_purchase_limits (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        user_type TEXT NOT NULL CHECK (user_type IN ('student', 'volunteer')),
        purchase_date DATE NOT NULL,
        total_tickets_purchased INTEGER DEFAULT 0,
        total_spent DECIMAL(10,2) DEFAULT 0.00,
        shows_attended TEXT, -- JSON array of show_ids
        limit_exceeded BOOLEAN DEFAULT FALSE,
        last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, purchase_date)
      )
    `);

    // Create indexes for better performance
    await database.exec(`CREATE INDEX IF NOT EXISTS idx_students_household_id ON students(household_id)`);
    await database.exec(`CREATE INDEX IF NOT EXISTS idx_sessions_household_id ON sessions(household_id)`);
    await database.exec(`CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at)`);
    await database.exec(`CREATE INDEX IF NOT EXISTS idx_family_night_state_household_id ON family_night_state(household_id)`);
    await database.exec(`CREATE INDEX IF NOT EXISTS idx_audit_log_household_id ON audit_log(household_id)`);

    // Analytics table indexes
    await database.exec(`CREATE INDEX IF NOT EXISTS idx_user_logins_user_id ON user_logins(user_id)`);
    await database.exec(`CREATE INDEX IF NOT EXISTS idx_user_logins_timestamp ON user_logins(login_timestamp)`);
    await database.exec(`CREATE INDEX IF NOT EXISTS idx_user_logins_session ON user_logins(session_id)`);
    await database.exec(`CREATE INDEX IF NOT EXISTS idx_show_selections_user_id ON show_selections(user_id)`);
    await database.exec(`CREATE INDEX IF NOT EXISTS idx_show_selections_show_id ON show_selections(show_id)`);
    await database.exec(`CREATE INDEX IF NOT EXISTS idx_show_selections_timestamp ON show_selections(selection_timestamp)`);
    await database.exec(`CREATE INDEX IF NOT EXISTS idx_show_selections_session ON show_selections(session_id)`);
    await database.exec(`CREATE INDEX IF NOT EXISTS idx_purchases_user_id ON purchases(user_id)`);
    await database.exec(`CREATE INDEX IF NOT EXISTS idx_purchases_show_id ON purchases(show_id)`);
    await database.exec(`CREATE INDEX IF NOT EXISTS idx_purchases_status ON purchases(payment_status)`);
    await database.exec(`CREATE INDEX IF NOT EXISTS idx_purchases_timestamp ON purchases(purchase_timestamp)`);
    await database.exec(`CREATE INDEX IF NOT EXISTS idx_purchases_sprouter_id ON purchases(sprouter_transaction_id)`);
    await database.exec(`CREATE INDEX IF NOT EXISTS idx_purchase_intents_user_id ON purchase_intents(user_id)`);
    await database.exec(`CREATE INDEX IF NOT EXISTS idx_purchase_intents_show_id ON purchase_intents(show_id)`);
    await database.exec(`CREATE INDEX IF NOT EXISTS idx_purchase_intents_intent_id ON purchase_intents(intent_id)`);
    await database.exec(`CREATE INDEX IF NOT EXISTS idx_purchase_intents_status ON purchase_intents(status)`);
    await database.exec(`CREATE INDEX IF NOT EXISTS idx_sprouter_success_user_id ON sprouter_success_visits(user_id)`);
    await database.exec(`CREATE INDEX IF NOT EXISTS idx_sprouter_success_show_id ON sprouter_success_visits(show_id)`);
    await database.exec(`CREATE INDEX IF NOT EXISTS idx_sprouter_success_timestamp ON sprouter_success_visits(success_timestamp)`);
    await database.exec(`CREATE INDEX IF NOT EXISTS idx_sprouter_success_transaction ON sprouter_success_visits(sprouter_transaction_id)`);
    await database.exec(`CREATE INDEX IF NOT EXISTS idx_activity_timeline_user_id ON user_activity_timeline(user_id)`);
    await database.exec(`CREATE INDEX IF NOT EXISTS idx_activity_timeline_timestamp ON user_activity_timeline(activity_timestamp)`);
    await database.exec(`CREATE INDEX IF NOT EXISTS idx_activity_timeline_type ON user_activity_timeline(activity_type)`);
    await database.exec(`CREATE INDEX IF NOT EXISTS idx_activity_timeline_session ON user_activity_timeline(session_id)`);
    await database.exec(`CREATE INDEX IF NOT EXISTS idx_daily_limits_user_date ON daily_purchase_limits(user_id, purchase_date)`);

    // Insert some sample volunteer codes (in production, these would be pre-generated)
    try {
      await database.exec(`
        INSERT OR IGNORE INTO volunteer_codes (code) VALUES 
        ('VOLUNTEER2024'),
        ('HELPER2024'),
        ('SUPPORT2024')
      `);
    } catch (err) {
      console.error('Error inserting volunteer codes:', err);
    }

    console.log('Database initialized successfully with analytics tables');
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  }
}

// Helper functions using sqlite async API
export async function runQuery<T = any>(sql: string, params: any[] = []): Promise<T> {
  try {
    const database = await getDatabase();
    const stmt = await database.prepare(sql);
    return await stmt.run(...params) as T;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

export async function getQuery<T = any>(sql: string, params: any[] = []): Promise<T | undefined> {
  try {
    const database = await getDatabase();
    const stmt = await database.prepare(sql);
    return await stmt.get(...params) as T;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

export async function allQuery<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  try {
    const database = await getDatabase();
    const stmt = await database.prepare(sql);
    return await stmt.all(...params) as T[];
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}
