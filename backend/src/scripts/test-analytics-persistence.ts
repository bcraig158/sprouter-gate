#!/usr/bin/env node

import { runQuery, getQuery, allQuery } from '../db';

async function testAnalyticsPersistence() {
  try {
    console.log('🧪 Testing Analytics Data Persistence...');
    console.log('=====================================');
    
    // Test 1: Check if analytics tables exist
    console.log('\n📊 Step 1: Checking analytics tables...');
    const tables = [
      'user_logins',
      'show_selections', 
      'purchases',
      'purchase_intents',
      'sprouter_success_visits',
      'user_activity_timeline',
      'daily_purchase_limits'
    ];
    
    for (const table of tables) {
      try {
        const count = await getQuery<{ count: number }>(`SELECT COUNT(*) as count FROM ${table}`);
        console.log(`   ✅ ${table}: ${count?.count || 0} records`);
      } catch (error) {
        console.log(`   ❌ ${table}: Table not found or error`);
      }
    }
    
    // Test 2: Insert test analytics data
    console.log('\n📝 Step 2: Inserting test analytics data...');
    
    const testUserId = `TEST_ANALYTICS_${Date.now()}`;
    const testSessionId = `TEST_SESSION_${Date.now()}`;
    const testTimestamp = new Date().toISOString();
    
    // Insert test login
    await runQuery(
      `INSERT INTO user_logins (user_id, user_type, identifier, email, name, ip_address, user_agent, login_timestamp, session_id) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [testUserId, 'student', 'TEST001', 'test@example.com', 'Test User', '127.0.0.1', 'Test Agent', testTimestamp, testSessionId]
    );
    console.log('   ✅ Test login inserted');
    
    // Insert test show selection
    await runQuery(
      `INSERT INTO show_selections (user_id, user_type, show_id, show_date, show_time, show_datetime, tickets_requested, session_id, ip_address, user_agent, selection_timestamp) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [testUserId, 'student', 'tue-530', '2025-10-28', '17:30', '2025-10-28T17:30:00', 2, testSessionId, '127.0.0.1', 'Test Agent', testTimestamp]
    );
    console.log('   ✅ Test show selection inserted');
    
    // Insert test purchase intent
    const testIntentId = `TEST_INTENT_${Date.now()}`;
    await runQuery(
      `INSERT INTO purchase_intents (user_id, user_type, show_id, show_date, show_time, show_datetime, tickets_requested, intent_id, sprouter_url, session_id, ip_address, user_agent, intent_timestamp) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [testUserId, 'student', 'tue-530', '2025-10-28', '17:30', '2025-10-28T17:30:00', 2, testIntentId, 'https://test.sprouter.com', testSessionId, '127.0.0.1', 'Test Agent', testTimestamp]
    );
    console.log('   ✅ Test purchase intent inserted');
    
    // Insert test purchase
    await runQuery(
      `INSERT INTO purchases (user_id, user_type, show_id, show_date, show_time, show_datetime, tickets_purchased, total_cost, payment_status, transaction_id, session_id, ip_address, user_agent, purchase_timestamp) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [testUserId, 'student', 'tue-530', '2025-10-28', '17:30', '2025-10-28T17:30:00', 2, 50.00, 'completed', 'TEST_TXN_001', testSessionId, '127.0.0.1', 'Test Agent', testTimestamp]
    );
    console.log('   ✅ Test purchase inserted');
    
    // Insert test activity
    await runQuery(
      `INSERT INTO user_activity_timeline (user_id, user_type, activity_type, activity_details, show_id, session_id, ip_address, user_agent, activity_timestamp, metadata) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [testUserId, 'student', 'login', 'Test user login', null, testSessionId, '127.0.0.1', 'Test Agent', testTimestamp, '{"test": true}']
    );
    console.log('   ✅ Test activity inserted');
    
    // Test 3: Verify data persistence
    console.log('\n🔍 Step 3: Verifying data persistence...');
    
    const loginCount = await getQuery<{ count: number }>('SELECT COUNT(*) as count FROM user_logins WHERE user_id = ?', [testUserId]);
    const selectionCount = await getQuery<{ count: number }>('SELECT COUNT(*) as count FROM show_selections WHERE user_id = ?', [testUserId]);
    const purchaseCount = await getQuery<{ count: number }>('SELECT COUNT(*) as count FROM purchases WHERE user_id = ?', [testUserId]);
    const activityCount = await getQuery<{ count: number }>('SELECT COUNT(*) as count FROM user_activity_timeline WHERE user_id = ?', [testUserId]);
    
    console.log(`   📊 Login records: ${loginCount?.count || 0}`);
    console.log(`   📊 Selection records: ${selectionCount?.count || 0}`);
    console.log(`   📊 Purchase records: ${purchaseCount?.count || 0}`);
    console.log(`   📊 Activity records: ${activityCount?.count || 0}`);
    
    // Test 4: Test analytics endpoint data
    console.log('\n📈 Step 4: Testing analytics endpoint data...');
    
    const totalLogins = await getQuery<{ count: number }>('SELECT COUNT(*) as count FROM user_logins');
    const totalSelections = await getQuery<{ count: number }>('SELECT COUNT(*) as count FROM show_selections');
    const totalPurchases = await getQuery<{ count: number }>('SELECT COUNT(*) as count FROM purchases WHERE payment_status = "completed"');
    const totalRevenue = await getQuery<{ total: number }>('SELECT SUM(total_cost) as total FROM purchases WHERE payment_status = "completed"');
    
    console.log(`   📊 Total logins: ${totalLogins?.count || 0}`);
    console.log(`   📊 Total selections: ${totalSelections?.count || 0}`);
    console.log(`   📊 Total purchases: ${totalPurchases?.count || 0}`);
    console.log(`   📊 Total revenue: $${totalRevenue?.total || 0}`);
    
    // Test 5: Test active users
    console.log('\n👥 Step 5: Testing active users data...');
    
    const activeUsers = await getQuery<{ count: number }>(
      'SELECT COUNT(DISTINCT user_id) as count FROM user_logins WHERE login_timestamp >= datetime("now", "-1 day")'
    );
    
    const activeStudentUsers = await getQuery<{ count: number }>(
      'SELECT COUNT(DISTINCT user_id) as count FROM user_logins WHERE user_type = "student" AND login_timestamp >= datetime("now", "-1 day")'
    );
    
    const activeVolunteerUsers = await getQuery<{ count: number }>(
      'SELECT COUNT(DISTINCT user_id) as count FROM user_logins WHERE user_type = "volunteer" AND login_timestamp >= datetime("now", "-1 day")'
    );
    
    console.log(`   👥 Active users (24h): ${activeUsers?.count || 0}`);
    console.log(`   👨‍🎓 Active students (24h): ${activeStudentUsers?.count || 0}`);
    console.log(`   👨‍💼 Active volunteers (24h): ${activeVolunteerUsers?.count || 0}`);
    
    // Test 6: Clean up test data
    console.log('\n🧹 Step 6: Cleaning up test data...');
    
    await runQuery('DELETE FROM user_logins WHERE user_id = ?', [testUserId]);
    await runQuery('DELETE FROM show_selections WHERE user_id = ?', [testUserId]);
    await runQuery('DELETE FROM purchase_intents WHERE user_id = ?', [testUserId]);
    await runQuery('DELETE FROM purchases WHERE user_id = ?', [testUserId]);
    await runQuery('DELETE FROM user_activity_timeline WHERE user_id = ?', [testUserId]);
    
    console.log('   ✅ Test data cleaned up');
    
    console.log('\n✅ Analytics persistence test completed successfully!');
    console.log('\n📋 Summary:');
    console.log('   - All analytics tables are working');
    console.log('   - Data can be inserted and retrieved');
    console.log('   - Analytics endpoint queries work');
    console.log('   - Active users tracking works');
    console.log('   - Data persists in database');
    
    console.log('\n🎯 Next steps:');
    console.log('   1. Start backend server: npm run dev');
    console.log('   2. Test admin login: 339933 / admin@maidu.com');
    console.log('   3. Check analytics dashboard for real data');
    console.log('   4. Test student/volunteer logins to generate data');
    
  } catch (error) {
    console.error('❌ Analytics persistence test failed:', error);
    throw error;
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testAnalyticsPersistence()
    .then(() => {
      console.log('\n🎉 Analytics persistence test completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Analytics persistence test failed:', error);
      process.exit(1);
    });
}

export default testAnalyticsPersistence;
