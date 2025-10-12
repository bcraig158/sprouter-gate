import { runQuery } from '../db';

async function createEnhancedAnalyticsTables() {
  try {
    console.log('Creating enhanced analytics tracking tables...');

    // Enhanced user_logins table with more detailed tracking
    await runQuery(`
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
    await runQuery(`
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
    await runQuery(`
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

    // New table: Purchase intents (when user starts checkout)
    await runQuery(`
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

    // New table: Sprouter success page visits (verification of completed purchases)
    await runQuery(`
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

    // New table: User activity timeline (comprehensive tracking)
    await runQuery(`
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

    // New table: Daily purchase limits tracking
    await runQuery(`
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

    // Create comprehensive indexes for optimal performance
    await runQuery(`CREATE INDEX IF NOT EXISTS idx_user_logins_user_id ON user_logins(user_id)`);
    await runQuery(`CREATE INDEX IF NOT EXISTS idx_user_logins_timestamp ON user_logins(login_timestamp)`);
    await runQuery(`CREATE INDEX IF NOT EXISTS idx_user_logins_session ON user_logins(session_id)`);

    await runQuery(`CREATE INDEX IF NOT EXISTS idx_show_selections_user_id ON show_selections(user_id)`);
    await runQuery(`CREATE INDEX IF NOT EXISTS idx_show_selections_show_id ON show_selections(show_id)`);
    await runQuery(`CREATE INDEX IF NOT EXISTS idx_show_selections_timestamp ON show_selections(selection_timestamp)`);
    await runQuery(`CREATE INDEX IF NOT EXISTS idx_show_selections_session ON show_selections(session_id)`);

    await runQuery(`CREATE INDEX IF NOT EXISTS idx_purchases_user_id ON purchases(user_id)`);
    await runQuery(`CREATE INDEX IF NOT EXISTS idx_purchases_show_id ON purchases(show_id)`);
    await runQuery(`CREATE INDEX IF NOT EXISTS idx_purchases_status ON purchases(payment_status)`);
    await runQuery(`CREATE INDEX IF NOT EXISTS idx_purchases_timestamp ON purchases(purchase_timestamp)`);
    await runQuery(`CREATE INDEX IF NOT EXISTS idx_purchases_sprouter_id ON purchases(sprouter_transaction_id)`);

    await runQuery(`CREATE INDEX IF NOT EXISTS idx_purchase_intents_user_id ON purchase_intents(user_id)`);
    await runQuery(`CREATE INDEX IF NOT EXISTS idx_purchase_intents_show_id ON purchase_intents(show_id)`);
    await runQuery(`CREATE INDEX IF NOT EXISTS idx_purchase_intents_intent_id ON purchase_intents(intent_id)`);
    await runQuery(`CREATE INDEX IF NOT EXISTS idx_purchase_intents_status ON purchase_intents(status)`);

    await runQuery(`CREATE INDEX IF NOT EXISTS idx_sprouter_success_user_id ON sprouter_success_visits(user_id)`);
    await runQuery(`CREATE INDEX IF NOT EXISTS idx_sprouter_success_show_id ON sprouter_success_visits(show_id)`);
    await runQuery(`CREATE INDEX IF NOT EXISTS idx_sprouter_success_timestamp ON sprouter_success_visits(success_timestamp)`);
    await runQuery(`CREATE INDEX IF NOT EXISTS idx_sprouter_success_transaction ON sprouter_success_visits(sprouter_transaction_id)`);

    await runQuery(`CREATE INDEX IF NOT EXISTS idx_activity_timeline_user_id ON user_activity_timeline(user_id)`);
    await runQuery(`CREATE INDEX IF NOT EXISTS idx_activity_timeline_timestamp ON user_activity_timeline(activity_timestamp)`);
    await runQuery(`CREATE INDEX IF NOT EXISTS idx_activity_timeline_type ON user_activity_timeline(activity_type)`);
    await runQuery(`CREATE INDEX IF NOT EXISTS idx_activity_timeline_session ON user_activity_timeline(session_id)`);

    await runQuery(`CREATE INDEX IF NOT EXISTS idx_daily_limits_user_date ON daily_purchase_limits(user_id, purchase_date)`);

    console.log('✅ Enhanced analytics tables created successfully!');
    console.log('Enhanced tables created:');
    console.log('- user_logins: Enhanced login tracking with session management');
    console.log('- show_selections: Detailed showtime selection tracking');
    console.log('- purchases: Comprehensive purchase tracking with Sprouter integration');
    console.log('- purchase_intents: Track when users start checkout process');
    console.log('- sprouter_success_visits: Verify successful ticket purchases');
    console.log('- user_activity_timeline: Complete user journey tracking');
    console.log('- daily_purchase_limits: Track and enforce daily purchase limits');
    console.log('- Comprehensive indexes for optimal query performance');

  } catch (error) {
    console.error('❌ Error creating enhanced analytics tables:', error);
    throw error;
  }
}

// Run the migration if this file is executed directly
if (require.main === module) {
  createEnhancedAnalyticsTables()
    .then(() => {
      console.log('Enhanced analytics tables migration completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Enhanced analytics tables migration failed:', error);
      process.exit(1);
    });
}

export default createEnhancedAnalyticsTables;
