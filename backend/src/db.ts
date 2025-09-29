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

    // Create indexes for better performance
    await database.exec(`CREATE INDEX IF NOT EXISTS idx_students_household_id ON students(household_id)`);
    await database.exec(`CREATE INDEX IF NOT EXISTS idx_sessions_household_id ON sessions(household_id)`);
    await database.exec(`CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at)`);
    await database.exec(`CREATE INDEX IF NOT EXISTS idx_family_night_state_household_id ON family_night_state(household_id)`);
    await database.exec(`CREATE INDEX IF NOT EXISTS idx_audit_log_household_id ON audit_log(household_id)`);

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

    console.log('Database initialized successfully');
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
