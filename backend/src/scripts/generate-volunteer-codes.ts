import fs from 'fs';
import path from 'path';

interface Volunteer {
  name: string;
  email: string;
  notes?: string;
}

interface VolunteerWithCode extends Volunteer {
  code: string;
}

// Generate a random 6-digit code
function generateVolunteerCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Read and parse the volunteer CSV file
function parseVolunteerCSV(csvContent: string): Volunteer[] {
  const lines = csvContent.trim().split('\n');
  const volunteers: Volunteer[] = [];
  
  for (const line of lines) {
    const [name, email, notes] = line.split(',').map(field => field.trim());
    if (name && email) {
      volunteers.push({
        name,
        email,
        notes: notes || undefined
      });
    }
  }
  
  return volunteers;
}

// Generate codes for all volunteers
function generateVolunteerCodes(volunteers: Volunteer[]): VolunteerWithCode[] {
  const usedCodes = new Set<string>();
  const volunteersWithCodes: VolunteerWithCode[] = [];
  
  for (const volunteer of volunteers) {
    let code: string;
    do {
      code = generateVolunteerCode();
    } while (usedCodes.has(code));
    
    usedCodes.add(code);
    volunteersWithCodes.push({
      ...volunteer,
      code
    });
  }
  
  return volunteersWithCodes;
}

// Generate CSV output with codes
function generateCSVOutput(volunteersWithCodes: VolunteerWithCode[]): string {
  const header = 'Name,Email,Volunteer Code,Notes';
  const rows = volunteersWithCodes.map(volunteer => 
    `${volunteer.name},${volunteer.email},${volunteer.code},${volunteer.notes || ''}`
  );
  
  return [header, ...rows].join('\n');
}

// Generate JSON output for backend use
function generateJSONOutput(volunteersWithCodes: VolunteerWithCode[]): string {
  return JSON.stringify(volunteersWithCodes, null, 2);
}

// Main function
async function main() {
  try {
    // Read the volunteer CSV file
    const csvPath = path.join(__dirname, '../../../volunteer list for sprouter - Sheet1.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    
    // Parse volunteers
    const volunteers = parseVolunteerCSV(csvContent);
    console.log(`Found ${volunteers.length} volunteers`);
    
    // Generate codes
    const volunteersWithCodes = generateVolunteerCodes(volunteers);
    
    // Generate outputs
    const csvOutput = generateCSVOutput(volunteersWithCodes);
    const jsonOutput = generateJSONOutput(volunteersWithCodes);
    
    // Write CSV output
    const outputCsvPath = path.join(__dirname, '../../../volunteer-codes.csv');
    fs.writeFileSync(outputCsvPath, csvOutput);
    console.log(`Volunteer codes CSV written to: ${outputCsvPath}`);
    
    // Write JSON output
    const outputJsonPath = path.join(__dirname, '../../../volunteer-codes.json');
    fs.writeFileSync(outputJsonPath, jsonOutput);
    console.log(`Volunteer codes JSON written to: ${outputJsonPath}`);
    
    // Display first few codes for verification
    console.log('\nFirst 5 volunteer codes:');
    volunteersWithCodes.slice(0, 5).forEach(volunteer => {
      console.log(`${volunteer.name}: ${volunteer.code} (${volunteer.email})`);
    });
    
    console.log(`\nGenerated ${volunteersWithCodes.length} unique volunteer codes`);
    
  } catch (error) {
    console.error('Error generating volunteer codes:', error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

export { generateVolunteerCode, parseVolunteerCSV, generateVolunteerCodes };
