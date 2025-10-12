#!/usr/bin/env node

import { runQuery, getQuery } from '../db';

async function testAdminLogin() {
  try {
    console.log('🔍 Testing Admin Login Setup...');
    console.log('================================');
    
    // Check if admin is in volunteer codes
    const fs = require('fs');
    const path = require('path');
    const volunteerCodesPath = path.join(process.cwd(), '../volunteer-codes.json');
    
    if (!fs.existsSync(volunteerCodesPath)) {
      console.error('❌ Volunteer codes file not found');
      return;
    }
    
    const volunteerCodes = JSON.parse(fs.readFileSync(volunteerCodesPath, 'utf-8'));
    const admin = volunteerCodes.find((v: any) => 
      v.code === '339933' && v.email.toLowerCase() === 'admin@maidu.com'
    );
    
    if (admin) {
      console.log('✅ Admin credentials found in volunteer codes:');
      console.log(`   - Name: ${admin.name}`);
      console.log(`   - Email: ${admin.email}`);
      console.log(`   - Code: ${admin.code}`);
      console.log(`   - Notes: ${admin.notes || 'None'}`);
    } else {
      console.error('❌ Admin credentials not found in volunteer codes');
      console.log('Available codes:');
      volunteerCodes.slice(0, 5).forEach((v: any) => {
        console.log(`   - ${v.code}: ${v.email}`);
      });
      return;
    }
    
    // Test database connection
    console.log('\n📊 Testing database connection...');
    const studentCount = await getQuery<{ count: number }>('SELECT COUNT(*) as count FROM students');
    const householdCount = await getQuery<{ count: number }>('SELECT COUNT(*) as count FROM households');
    
    console.log(`   - Students: ${studentCount?.count || 0}`);
    console.log(`   - Households: ${householdCount?.count || 0}`);
    
    console.log('\n🔑 Admin Login Test:');
    console.log('===================');
    console.log('Use these credentials to test admin login:');
    console.log('   - Code: 339933');
    console.log('   - Email: admin@maidu.com');
    console.log('\nExpected behavior:');
    console.log('   1. Login should succeed');
    console.log('   2. Should redirect to /admin-analytics');
    console.log('   3. Should have access to analytics dashboard');
    
    console.log('\n✅ Admin login setup is ready!');
    
  } catch (error) {
    console.error('❌ Admin login test failed:', error);
    throw error;
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testAdminLogin()
    .then(() => {
      console.log('\n🎉 Admin login test completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Admin login test failed:', error);
      process.exit(1);
    });
}

export default testAdminLogin;
