#!/usr/bin/env node

import { getQuery, allQuery } from '../db';

async function checkDatabase() {
  try {
    console.log('🔍 Checking Sprouter Gate database status...');
    console.log('==========================================');
    
    // Check students
    const studentCount = await getQuery<{ count: number }>('SELECT COUNT(*) as count FROM students');
    console.log(`📚 Students: ${studentCount?.count || 0}`);
    
    if (studentCount && studentCount.count > 0) {
      const sampleStudents = await allQuery<{ student_id: string }>(
        'SELECT student_id FROM students ORDER BY student_id LIMIT 5'
      );
      console.log('   Sample Student IDs:');
      sampleStudents.forEach(student => {
        console.log(`   - ${student.student_id}`);
      });
    }
    
    // Check households
    const householdCount = await getQuery<{ count: number }>('SELECT COUNT(*) as count FROM households');
    console.log(`🏠 Households: ${householdCount?.count || 0}`);
    
    // Check volunteer codes
    const volunteerCodeCount = await getQuery<{ count: number }>('SELECT COUNT(*) as count FROM volunteer_codes');
    console.log(`👨‍💼 Volunteer Codes: ${volunteerCodeCount?.count || 0}`);
    
    // Check enhanced analytics tables
    try {
      const loginCount = await getQuery<{ count: number }>('SELECT COUNT(*) as count FROM user_logins');
      const selectionCount = await getQuery<{ count: number }>('SELECT COUNT(*) as count FROM show_selections');
      const purchaseCount = await getQuery<{ count: number }>('SELECT COUNT(*) as count FROM purchases');
      
      console.log(`📊 Analytics Tables:`);
      console.log(`   - User Logins: ${loginCount?.count || 0}`);
      console.log(`   - Show Selections: ${selectionCount?.count || 0}`);
      console.log(`   - Purchases: ${purchaseCount?.count || 0}`);
    } catch (error) {
      console.log('📊 Analytics Tables: Not created yet');
    }
    
    console.log('\n🔑 Available Login Credentials:');
    console.log('================================');
    
    if (studentCount && studentCount.count > 0) {
      console.log('\n📚 Student Login:');
      const students = await allQuery<{ student_id: string }>(
        'SELECT student_id FROM students ORDER BY student_id LIMIT 10'
      );
      students.forEach(student => {
        console.log(`   - Student ID: ${student.student_id}`);
      });
    } else {
      console.log('\n📚 Student Login: No students found');
      console.log('   Run: npm run ts-node src/scripts/import-real-students.ts');
    }
    
    console.log('\n👨‍💼 Volunteer Login:');
    console.log('   - Code: 518705, Email: biancaybalderas@gmail.com');
    console.log('   - Code: 908693, Email: Samantha.jackson12@hotmail.com');
    console.log('   - Code: 877604, Email: Debbieschairer@gmail.com');
    
    console.log('\n🔧 Admin Login:');
    console.log('   - Code: 339933, Email: admin@maidu.com');
    
    console.log('\n✅ Database check completed!');
    
  } catch (error) {
    console.error('❌ Database check failed:', error);
    console.log('\n💡 Try running the complete setup:');
    console.log('   npm run ts-node src/scripts/complete-setup.ts');
    throw error;
  }
}

// Run the check if this file is executed directly
if (require.main === module) {
  checkDatabase()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Database check failed:', error);
      process.exit(1);
    });
}

export default checkDatabase;
