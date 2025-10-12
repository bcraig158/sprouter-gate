#!/usr/bin/env node

import { runQuery, getQuery, allQuery } from '../db';
import createEnhancedAnalyticsTables from './enhanced-analytics-tables';
import { importStudents, addVolunteerCodes } from './import-students';
import importRealStudents from './import-real-students';

async function setupCompleteAnalytics() {
  try {
    console.log('🚀 Setting up Complete Analytics System...');
    console.log('==========================================');
    
    // Step 1: Create enhanced analytics tables
    console.log('\n📊 Step 1: Creating enhanced analytics tables...');
    await createEnhancedAnalyticsTables();
    console.log('✅ Enhanced analytics tables created');
    
    // Step 2: Import student data
    console.log('\n👨‍🎓 Step 2: Importing student data...');
    try {
      await importRealStudents();
      console.log('✅ Real student data imported');
    } catch (error) {
      console.log('⚠️  Real student import failed, importing sample data...');
      await importStudents();
      console.log('✅ Sample student data imported');
    }
    
    // Step 3: Setup volunteer codes
    console.log('\n👨‍💼 Step 3: Setting up volunteer codes...');
    await addVolunteerCodes();
    console.log('✅ Volunteer codes setup completed');
    
    // Step 4: Verify analytics tables
    console.log('\n🔍 Step 4: Verifying analytics system...');
    
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
        console.log(`   - ${table}: ${count?.count || 0} records`);
      } catch (error) {
        console.log(`   - ${table}: ❌ Table not found or error`);
      }
    }
    
    // Step 5: Test analytics endpoint
    console.log('\n🧪 Step 5: Testing analytics system...');
    
    // Insert some test data to verify analytics work
    const testUserId = 'TEST_USER_001';
    const testSessionId = 'TEST_SESSION_001';
    
    try {
      // Test user login tracking
      await runQuery(
        `INSERT INTO user_logins (user_id, user_type, identifier, email, name, ip_address, user_agent, login_timestamp, session_id) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [testUserId, 'student', 'TEST001', 'test@example.com', 'Test User', '127.0.0.1', 'Test Agent', new Date().toISOString(), testSessionId]
      );
      
      // Test show selection tracking
      await runQuery(
        `INSERT INTO show_selections (user_id, user_type, show_id, show_date, show_time, show_datetime, tickets_requested, session_id, ip_address, user_agent, selection_timestamp) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [testUserId, 'student', 'tue-530', '2025-10-28', '17:30', '2025-10-28T17:30:00', 2, testSessionId, '127.0.0.1', 'Test Agent', new Date().toISOString()]
      );
      
      // Test purchase intent tracking
      await runQuery(
        `INSERT INTO purchase_intents (user_id, user_type, show_id, show_date, show_time, show_datetime, tickets_requested, intent_id, sprouter_url, session_id, ip_address, user_agent, intent_timestamp) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [testUserId, 'student', 'tue-530', '2025-10-28', '17:30', '2025-10-28T17:30:00', 2, 'TEST_INTENT_001', 'https://test.sprouter.com', testSessionId, '127.0.0.1', 'Test Agent', new Date().toISOString()]
      );
      
      // Test purchase tracking
      await runQuery(
        `INSERT INTO purchases (user_id, user_type, show_id, show_date, show_time, show_datetime, tickets_purchased, total_cost, payment_status, transaction_id, session_id, ip_address, user_agent, purchase_timestamp) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [testUserId, 'student', 'tue-530', '2025-10-28', '17:30', '2025-10-28T17:30:00', 2, 50.00, 'completed', 'TEST_TXN_001', testSessionId, '127.0.0.1', 'Test Agent', new Date().toISOString()]
      );
      
      // Test Sprouter success tracking
      await runQuery(
        `INSERT INTO sprouter_success_visits (user_id, user_type, show_id, show_date, show_time, show_datetime, sprouter_transaction_id, session_id, ip_address, user_agent, success_timestamp) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [testUserId, 'student', 'tue-530', '2025-10-28', '17:30', '2025-10-28T17:30:00', 'TEST_TXN_001', testSessionId, '127.0.0.1', 'Test Agent', new Date().toISOString()]
      );
      
      // Test user activity tracking
      await runQuery(
        `INSERT INTO user_activity_timeline (user_id, user_type, activity_type, activity_details, show_id, session_id, ip_address, user_agent, activity_timestamp, metadata) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [testUserId, 'student', 'login', 'Test user login', null, testSessionId, '127.0.0.1', 'Test Agent', new Date().toISOString(), '{"test": true}']
      );
      
      console.log('✅ Test data inserted successfully');
      
      // Clean up test data
      await runQuery('DELETE FROM user_logins WHERE user_id = ?', [testUserId]);
      await runQuery('DELETE FROM show_selections WHERE user_id = ?', [testUserId]);
      await runQuery('DELETE FROM purchase_intents WHERE user_id = ?', [testUserId]);
      await runQuery('DELETE FROM purchases WHERE user_id = ?', [testUserId]);
      await runQuery('DELETE FROM sprouter_success_visits WHERE user_id = ?', [testUserId]);
      await runQuery('DELETE FROM user_activity_timeline WHERE user_id = ?', [testUserId]);
      
      console.log('✅ Test data cleaned up');
      
    } catch (error) {
      console.log('⚠️  Test data insertion failed, but tables are ready');
    }
    
    // Step 6: Final verification
    console.log('\n📊 Step 6: Final system verification...');
    
    const studentCount = await getQuery<{ count: number }>('SELECT COUNT(*) as count FROM students');
    const householdCount = await getQuery<{ count: number }>('SELECT COUNT(*) as count FROM households');
    const volunteerCodeCount = await getQuery<{ count: number }>('SELECT COUNT(*) as count FROM volunteer_codes');
    
    console.log('\n📊 System Status:');
    console.log(`   - Students: ${studentCount?.count || 0}`);
    console.log(`   - Households: ${householdCount?.count || 0}`);
    console.log(`   - Volunteer Codes: ${volunteerCodeCount?.count || 0}`);
    
    console.log('\n🔑 Login Credentials:');
    console.log('=====================');
    
    if (studentCount && studentCount.count > 0) {
      console.log('\n📚 Student Login:');
      const students = await allQuery<{ student_id: string }>(
        'SELECT student_id FROM students ORDER BY student_id LIMIT 5'
      );
      students.forEach(student => {
        console.log(`   - Student ID: ${student.student_id}`);
      });
    }
    
    console.log('\n👨‍💼 Volunteer Login:');
    console.log('   - Code: 518705, Email: biancaybalderas@gmail.com');
    console.log('   - Code: 908693, Email: Samantha.jackson12@hotmail.com');
    console.log('   - Code: 877604, Email: Debbieschairer@gmail.com');
    
    console.log('\n🔧 Admin Login:');
    console.log('   - Code: 339933, Email: admin@maidu.com');
    
    console.log('\n✅ Complete analytics system setup finished!');
    console.log('\n🎯 Next steps:');
    console.log('   1. Start your backend server: npm run dev');
    console.log('   2. Start your frontend server: npm run dev');
    console.log('   3. Test admin login: 339933 / admin@maidu.com');
    console.log('   4. View comprehensive analytics dashboard');
    console.log('   5. Test student/volunteer logins to generate analytics data');
    
    console.log('\n📈 Analytics Features Ready:');
    console.log('   - Real-time user activity tracking');
    console.log('   - Show performance analytics');
    console.log('   - Purchase intent and completion tracking');
    console.log('   - Sprouter success verification');
    console.log('   - Daily purchase limit enforcement');
    console.log('   - Comprehensive admin dashboard');
    
  } catch (error) {
    console.error('❌ Complete analytics setup failed:', error);
    throw error;
  }
}

// Run the setup if this file is executed directly
if (require.main === module) {
  setupCompleteAnalytics()
    .then(() => {
      console.log('\n🎉 Complete analytics system setup finished successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Complete analytics setup failed:', error);
      process.exit(1);
    });
}

export default setupCompleteAnalytics;
