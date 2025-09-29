import { Database } from 'sqlite';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcrypt';

const DB_PATH = process.env.DATABASE_PATH || './data/sprouter_events.db';

interface StudentData {
  studentId: string;
  teacher?: string;
  grade?: string;
  notes?: string;
}

// Sample student data - replace with actual data from Excel
const sampleStudents: StudentData[] = [
  { studentId: 'STU001', teacher: 'Ms. Smith', grade: '3rd' },
  { studentId: 'STU002', teacher: 'Mr. Johnson', grade: '4th' },
  { studentId: 'STU003', teacher: 'Ms. Davis', grade: '3rd' },
  { studentId: 'STU004', teacher: 'Mr. Wilson', grade: '5th' },
  { studentId: 'STU005', teacher: 'Ms. Brown', grade: '4th' },
  // Add more students as needed
];

async function importStudents() {
  const db = new Database(DB_PATH);
  
  try {
    console.log('Starting student import...');
    
    for (const student of sampleStudents) {
      // Generate household ID (in a real scenario, this might be based on family relationships)
      const householdId = `HH_${student.studentId}`;
      
      // Check if student already exists
      const existingStudent = await db.get('SELECT id FROM students WHERE student_id = ?', [student.studentId]);
      
      if (!existingStudent) {
        // Insert student
        await db.run(`
          INSERT INTO students (student_id, household_id) 
          VALUES (?, ?)
        `, [student.studentId, householdId]);
        
        // Insert household if it doesn't exist
        const existingHousehold = await db.get('SELECT id FROM households WHERE household_id = ?', [householdId]);
        
        if (!existingHousehold) {
          await db.run(`
            INSERT INTO households (household_id, volunteer_redeemed) 
            VALUES (?, FALSE)
          `, [householdId]);
        }
        
        console.log(`Imported student: ${student.studentId} (Household: ${householdId})`);
      } else {
        console.log(`Student ${student.studentId} already exists, skipping...`);
      }
    }
    
    console.log('Student import completed successfully!');
    
    // Display summary
    const studentCount = await db.get('SELECT COUNT(*) as count FROM students');
    const householdCount = await db.get('SELECT COUNT(*) as count FROM households');
    
    console.log(`Total students: ${studentCount?.count || 0}`);
    console.log(`Total households: ${householdCount?.count || 0}`);
    
  } catch (error) {
    console.error('Error importing students:', error);
    throw error;
  } finally {
    await db.close();
  }
}

// Function to add volunteer codes
async function addVolunteerCodes() {
  const db = new Database(DB_PATH);
  
  try {
    const volunteerCodes = [
      'VOLUNTEER2024',
      'HELPER2024', 
      'SUPPORT2024',
      'TEACHER2024',
      'PARENT2024'
    ];
    
    for (const code of volunteerCodes) {
      try {
        await db.run(`
          INSERT OR IGNORE INTO volunteer_codes (code) 
          VALUES (?)
        `, [code]);
        console.log(`Added volunteer code: ${code}`);
      } catch (error) {
        console.log(`Volunteer code ${code} already exists`);
      }
    }
    
    console.log('Volunteer codes setup completed!');
  } catch (error) {
    console.error('Error setting up volunteer codes:', error);
    throw error;
  } finally {
    await db.close();
  }
}

// Function to create a CSV template for student data
function createCSVTemplate() {
  const csvContent = `student_id,teacher,grade,notes
STU001,Ms. Smith,3rd,Example student
STU002,Mr. Johnson,4th,Example student
STU003,Ms. Davis,3rd,Example student
STU004,Mr. Wilson,5th,Example student
STU005,Ms. Brown,4th,Example student`;

  const csvPath = path.join(process.cwd(), 'student-data-template.csv');
  fs.writeFileSync(csvPath, csvContent);
  console.log(`CSV template created at: ${csvPath}`);
  console.log('Please update this file with your actual student data and run the import script.');
}

// Main execution
async function main() {
  const command = process.argv[2];
  
  switch (command) {
    case 'import':
      await importStudents();
      break;
    case 'volunteers':
      await addVolunteerCodes();
      break;
    case 'template':
      createCSVTemplate();
      break;
    case 'all':
      await addVolunteerCodes();
      await importStudents();
      break;
    default:
      console.log('Usage:');
      console.log('  yarn ts-node src/scripts/import-students.ts import     - Import sample students');
      console.log('  yarn ts-node src/scripts/import-students.ts volunteers - Add volunteer codes');
      console.log('  yarn ts-node src/scripts/import-students.ts template   - Create CSV template');
      console.log('  yarn ts-node src/scripts/import-students.ts all        - Run all setup');
      break;
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { importStudents, addVolunteerCodes, createCSVTemplate };
