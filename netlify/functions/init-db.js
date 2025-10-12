const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

// Database path
const DB_PATH = process.env.DATABASE_PATH || './data/sprouter_events.db';

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize database
function initDatabase() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error('Error opening database:', err);
        reject(err);
        return;
      }
      console.log('Connected to SQLite database');
    });

    // Create tables
    const createTables = `
      -- Students table
      CREATE TABLE IF NOT EXISTS students (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id TEXT UNIQUE NOT NULL,
        household_id TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- Households table
      CREATE TABLE IF NOT EXISTS households (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        household_id TEXT UNIQUE NOT NULL,
        volunteer_code TEXT,
        volunteer_redeemed BOOLEAN DEFAULT FALSE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- Volunteer codes table
      CREATE TABLE IF NOT EXISTS volunteer_codes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT UNIQUE NOT NULL,
        email TEXT NOT NULL,
        name TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- User logins table
      CREATE TABLE IF NOT EXISTS user_logins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        user_type TEXT NOT NULL,
        session_id TEXT,
        ip_address TEXT,
        user_agent TEXT,
        login_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME
      );

      -- Show selections table
      CREATE TABLE IF NOT EXISTS show_selections (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        user_type TEXT NOT NULL,
        show_date TEXT NOT NULL,
        show_time TEXT NOT NULL,
        show_id TEXT NOT NULL,
        tickets_requested INTEGER NOT NULL,
        tickets_purchased INTEGER DEFAULT 0,
        selection_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- Purchases table
      CREATE TABLE IF NOT EXISTS purchases (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        user_type TEXT NOT NULL,
        show_id TEXT NOT NULL,
        tickets_purchased INTEGER NOT NULL,
        total_cost REAL NOT NULL,
        payment_status TEXT DEFAULT 'pending',
        purchase_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        transaction_id TEXT
      );
    `;

    db.exec(createTables, (err) => {
      if (err) {
        console.error('Error creating tables:', err);
        reject(err);
        return;
      }
      console.log('Database tables created successfully');
      resolve();
    });

    db.close();
  });
}

// Add all student data
async function addAllStudentData() {
  const db = new sqlite3.Database(DB_PATH);

  try {
    // Import all students from the CSV data
    const studentData = [
      // TK-Schofield students
      ['39444', 'HH_39444'], ['39697', 'HH_39697'], ['39522', 'HH_39522'], ['39459', 'HH_39459'], ['39498', 'HH_39498'],
      ['39438', 'HH_39438'], ['39541', 'HH_39541'], ['39463', 'HH_39463'], ['39645', 'HH_39645'], ['39394', 'HH_39394'],
      ['39720', 'HH_39720'], ['39769', 'HH_39769'], ['39513', 'HH_39513'], ['39651', 'HH_39651'], ['39637', 'HH_39637'],
      ['39524', 'HH_39524'], ['39461', 'HH_39461'], ['39448', 'HH_39448'], ['38990', 'HH_38990'], ['39393', 'HH_39393'],
      ['39523', 'HH_39523'], ['39384', 'HH_39384'],
      
      // TK-Gomez students
      ['39702', 'HH_39702'], ['38261', 'HH_38261'], ['39718', 'HH_39718'], ['39401', 'HH_39401'], ['39451', 'HH_39451'],
      ['39380', 'HH_39380'], ['39592', 'HH_39592'], ['39518', 'HH_39518'], ['39457', 'HH_39457'], ['39476', 'HH_39476'],
      ['39533', 'HH_39533'], ['39480', 'HH_39480'], ['39421', 'HH_39421'], ['39717', 'HH_39717'], ['39585', 'HH_39585'],
      ['39419', 'HH_39419'], ['39514', 'HH_39514'], ['39478', 'HH_39478'], ['39388', 'HH_39388'],
      
      // TK-Hoslett students
      ['39495', 'HH_39495'], ['39443', 'HH_39443'], ['39745', 'HH_39745'], ['39402', 'HH_39402'], ['39716', 'HH_39716'],
      ['39392', 'HH_39392'], ['39752', 'HH_39752'], ['39727', 'HH_39727'], ['39399', 'HH_39399'], ['39719', 'HH_39719'],
      ['39723', 'HH_39723'], ['39414', 'HH_39414'], ['39105', 'HH_39105'], ['39450', 'HH_39450'], ['39646', 'HH_39646'],
      ['39661', 'HH_39661'], ['39517', 'HH_39517'], ['39643', 'HH_39643'], ['39470', 'HH_39470'], ['39469', 'HH_39469'],
      
      // K-Hagman students
      ['39292', 'HH_39292'], ['39280', 'HH_39280'], ['39339', 'HH_39339'], ['39759', 'HH_39759'], ['38544', 'HH_38544'],
      ['39322', 'HH_39322'], ['39329', 'HH_39329'], ['38591', 'HH_38591'], ['38572', 'HH_38572'], ['39749', 'HH_39749'],
      ['35809', 'HH_35809'], ['39069', 'HH_39069'], ['39279', 'HH_39279'], ['38625', 'HH_38625'], ['38583', 'HH_38583'],
      ['39373', 'HH_39373'], ['39333', 'HH_39333'], ['38590', 'HH_38590'], ['38553', 'HH_38553'], ['38274', 'HH_38274'],
      ['38627', 'HH_38627'], ['38561', 'HH_38561'],
      
      // K-Schauer students
      ['39300', 'HH_39300'], ['38563', 'HH_38563'], ['39351', 'HH_39351'], ['38593', 'HH_38593'], ['38928', 'HH_38928'],
      ['38613', 'HH_38613'], ['39307', 'HH_39307'], ['39120', 'HH_39120'], ['38810', 'HH_38810'], ['39579', 'HH_39579'],
      ['39281', 'HH_39281'], ['39293', 'HH_39293'], ['38602', 'HH_38602'], ['39360', 'HH_39360'], ['39590', 'HH_39590'],
      ['38551', 'HH_38551'], ['39320', 'HH_39320'], ['38585', 'HH_38585'], ['38547', 'HH_38547'], ['39335', 'HH_39335'],
      
      // K-Andrew students
      ['38919', 'HH_38919'], ['38549', 'HH_38549'], ['39278', 'HH_39278'], ['39751', 'HH_39751'], ['39319', 'HH_39319'],
      ['39020', 'HH_39020'], ['38610', 'HH_38610'], ['39686', 'HH_39686'], ['39369', 'HH_39369'], ['39768', 'HH_39768'],
      ['39332', 'HH_39332'], ['38601', 'HH_38601'], ['38970', 'HH_38970'], ['39746', 'HH_39746'], ['38586', 'HH_38586'],
      ['38611', 'HH_38611'], ['39376', 'HH_39376'], ['39642', 'HH_39642'], ['39328', 'HH_39328'], ['39685', 'HH_39685'],
      ['39078', 'HH_39078'], ['38541', 'HH_38541'],
      
      // K-Lopez students (sample - there are many more)
      ['38827', 'HH_38827'], ['38617', 'HH_38617'], ['39289', 'HH_39289'], ['38573', 'HH_38573'], ['38285', 'HH_38285'],
      ['38560', 'HH_38560'], ['39361', 'HH_39361'], ['38614', 'HH_38614'], ['38542', 'HH_38542'], ['39306', 'HH_39306'],
      ['39649', 'HH_39649'], ['38603', 'HH_38603'], ['39297', 'HH_39297'], ['38605', 'HH_38605'], ['39377', 'HH_39377'],
      ['39640', 'HH_39640'], ['38569', 'HH_38569'], ['38145', 'HH_38145'], ['38574', 'HH_38574'], ['38567', 'HH_38567'],
      ['36131', 'HH_36131'], ['36071', 'HH_36071'], ['36239', 'HH_36239'], ['38132', 'HH_38132'], ['35814', 'HH_35814'],
      ['38623', 'HH_38623'], ['36054', 'HH_36054'], ['39736', 'HH_39736'], ['38566', 'HH_38566'], ['39273', 'HH_39273'],
      ['38137', 'HH_38137'], ['36042', 'HH_36042'], ['38267', 'HH_38267'], ['38608', 'HH_38608'], ['38587', 'HH_38587'],
      ['36082', 'HH_36082'], ['38562', 'HH_38562'], ['36052', 'HH_36052'], ['36388', 'HH_36388'], ['38598', 'HH_38598'],
      ['35553', 'HH_35553'], ['38564', 'HH_38564'], ['36049', 'HH_36049'], ['38555', 'HH_38555'], ['38826', 'HH_38826'],
      ['38534', 'HH_38534'], ['38812', 'HH_38812'], ['36040', 'HH_36040'], ['38845', 'HH_38845'], ['36095', 'HH_36095'],
      ['38550', 'HH_38550'], ['36395', 'HH_36395'], ['38906', 'HH_38906'], ['38579', 'HH_38579'], ['38926', 'HH_38926'],
      ['38581', 'HH_38581'], ['38615', 'HH_38615'], ['38606', 'HH_38606'], ['38924', 'HH_38924'], ['38568', 'HH_38568'],
      ['38556', 'HH_38556'], ['39577', 'HH_39577'], ['38604', 'HH_38604'], ['38599', 'HH_38599'], ['38600', 'HH_38600'],
      ['36080', 'HH_36080'], ['36124', 'HH_36124'], ['36035', 'HH_36035'], ['39581', 'HH_39581'], ['38580', 'HH_38580'],
      ['36050', 'HH_36050'], ['36127', 'HH_36127'], ['38595', 'HH_38595'], ['38584', 'HH_38584'], ['34769', 'HH_34769'],
      ['36114', 'HH_36114'], ['38570', 'HH_38570'], ['36276', 'HH_36276'], ['38143', 'HH_38143'], ['38620', 'HH_38620'],
      ['36085', 'HH_36085'], ['38898', 'HH_38898'], ['38628', 'HH_38628'], ['38576', 'HH_38576'], ['38609', 'HH_38609'],
      ['36103', 'HH_36103'], ['38559', 'HH_38559'], ['36125', 'HH_36125'], ['38777', 'HH_38777'], ['39090', 'HH_39090'],
      ['38814', 'HH_38814'], ['36126', 'HH_36126'], ['38619', 'HH_38619'], ['36025', 'HH_36025'], ['36440', 'HH_36440'],
      ['36109', 'HH_36109'], ['36108', 'HH_36108'], ['38811', 'HH_38811'], ['38624', 'HH_38624'], ['39018', 'HH_39018'],
      ['36041', 'HH_36041'], ['38558', 'HH_38558'], ['38592', 'HH_38592'], ['36064', 'HH_36064'], ['38917', 'HH_38917'],
      ['36024', 'HH_36024'], ['38589', 'HH_38589'], ['34820', 'HH_34820'], ['39729', 'HH_39729'], ['38594', 'HH_38594'],
      ['36047', 'HH_36047'], ['38951', 'HH_38951'], ['36184', 'HH_36184'], ['36267', 'HH_36267'], ['34906', 'HH_34906'],
      ['39248', 'HH_39248'], ['34951', 'HH_34951'], ['35849', 'HH_35849'], ['34969', 'HH_34969'], ['35184', 'HH_35184'],
      ['36215', 'HH_36215'], ['36223', 'HH_36223'], ['38538', 'HH_38538'], ['36136', 'HH_36136'], ['36198', 'HH_36198'],
      ['39255', 'HH_39255'], ['38124', 'HH_38124'], ['35038', 'HH_35038'], ['36272', 'HH_36272'], ['35205', 'HH_35205'],
      ['35513', 'HH_35513'], ['39257', 'HH_39257'], ['35447', 'HH_35447'], ['38879', 'HH_38879'], ['35109', 'HH_35109'],
      ['35135', 'HH_35135'], ['38533', 'HH_38533'], ['36133', 'HH_36133'], ['34856', 'HH_34856'], ['34891', 'HH_34891'],
      ['36232', 'HH_36232'], ['35146', 'HH_35146'], ['35165', 'HH_35165'], ['38780', 'HH_38780'], ['39261', 'HH_39261'],
      ['36187', 'HH_36187'], ['35211', 'HH_35211'], ['39260', 'HH_39260'], ['36459', 'HH_36459'], ['36202', 'HH_36202'],
      ['36227', 'HH_36227'], ['35071', 'HH_35071'], ['36139', 'HH_36139'], ['35037', 'HH_35037'], ['34689', 'HH_34689'],
      ['36176', 'HH_36176'], ['35079', 'HH_35079'], ['35365', 'HH_35365'], ['36209', 'HH_36209'], ['33855', 'HH_33855'],
      ['36183', 'HH_36183'], ['36259', 'HH_36259'], ['39253', 'HH_39253'], ['36142', 'HH_36142'], ['39249', 'HH_39249'],
      ['38149', 'HH_38149'], ['35470', 'HH_35470'], ['39123', 'HH_39123'], ['36191', 'HH_36191'], ['38897', 'HH_38897'],
      ['35181', 'HH_35181'], ['36258', 'HH_36258'], ['36252', 'HH_36252'], ['36186', 'HH_36186'], ['39121', 'HH_39121'],
      ['38575', 'HH_38575'], ['35504', 'HH_35504'], ['35216', 'HH_35216'], ['39636', 'HH_39636'], ['36262', 'HH_36262'],
      ['39641', 'HH_39641'], ['36257', 'HH_36257'], ['38284', 'HH_38284'], ['38618', 'HH_38618'], ['35297', 'HH_35297'],
      ['36174', 'HH_36174'], ['38809', 'HH_38809'], ['38031', 'HH_38031'], ['38815', 'HH_38815'], ['38960', 'HH_38960'],
      ['38977', 'HH_38977'], ['36178', 'HH_36178'], ['39760', 'HH_39760'], ['36237', 'HH_36237'], ['39116', 'HH_39116'],
      ['36447', 'HH_36447'], ['38545', 'HH_38545'], ['35897', 'HH_35897'], ['39247', 'HH_39247'], ['38936', 'HH_38936'],
      ['38832', 'HH_38832'], ['35212', 'HH_35212'], ['35206', 'HH_35206'], ['39647', 'HH_39647'], ['38925', 'HH_38925'],
      ['35061', 'HH_35061'], ['35215', 'HH_35215'], ['35082', 'HH_35082'], ['36216', 'HH_36216'], ['36196', 'HH_36196'],
      ['36159', 'HH_36159'], ['38198', 'HH_38198'], ['34861', 'HH_34861'], ['38288', 'HH_38288'], ['36245', 'HH_36245'],
      ['34909', 'HH_34909'], ['36253', 'HH_36253'], ['36194', 'HH_36194'], ['36151', 'HH_36151'], ['38264', 'HH_38264'],
      ['35861', 'HH_35861'], ['39735', 'HH_39735'], ['38006', 'HH_38006'], ['39072', 'HH_39072'], ['34984', 'HH_34984'],
      ['39728', 'HH_39728'], ['36222', 'HH_36222'], ['35016', 'HH_35016'], ['36210', 'HH_36210'], ['39659', 'HH_39659'],
      ['35060', 'HH_35060'], ['35084', 'HH_35084'], ['35475', 'HH_35475'], ['36134', 'HH_36134'], ['38283', 'HH_38283'],
      ['35837', 'HH_35837'], ['39079', 'HH_39079'], ['35367', 'HH_35367'], ['36426', 'HH_36426'], ['34882', 'HH_34882'],
      ['34039', 'HH_34039'], ['34949', 'HH_34949'], ['35221', 'HH_35221'], ['34033', 'HH_34033'], ['34064', 'HH_34064'],
      ['38286', 'HH_38286'], ['35335', 'HH_35335'], ['35040', 'HH_35040'], ['35333', 'HH_35333'], ['38858', 'HH_38858'],
      ['38323', 'HH_38323'], ['33972', 'HH_33972'], ['36415', 'HH_36415'], ['36319', 'HH_36319'], ['35128', 'HH_35128'],
      ['35208', 'HH_35208'], ['35464', 'HH_35464'], ['33952', 'HH_33952'], ['35137', 'HH_35137'], ['34872', 'HH_34872'],
      ['34883', 'HH_34883'], ['34660', 'HH_34660'], ['34055', 'HH_34055'], ['38806', 'HH_38806'], ['33737', 'HH_33737'],
      ['35485', 'HH_35485'], ['35450', 'HH_35450'], ['38013', 'HH_38013'], ['34012', 'HH_34012'], ['38616', 'HH_38616'],
      ['39068', 'HH_39068'], ['35059', 'HH_35059'], ['33727', 'HH_33727'], ['35163', 'HH_35163'], ['39730', 'HH_39730'],
      ['33924', 'HH_33924'], ['34816', 'HH_34816'], ['39236', 'HH_39236'], ['33968', 'HH_33968'], ['35214', 'HH_35214'],
      ['35369', 'HH_35369'], ['34438', 'HH_34438'], ['34552', 'HH_34552'], ['38063', 'HH_38063'], ['34921', 'HH_34921'],
      ['34056', 'HH_34056'], ['38249', 'HH_38249'], ['34939', 'HH_34939'], ['35909', 'HH_35909'], ['35209', 'HH_35209'],
      ['34062', 'HH_34062'], ['35176', 'HH_35176'], ['36358', 'HH_36358'], ['38195', 'HH_38195'], ['36412', 'HH_36412'],
      ['35034', 'HH_35034'], ['35916', 'HH_35916'], ['35045', 'HH_35045'], ['35058', 'HH_35058'], ['35210', 'HH_35210'],
      ['36296', 'HH_36296'], ['34762', 'HH_34762'], ['35094', 'HH_35094'], ['35104', 'HH_35104'], ['35377', 'HH_35377'],
      ['39594', 'HH_39594'], ['35509', 'HH_35509'], ['33980', 'HH_33980'], ['35289', 'HH_35289'], ['34417', 'HH_34417'],
      ['39705', 'HH_39705'], ['39119', 'HH_39119'], ['33964', 'HH_33964'], ['34936', 'HH_34936'], ['34942', 'HH_34942'],
      ['35506', 'HH_35506'], ['34979', 'HH_34979'], ['35023', 'HH_35023'], ['35845', 'HH_35845'], ['36439', 'HH_36439'],
      ['33994', 'HH_33994'], ['39238', 'HH_39238'], ['35336', 'HH_35336'], ['34506', 'HH_34506'], ['39063', 'HH_39063'],
      ['34035', 'HH_34035'], ['35095', 'HH_35095'], ['39578', 'HH_39578'], ['35971', 'HH_35971']
    ];

    // Insert all students
    for (const [studentId, householdId] of studentData) {
      await new Promise((resolve, reject) => {
        db.run(`
          INSERT OR IGNORE INTO students (student_id, household_id) 
          VALUES (?, ?)
        `, [studentId, householdId], (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      // Insert corresponding household
      await new Promise((resolve, reject) => {
        db.run(`
          INSERT OR IGNORE INTO households (household_id, volunteer_redeemed) 
          VALUES (?, ?)
        `, [householdId, false], (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }

    // Add admin volunteer
    await new Promise((resolve, reject) => {
      db.run(`
        INSERT OR IGNORE INTO volunteer_codes (code, email, name) 
        VALUES (?, ?, ?)
      `, ['339933', 'admin@maidu.com', 'Admin'], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    console.log(`All student data added successfully: ${studentData.length} students`);
  } catch (error) {
    console.error('Error adding student data:', error);
    throw error;
  } finally {
    db.close();
  }
}

// Main initialization
async function main() {
  try {
    await initDatabase();
    await addAllStudentData();
    console.log('Database initialization completed successfully');
  } catch (error) {
    console.error('Database initialization failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { initDatabase, addSampleData };
