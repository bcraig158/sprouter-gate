import { Database } from 'sqlite';
import fs from 'fs';
import path from 'path';

const DB_PATH = process.env.DATABASE_PATH || './data/sprouter_events.db';

interface CSVStudent {
  student_id: string;
  teacher?: string;
  grade?: string;
  notes?: string;
}

function parseCSV(csvContent: string): CSVStudent[] {
  const lines = csvContent.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  const students: CSVStudent[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    const student: CSVStudent = {
      student_id: values[0] || '',
    };
    
    // Map other columns if they exist
    if (headers.includes('teacher') && values[1]) {
      student.teacher = values[1];
    }
    if (headers.includes('grade') && values[2]) {
      student.grade = values[2];
    }
    if (headers.includes('notes') && values[3]) {
      student.notes = values[3];
    }
    
    if (student.student_id) {
      students.push(student);
    }
  }
  
  return students;
}

async function importFromCSV(csvFilePath: string) {
  const db = new Database(DB_PATH);
  
  try {
    console.log(`Reading CSV file: ${csvFilePath}`);
    const csvContent = fs.readFileSync(csvFilePath, 'utf-8');
    const students = parseCSV(csvContent);
    
    console.log(`Found ${students.length} students in CSV file`);
    
    let importedCount = 0;
    let skippedCount = 0;
    
    for (const student of students) {
      // Generate household ID
      const householdId = `HH_${student.student_id}`;
      
      // Check if student already exists
      const existingStudent = await db.prepare('SELECT id FROM students WHERE student_id = ?').get(student.student_id);
      
      if (!existingStudent) {
        // Insert student
        await db.prepare(`
          INSERT INTO students (student_id, household_id) 
          VALUES (?, ?)
        `).run(student.student_id, householdId);
        
        // Insert household if it doesn't exist
        const existingHousehold = await db.prepare('SELECT id FROM households WHERE household_id = ?').get(householdId);
        
        if (!existingHousehold) {
          await db.prepare(`
            INSERT INTO households (household_id, volunteer_redeemed) 
            VALUES (?, FALSE)
          `).run(householdId);
        }
        
        console.log(`✓ Imported: ${student.student_id} (${student.teacher || 'No teacher'})`);
        importedCount++;
      } else {
        console.log(`- Skipped: ${student.student_id} (already exists)`);
        skippedCount++;
      }
    }
    
    console.log('\nImport Summary:');
    console.log(`✓ Imported: ${importedCount} students`);
    console.log(`- Skipped: ${skippedCount} students`);
    console.log(`Total processed: ${students.length} students`);
    
    // Display final counts
    const studentCount = await db.prepare('SELECT COUNT(*) as count FROM students').get();
    const householdCount = await db.prepare('SELECT COUNT(*) as count FROM households').get();
    
    console.log(`\nDatabase totals:`);
    console.log(`- Students: ${studentCount?.count || 0}`);
    console.log(`- Households: ${householdCount?.count || 0}`);
    
  } catch (error) {
    console.error('Error importing from CSV:', error);
    throw error;
  } finally {
    await db.close();
  }
}

async function main() {
  const csvFile = process.argv[2];
  
  if (!csvFile) {
    console.log('Usage: yarn ts-node src/scripts/csv-import.ts <csv-file-path>');
    console.log('Example: yarn ts-node src/scripts/csv-import.ts student-data.csv');
    console.log('');
    console.log('CSV format should be:');
    console.log('student_id,teacher,grade,notes');
    console.log('STU001,Ms. Smith,3rd,');
    console.log('STU002,Mr. Johnson,4th,');
    return;
  }
  
  if (!fs.existsSync(csvFile)) {
    console.error(`CSV file not found: ${csvFile}`);
    console.log('Please provide the correct path to your CSV file.');
    return;
  }
  
  try {
    await importFromCSV(csvFile);
    console.log('\n✅ Import completed successfully!');
  } catch (error) {
    console.error('\n❌ Import failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { importFromCSV, parseCSV };
