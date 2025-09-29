import { open } from 'sqlite';
import fs from 'fs';
import path from 'path';

const DB_PATH = process.env.DATABASE_PATH || './data/sprouter_events.db';

interface StudentRecord {
  studentId: string;
  teacher: string;
  grade?: string;
}

function parseTeacherCSV(csvFilePath: string): StudentRecord[] {
  const content = fs.readFileSync(csvFilePath, 'utf-8');
  const lines = content.trim().split('\n');
  
  const students: StudentRecord[] = [];
  let currentTeacher = '';
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // Check if this line is a teacher name (contains letters, numbers, and possibly hyphens)
    // Updated regex to include numbers for teachers like "1-Dessling", "2-Gillespe", etc.
    if (/^[A-Za-z0-9-]+$/.test(trimmedLine) && !/^\d+$/.test(trimmedLine)) {
      currentTeacher = trimmedLine;
      console.log(`Found teacher: ${currentTeacher}`);
      continue;
    }
    
    // Check if this line is a student ID (numeric)
    if (/^\d+$/.test(trimmedLine)) {
      if (currentTeacher) {
        students.push({
          studentId: trimmedLine,
          teacher: currentTeacher,
          grade: extractGradeFromTeacher(currentTeacher)
        });
      }
    }
  }
  
  return students;
}

function extractGradeFromTeacher(teacher: string): string {
  // Extract grade from teacher name
  if (teacher.startsWith('TK-')) return 'TK';
  if (teacher.startsWith('K-')) return 'K';
  if (teacher.startsWith('1-')) return '1st';
  if (teacher.startsWith('2-')) return '2nd';
  if (teacher.startsWith('3-')) return '3rd';
  if (teacher.startsWith('4-')) return '4th';
  if (teacher.startsWith('5-')) return '5th';
  return 'Unknown';
}

async function importFromTeacherCSV(csvFilePath: string) {
  const db = await open({
    filename: DB_PATH,
    driver: require('sqlite3').Database
  });
  
  try {
    console.log(`Reading CSV file: ${csvFilePath}`);
    const students = parseTeacherCSV(csvFilePath);
    
    console.log(`Found ${students.length} students in CSV file`);
    console.log(`Teachers: ${[...new Set(students.map(s => s.teacher))].join(', ')}`);
    
    let importedCount = 0;
    let skippedCount = 0;
    
    for (const student of students) {
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
        
        console.log(`✓ Imported: ${student.studentId} (${student.teacher}, ${student.grade})`);
        importedCount++;
      } else {
        console.log(`- Skipped: ${student.studentId} (already exists)`);
        skippedCount++;
      }
    }
    
    console.log('\n📊 Import Summary:');
    console.log(`✓ Imported: ${importedCount} students`);
    console.log(`- Skipped: ${skippedCount} students`);
    console.log(`Total processed: ${students.length} students`);
    
    // Display summary by teacher
    const teacherCounts = students.reduce((acc, student) => {
      acc[student.teacher] = (acc[student.teacher] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log('\n👥 Students by Teacher:');
    Object.entries(teacherCounts).forEach(([teacher, count]) => {
      console.log(`  ${teacher}: ${count} students`);
    });
    
    // Display final counts
    const studentCount = await db.get('SELECT COUNT(*) as count FROM students');
    const householdCount = await db.get('SELECT COUNT(*) as count FROM households');
    
    console.log(`\n📈 Database totals:`);
    console.log(`- Students: ${studentCount?.count || 0}`);
    console.log(`- Households: ${householdCount?.count || 0}`);
    
  } catch (error) {
    console.error('Error importing from CSV:', error);
    throw error;
  } finally {
    await db.close();
  }
}

async function addVolunteerCodes() {
  const db = await open({
    filename: DB_PATH,
    driver: require('sqlite3').Database
  });
  
  try {
    const volunteerCodes = [
      'VOLUNTEER2024',
      'HELPER2024', 
      'SUPPORT2024',
      'TEACHER2024',
      'PARENT2024',
      'TK2024',
      'K2024',
      '1ST2024',
      '2ND2024',
      '3RD2024'
    ];
    
    for (const code of volunteerCodes) {
      try {
        await db.run(`
          INSERT OR IGNORE INTO volunteer_codes (code) 
          VALUES (?)
        `, [code]);
        console.log(`✓ Added volunteer code: ${code}`);
      } catch (error) {
        console.log(`- Volunteer code ${code} already exists`);
      }
    }
    
    console.log('🎉 Volunteer codes setup completed!');
  } catch (error) {
    console.error('Error setting up volunteer codes:', error);
    throw error;
  } finally {
    await db.close();
  }
}

async function main() {
  const csvFile = process.argv[2];
  
  if (!csvFile) {
    console.log('Usage: yarn ts-node src/scripts/import-teacher-csv.ts <csv-file-path>');
    console.log('Example: yarn ts-node src/scripts/import-teacher-csv.ts "Student ID numbers by Teacher  - Sheet1.csv"');
    console.log('');
    console.log('This script expects a CSV file with:');
    console.log('- Teacher names (like "TK-Schofield", "K-Hagman")');
    console.log('- Student ID numbers listed under each teacher');
    return;
  }
  
  if (!fs.existsSync(csvFile)) {
    console.error(`❌ CSV file not found: ${csvFile}`);
    console.log('Please provide the correct path to your CSV file.');
    return;
  }
  
  try {
    console.log('🚀 Starting student import process...\n');
    
    // First, add volunteer codes
    console.log('📝 Setting up volunteer codes...');
    await addVolunteerCodes();
    console.log('');
    
    // Then import students
    console.log('👥 Importing students...');
    await importFromTeacherCSV(csvFile);
    
    console.log('\n✅ Import completed successfully!');
    console.log('\n🎯 Next steps:');
    console.log('1. Test the backend server: yarn dev');
    console.log('2. Test login with any student ID from the CSV');
    console.log('3. Start the frontend: cd ../frontend && yarn dev');
    
  } catch (error) {
    console.error('\n❌ Import failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { importFromTeacherCSV, parseTeacherCSV, addVolunteerCodes };
