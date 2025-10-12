#!/usr/bin/env node

import { runQuery, getQuery, allQuery, initDatabase } from '../db';
import { importStudents, addVolunteerCodes } from './import-students';
import createEnhancedAnalyticsTables from './enhanced-analytics-tables';

async function setupDatabase() {
  try {
    console.log('🚀 Setting up Sprouter Gate database...');
    
    // 1. Initialize base database tables
    console.log('📊 Initializing base database tables...');
    await initDatabase();
    
    // 2. Create enhanced analytics tables
    console.log('📈 Creating enhanced analytics tables...');
    await createEnhancedAnalyticsTables();
    
    // 3. Import sample students
    console.log('👨‍🎓 Importing sample students...');
    await importStudents();
    
    // 4. Add volunteer codes
    console.log('👨‍💼 Setting up volunteer codes...');
    await addVolunteerCodes();
    
    // 5. Verify setup
    console.log('✅ Verifying database setup...');
    
    const studentCount = await getQuery<{ count: number }>('SELECT COUNT(*) as count FROM students');
    const householdCount = await getQuery<{ count: number }>('SELECT COUNT(*) as count FROM households');
    const volunteerCodeCount = await getQuery<{ count: number }>('SELECT COUNT(*) as count FROM volunteer_codes');
    
    console.log(`📊 Database Setup Complete:`);
    console.log(`   - Students: ${studentCount?.count || 0}`);
    console.log(`   - Households: ${householdCount?.count || 0}`);
    console.log(`   - Volunteer Codes: ${volunteerCodeCount?.count || 0}`);
    
    // 6. Display sample login credentials
    console.log('\n🔑 Sample Login Credentials:');
    console.log('📚 Student Login:');
    console.log('   - Student ID: STU001');
    console.log('   - Student ID: STU002');
    console.log('   - Student ID: STU003');
    console.log('   - Student ID: STU004');
    console.log('   - Student ID: STU005');
    
    console.log('\n👨‍💼 Volunteer Login:');
    console.log('   - Code: 518705, Email: biancaybalderas@gmail.com');
    console.log('   - Code: 908693, Email: Samantha.jackson12@hotmail.com');
    console.log('   - Code: 877604, Email: Debbieschairer@gmail.com');
    
    console.log('\n🔧 Admin Login:');
    console.log('   - Code: 339933, Email: admin@maidu.com');
    
    console.log('\n✅ Database setup completed successfully!');
    console.log('🎯 You can now test login with the credentials above.');
    
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    throw error;
  }
}

// Run the setup if this file is executed directly
if (require.main === module) {
  setupDatabase()
    .then(() => {
      console.log('🎉 Database setup completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Database setup failed:', error);
      process.exit(1);
    });
}

export default setupDatabase;
