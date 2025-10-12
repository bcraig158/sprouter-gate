#!/usr/bin/env node

import { runQuery, getQuery } from '../db';
import setupDatabase from './setup-database';
import importRealStudents from './import-real-students';

async function completeSetup() {
  try {
    console.log('🚀 Starting complete Sprouter Gate setup...');
    console.log('=====================================');
    
    // Step 1: Setup base database
    console.log('\n📊 Step 1: Setting up base database...');
    await setupDatabase();
    
    // Step 2: Import real student data
    console.log('\n📚 Step 2: Importing real student data...');
    try {
      await importRealStudents();
    } catch (error) {
      console.log('⚠️  Real student import failed, but sample data is available');
      console.log('   You can manually import student data later using:');
      console.log('   npm run ts-node src/scripts/import-real-students.ts');
    }
    
    // Step 3: Verify final setup
    console.log('\n🔍 Step 3: Verifying final setup...');
    
    const studentCount = await getQuery<{ count: number }>('SELECT COUNT(*) as count FROM students');
    const householdCount = await getQuery<{ count: number }>('SELECT COUNT(*) as count FROM households');
    const volunteerCodeCount = await getQuery<{ count: number }>('SELECT COUNT(*) as count FROM volunteer_codes');
    
    console.log('\n📊 Final Database Status:');
    console.log(`   - Students: ${studentCount?.count || 0}`);
    console.log(`   - Households: ${householdCount?.count || 0}`);
    console.log(`   - Volunteer Codes: ${volunteerCodeCount?.count || 0}`);
    
    // Step 4: Display login credentials
    console.log('\n🔑 Available Login Credentials:');
    console.log('================================');
    
    console.log('\n📚 Student Login (use any of these Student IDs):');
    const students = await getQuery<{ student_id: string }[]>(
      'SELECT student_id FROM students ORDER BY student_id LIMIT 10'
    );
    
    if (students && students.length > 0) {
      students.forEach(student => {
        console.log(`   - Student ID: ${student.student_id}`);
      });
      if (students.length === 10) {
        console.log('   ... and more (check database for full list)');
      }
    } else {
      console.log('   - No students found in database');
    }
    
    console.log('\n👨‍💼 Volunteer Login:');
    console.log('   - Code: 518705, Email: biancaybalderas@gmail.com');
    console.log('   - Code: 908693, Email: Samantha.jackson12@hotmail.com');
    console.log('   - Code: 877604, Email: Debbieschairer@gmail.com');
    console.log('   ... and more (check volunteer-codes.json for full list)');
    
    console.log('\n🔧 Admin Login:');
    console.log('   - Code: 339933, Email: admin@maidu.com');
    
    console.log('\n✅ Complete setup finished successfully!');
    console.log('🎯 You can now test the application with the credentials above.');
    console.log('\n📝 Next steps:');
    console.log('   1. Start your backend server');
    console.log('   2. Start your frontend server');
    console.log('   3. Test login with the credentials above');
    console.log('   4. Check the admin analytics dashboard');
    
  } catch (error) {
    console.error('❌ Complete setup failed:', error);
    throw error;
  }
}

// Run the complete setup if this file is executed directly
if (require.main === module) {
  completeSetup()
    .then(() => {
      console.log('\n🎉 Complete setup finished successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Complete setup failed:', error);
      process.exit(1);
    });
}

export default completeSetup;
