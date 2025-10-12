#!/usr/bin/env node

import { allQuery } from '../db';
import fs from 'fs';
import path from 'path';

async function extractProductionData() {
  try {
    console.log('📊 Extracting production data...');
    
    // Get all students from database
    const students = await allQuery<{ student_id: string; household_id: string }>(
      'SELECT student_id, household_id FROM students ORDER BY student_id'
    );
    
    // Get all volunteer codes from JSON
    const volunteerCodesPath = path.join(process.cwd(), '../volunteer-codes.json');
    const volunteerCodes = JSON.parse(fs.readFileSync(volunteerCodesPath, 'utf-8'));
    
    console.log(`✅ Found ${students.length} students in database`);
    console.log(`✅ Found ${volunteerCodes.length} volunteer codes in JSON`);
    
    // Generate JavaScript arrays for production function
    const studentsArray = students.map(s => 
      `  { student_id: '${s.student_id}', household_id: '${s.household_id}' }`
    ).join(',\n');
    
    const volunteerArray = volunteerCodes.map(v => 
      `  { name: "${v.name}", email: "${v.email}", code: "${v.code}"${v.notes ? `, notes: "${v.notes}"` : ''} }`
    ).join(',\n');
    
    // Create the production data file
    const productionData = `// Production Data for Netlify Function
// Generated from database and volunteer-codes.json

export const students = [
${studentsArray}
];

export const volunteerCodes = [
${volunteerArray}
];

export const studentCount = ${students.length};
export const volunteerCount = ${volunteerCodes.length};
`;
    
    fs.writeFileSync(
      path.join(process.cwd(), '../netlify/functions/production-data.js'),
      productionData
    );
    
    console.log('✅ Production data extracted successfully!');
    console.log(`📊 Summary:`);
    console.log(`   - Students: ${students.length}`);
    console.log(`   - Volunteers: ${volunteerCodes.length}`);
    console.log(`   - Admin: ${volunteerCodes.find(v => v.code === '339933') ? '✅ Found' : '❌ Missing'}`);
    
  } catch (error) {
    console.error('❌ Error extracting production data:', error);
    throw error;
  }
}

// Run the extraction if this file is executed directly
if (require.main === module) {
  extractProductionData()
    .then(() => {
      console.log('✅ Production data extraction completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Production data extraction failed:', error);
      process.exit(1);
    });
}

export default extractProductionData;
