#!/usr/bin/env node

import { runQuery, getQuery, allQuery, initDatabase } from '../db';
import createEnhancedAnalyticsTables from './enhanced-analytics-tables';
import fs from 'fs';
import path from 'path';

async function consolidateDatabase() {
  try {
    console.log('🔄 Consolidating database setup...');
    
    // 1. Initialize base database
    console.log('📊 Initializing base database tables...');
    await initDatabase();
    
    // 2. Create enhanced analytics tables
    console.log('📈 Creating enhanced analytics tables...');
    await createEnhancedAnalyticsTables();
    
    // 3. Load volunteer codes from JSON file into database
    console.log('👨‍💼 Loading volunteer codes from JSON...');
    const volunteerCodesPath = path.join(process.cwd(), '../volunteer-codes.json');
    
    if (fs.existsSync(volunteerCodesPath)) {
      const volunteerCodes = JSON.parse(fs.readFileSync(volunteerCodesPath, 'utf-8'));
      
      for (const volunteer of volunteerCodes) {
        await runQuery(`
          INSERT OR REPLACE INTO volunteer_codes (code, is_used, used_at, created_at) 
          VALUES (?, ?, ?, ?)
        `, [
          volunteer.code,
          false, // is_used
          null,  // used_at
          new Date().toISOString()
        ]);
      }
      
      console.log(`✅ Loaded ${volunteerCodes.length} volunteer codes from JSON`);
    } else {
      console.log('⚠️  volunteer-codes.json not found, skipping volunteer code import');
    }
    
    // 4. Verify database setup
    console.log('✅ Verifying database setup...');
    
    const studentCount = await getQuery<{ count: number }>('SELECT COUNT(*) as count FROM students');
    const householdCount = await getQuery<{ count: number }>('SELECT COUNT(*) as count FROM households');
    const volunteerCodeCount = await getQuery<{ count: number }>('SELECT COUNT(*) as count FROM volunteer_codes');
    const userLoginCount = await getQuery<{ count: number }>('SELECT COUNT(*) as count FROM user_logins');
    
    console.log(`📊 Database Status:`);
    console.log(`   - Students: ${studentCount?.count || 0}`);
    console.log(`   - Households: ${householdCount?.count || 0}`);
    console.log(`   - Volunteer Codes: ${volunteerCodeCount?.count || 0}`);
    console.log(`   - User Logins: ${userLoginCount?.count || 0}`);
    
    // 5. Test admin credentials
    console.log('\n🔑 Testing Admin Credentials:');
    const adminCode = await getQuery<{ code: string }>('SELECT code FROM volunteer_codes WHERE code = ?', ['339933']);
    
    if (adminCode) {
      console.log('✅ Admin code 339933 found in database');
    } else {
      console.log('❌ Admin code 339933 NOT found in database');
    }
    
    console.log('\n🎉 Database consolidation complete!');
    console.log('\n📝 Next steps:');
    console.log('1. Start the backend server: npm run dev');
    console.log('2. Start the frontend server: npm run dev');
    console.log('3. Test admin login with: 339933 / admin@maidu.com');
    
  } catch (error) {
    console.error('❌ Database consolidation error:', error);
    throw error;
  }
}

// Run the consolidation if this file is executed directly
if (require.main === module) {
  consolidateDatabase()
    .then(() => {
      console.log('✅ Database consolidation completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Database consolidation failed:', error);
      process.exit(1);
    });
}

export default consolidateDatabase;
