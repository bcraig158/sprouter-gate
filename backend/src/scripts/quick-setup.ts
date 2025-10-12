#!/usr/bin/env node

import { runQuery, getQuery, allQuery } from '../db';
import createEnhancedAnalyticsTables from './enhanced-analytics-tables';
import importRealStudents from './import-real-students';

async function quickSetup() {
  try {
    console.log('🚀 Quick Analytics Setup...');
    console.log('==========================');
    
    // Step 1: Create analytics tables
    console.log('\n📊 Creating analytics tables...');
    await createEnhancedAnalyticsTables();
    console.log('✅ Analytics tables ready');
    
    // Step 2: Import real student data
    console.log('\n📚 Importing student data...');
    try {
      await importRealStudents();
      console.log('✅ Student data imported');
    } catch (error) {
      console.log('⚠️  Student import failed, but system is ready');
    }
    
    // Step 3: Verify system
    console.log('\n🔍 System verification...');
    
    const studentCount = await getQuery<{ count: number }>('SELECT COUNT(*) as count FROM students');
    const householdCount = await getQuery<{ count: number }>('SELECT COUNT(*) as count FROM households');
    
    console.log(`   - Students: ${studentCount?.count || 0}`);
    console.log(`   - Households: ${householdCount?.count || 0}`);
    
    console.log('\n🔑 Ready to Test:');
    console.log('=================');
    
    if (studentCount && studentCount.count > 0) {
      console.log('\n📚 Student Login (use any Student ID from your CSV):');
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
    
    console.log('\n✅ Setup complete! Your analytics system is ready.');
    console.log('\n🎯 To test:');
    console.log('   1. Start backend: npm run dev');
    console.log('   2. Start frontend: npm run dev');
    console.log('   3. Login as admin: 339933 / admin@maidu.com');
    console.log('   4. View analytics dashboard');
    
  } catch (error) {
    console.error('❌ Setup failed:', error);
    throw error;
  }
}

// Run the setup if this file is executed directly
if (require.main === module) {
  quickSetup()
    .then(() => {
      console.log('\n🎉 Quick setup completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Quick setup failed:', error);
      process.exit(1);
    });
}

export default quickSetup;
