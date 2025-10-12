import { runQuery } from '../db';

async function createAnalyticsTables() {
  try {
    console.log('Creating analytics tracking tables...');

    // Create user_logins table
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
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create show_selections table
    await runQuery(`
      CREATE TABLE IF NOT EXISTS show_selections (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        user_type TEXT NOT NULL CHECK (user_type IN ('student', 'volunteer')),
        show_id TEXT NOT NULL,
        show_date TEXT NOT NULL,
        show_time TEXT NOT NULL,
        tickets_requested INTEGER NOT NULL,
        selection_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create purchases table
    await runQuery(`
      CREATE TABLE IF NOT EXISTS purchases (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        user_type TEXT NOT NULL CHECK (user_type IN ('student', 'volunteer')),
        show_id TEXT NOT NULL,
        tickets_purchased INTEGER NOT NULL,
        total_cost DECIMAL(10,2) NOT NULL,
        payment_status TEXT NOT NULL CHECK (payment_status IN ('pending', 'completed', 'failed')),
        transaction_id TEXT,
        purchase_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes for better performance
    await runQuery(`
      CREATE INDEX IF NOT EXISTS idx_user_logins_user_id ON user_logins(user_id)
    `);

    await runQuery(`
      CREATE INDEX IF NOT EXISTS idx_user_logins_timestamp ON user_logins(login_timestamp)
    `);

    await runQuery(`
      CREATE INDEX IF NOT EXISTS idx_show_selections_user_id ON show_selections(user_id)
    `);

    await runQuery(`
      CREATE INDEX IF NOT EXISTS idx_show_selections_show_id ON show_selections(show_id)
    `);

    await runQuery(`
      CREATE INDEX IF NOT EXISTS idx_purchases_user_id ON purchases(user_id)
    `);

    await runQuery(`
      CREATE INDEX IF NOT EXISTS idx_purchases_show_id ON purchases(show_id)
    `);

    await runQuery(`
      CREATE INDEX IF NOT EXISTS idx_purchases_status ON purchases(payment_status)
    `);

    console.log('✅ Analytics tables created successfully!');
    console.log('Tables created:');
    console.log('- user_logins: Tracks all user login activity');
    console.log('- show_selections: Tracks show selections by users');
    console.log('- purchases: Tracks completed purchases');
    console.log('- Indexes created for optimal query performance');

  } catch (error) {
    console.error('❌ Error creating analytics tables:', error);
    throw error;
  }
}

// Run the migration if this file is executed directly
if (require.main === module) {
  createAnalyticsTables()
    .then(() => {
      console.log('Analytics tables migration completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Analytics tables migration failed:', error);
      process.exit(1);
    });
}

export default createAnalyticsTables;
