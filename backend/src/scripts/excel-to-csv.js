// Simple script to help convert Excel data to CSV format
// This script provides instructions for manual conversion

const fs = require('fs');
const path = require('path');

console.log('Excel to CSV Conversion Helper');
console.log('==============================');
console.log('');
console.log('To convert your Excel file to CSV format:');
console.log('');
console.log('1. Open the Excel file "Student ID numbers by Teacher .xlsx"');
console.log('2. Save it as CSV format:');
console.log('   - Go to File > Save As');
console.log('   - Choose "CSV (Comma delimited)" format');
console.log('   - Save as "student-data.csv" in the backend directory');
console.log('');
console.log('3. The CSV should have columns like:');
console.log('   student_id,teacher,grade,notes');
console.log('   STU001,Ms. Smith,3rd,');
console.log('   STU002,Mr. Johnson,4th,');
console.log('');
console.log('4. Once you have the CSV file, you can:');
console.log('   - Update the import-students.ts script to read from the CSV');
console.log('   - Or manually add the student IDs to the sampleStudents array');
console.log('');
console.log('Alternative: Manual Data Entry');
console.log('==============================');
console.log('');
console.log('If you prefer to enter the data manually, you can:');
console.log('1. Open the Excel file and copy the student IDs');
console.log('2. Update the sampleStudents array in import-students.ts');
console.log('3. Run: yarn ts-node src/scripts/import-students.ts import');
console.log('');

// Create a sample CSV template
const csvTemplate = `student_id,teacher,grade,notes
STU001,Ms. Smith,3rd,Example student
STU002,Mr. Johnson,4th,Example student
STU003,Ms. Davis,3rd,Example student
STU004,Mr. Wilson,5th,Example student
STU005,Ms. Brown,4th,Example student`;

const templatePath = path.join(__dirname, '..', '..', 'student-data-template.csv');
fs.writeFileSync(templatePath, csvTemplate);

console.log(`CSV template created at: ${templatePath}`);
console.log('You can use this as a starting point for your student data.');
