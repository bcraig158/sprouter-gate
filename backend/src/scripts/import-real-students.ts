#!/usr/bin/env node

import { runQuery, getQuery } from '../db';
import fs from 'fs';
import path from 'path';

interface StudentRecord {
  teacher: string;
  studentId: string;
}

async function importRealStudents() {
  try {
    console.log('📚 Importing real student data...');
    
    const csvPath = path.join(process.cwd(), '../Student ID numbers by Teacher  - Sheet1.csv');
    
    if (!fs.existsSync(csvPath)) {
      console.error('❌ Student CSV file not found at:', csvPath);
      console.log('Please ensure the CSV file is in the project root directory.');
      return;
    }
    
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const lines = csvContent.split('\n').filter(line => line.trim());
    
    let currentTeacher = '';
    let importedCount = 0;
    let skippedCount = 0;
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Skip empty lines
      if (!trimmedLine) continue;
      
      // Check if this line is a teacher name (contains letters and possibly hyphens)
      if (trimmedLine.match(/^[A-Za-z-]+$/)) {
        currentTeacher = trimmedLine;
        console.log(`📖 Processing teacher: ${currentTeacher}`);
        continue;
      }
      
      // Check if this line is a student ID (numeric)
      if (trimmedLine.match(/^\d+$/)) {
        const studentId = trimmedLine;
        
        // Check if student already exists
        const existingStudent = await getQuery<{ id: number }>(
          'SELECT id FROM students WHERE student_id = ?',
          [studentId]
        );
        
        if (existingStudent) {
          console.log(`⏭️  Student ${studentId} already exists, skipping...`);
          skippedCount++;
          continue;
        }
        
        // Generate household ID
        const householdId = `HH_${studentId}`;
        
        try {
          // Insert student
          await runQuery(
            'INSERT INTO students (student_id, household_id) VALUES (?, ?)',
            [studentId, householdId]
          );
          
          // Insert household if it doesn't exist
          const existingHousehold = await getQuery<{ id: number }>(
            'SELECT id FROM households WHERE household_id = ?',
            [householdId]
          );
          
          if (!existingHousehold) {
            await runQuery(
              'INSERT INTO households (household_id, volunteer_redeemed) VALUES (?, FALSE)',
              [householdId]
            );
          }
          
          console.log(`✅ Imported student ${studentId} (Teacher: ${currentTeacher})`);
          importedCount++;
          
        } catch (error) {
          console.error(`❌ Error importing student ${studentId}:`, error);
        }
      }
    }
    
    // Display summary
    const totalStudents = await getQuery<{ count: number }>('SELECT COUNT(*) as count FROM students');
    const totalHouseholds = await getQuery<{ count: number }>('SELECT COUNT(*) as count FROM households');
    
    console.log('\n📊 Import Summary:');
    console.log(`   - New students imported: ${importedCount}`);
    console.log(`   - Students skipped (already exist): ${skippedCount}`);
    console.log(`   - Total students in database: ${totalStudents?.count || 0}`);
    console.log(`   - Total households in database: ${totalHouseholds?.count || 0}`);
    
    console.log('\n🔑 Sample Student IDs for testing:');
    const sampleStudents = await getQuery<{ student_id: string }[]>(
      'SELECT student_id FROM students ORDER BY student_id LIMIT 10'
    );
    
    if (sampleStudents && sampleStudents.length > 0) {
      sampleStudents.forEach(student => {
        console.log(`   - Student ID: ${student.student_id}`);
      });
    }
    
    console.log('\n✅ Real student data import completed successfully!');
    
  } catch (error) {
    console.error('❌ Error importing real students:', error);
    throw error;
  }
}

// Run the import if this file is executed directly
if (require.main === module) {
  importRealStudents()
    .then(() => {
      console.log('🎉 Real student import completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Real student import failed:', error);
      process.exit(1);
    });
}

export default importRealStudents;
