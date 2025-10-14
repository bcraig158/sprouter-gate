const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const secureStorage = require('./secureStorage');

// Environment variables
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

// Database connection with improved path resolution
const dbPath = process.env.DATABASE_PATH || path.join(__dirname, 'sprouter_events.db');
console.log(`🗄️ Analytics Database path: ${dbPath}`);
console.log(`🗄️ Analytics Database exists: ${require('fs').existsSync(dbPath)}`);

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Analytics Database connection error:', err);
  } else {
    console.log('✅ Analytics Database connected successfully');
  }
});

// Database verification
db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
  if (err) {
    console.error('Analytics database verification error:', err);
  } else {
    console.log('Analytics database connected. Available tables:', tables.map(t => t.name));
  }
});

const sessionsPath = process.env.SESSION_STORAGE_PATH || path.join(__dirname, 'sessions.json');

function loadSessions() {
  try {
    if (fs.existsSync(sessionsPath)) {
      return JSON.parse(fs.readFileSync(sessionsPath, 'utf8'));
    }
  } catch (err) {
    console.error('Error loading sessions:', err);
  }
  return { students: [], volunteers: [], admin: [] };
}

function getAnalytics() {
  const sessions = loadSessions();
  const now = new Date();
  const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

  // Filter to last 30 days
  const recentSessions = {
    students: sessions.students.filter(s => new Date(s.timestamp) > thirtyDaysAgo),
    volunteers: sessions.volunteers.filter(s => new Date(s.timestamp) > thirtyDaysAgo),
    admin: sessions.admin.filter(s => new Date(s.timestamp) > thirtyDaysAgo)
  };

  // Calculate analytics
  const analytics = {
    totalLogins: recentSessions.students.length + recentSessions.volunteers.length,
    studentLogins: recentSessions.students.length,
    volunteerLogins: recentSessions.volunteers.length,
    adminLogins: recentSessions.admin.length,
    totalShowSelections: 0, // Will be populated from database
    totalPurchases: 0, // Will be populated from database
    totalRevenue: 0, // Will be populated from database
    activeUsers: new Set([...recentSessions.students.map(s => s.userId), ...recentSessions.volunteers.map(s => s.userId)]).size,
    activeStudentUsers: new Set(recentSessions.students.map(s => s.userId)).size,
    activeVolunteerUsers: new Set(recentSessions.volunteers.map(s => s.userId)).size,
    activeUsersList: [...recentSessions.students, ...recentSessions.volunteers]
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 20)
      .map(session => ({
        user_id: session.userId,
        user_type: session.type,
        identifier: session.userId,
        login_timestamp: session.timestamp,
        time_ago: Math.floor((Date.now() - new Date(session.timestamp).getTime()) / 1000 / 60) // minutes ago
      })),
    showBreakdown: {},
    recentActivity: [],
    topUsers: [],
    limitViolations: [],
    timeframe: '30 days',
    byDomain: {
      maidutickets: 0,
      sproutersecure: 0,
      localhost: 0
    },
    byDate: {},
    uniqueStudents: new Set(recentSessions.students.map(s => s.userId)).size,
    uniqueVolunteers: new Set(recentSessions.volunteers.map(s => s.userId)).size,
    recentSessions: [...recentSessions.students, ...recentSessions.volunteers]
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 50), // Last 50 sessions
    hourlyDistribution: {},
    userAgentStats: {},
    topHouseholds: {}
  };

  // Count by domain
  [...recentSessions.students, ...recentSessions.volunteers].forEach(session => {
    if (session.domain?.includes('maidutickets')) {
      analytics.byDomain.maidutickets++;
    } else if (session.domain?.includes('sproutersecure')) {
      analytics.byDomain.sproutersecure++;
    } else if (session.domain?.includes('localhost')) {
      analytics.byDomain.localhost++;
    }
  });

  // Count by date
  [...recentSessions.students, ...recentSessions.volunteers].forEach(session => {
    const date = new Date(session.timestamp).toISOString().split('T')[0];
    analytics.byDate[date] = (analytics.byDate[date] || 0) + 1;
  });

  // Hourly distribution
  [...recentSessions.students, ...recentSessions.volunteers].forEach(session => {
    const hour = new Date(session.timestamp).getHours();
    analytics.hourlyDistribution[hour] = (analytics.hourlyDistribution[hour] || 0) + 1;
  });

  // User agent stats
  [...recentSessions.students, ...recentSessions.volunteers].forEach(session => {
    const ua = session.userAgent || 'unknown';
    const browser = ua.includes('Chrome') ? 'Chrome' : 
                   ua.includes('Firefox') ? 'Firefox' : 
                   ua.includes('Safari') ? 'Safari' : 
                   ua.includes('Edge') ? 'Edge' : 'Other';
    analytics.userAgentStats[browser] = (analytics.userAgentStats[browser] || 0) + 1;
  });

  // Top households (from student sessions)
  recentSessions.students.forEach(session => {
    if (session.household_id) {
      analytics.topHouseholds[session.household_id] = (analytics.topHouseholds[session.household_id] || 0) + 1;
    }
  });

  return analytics;
}

// Calculate session analytics from secureStorage data
function calculateSessionAnalytics(analyticsData) {
  const userLogins = analyticsData.userLogins || [];
  const showSelections = analyticsData.showSelections || [];
  const purchases = analyticsData.purchases || [];
  const sessions = Array.isArray(analyticsData.sessions) ? analyticsData.sessions : [];
  const activities = analyticsData.activities || [];
  
  const now = new Date();
  const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

  // Filter to last 30 days
  const recentLogins = userLogins.filter(login => new Date(login.login_timestamp) > thirtyDaysAgo);
  const recentSelections = showSelections.filter(selection => new Date(selection.timestamp) > thirtyDaysAgo);
  const recentPurchases = purchases.filter(purchase => new Date(purchase.timestamp) > thirtyDaysAgo);

  // Calculate analytics
  const analytics = {
    totalLogins: recentLogins.length,
    studentLogins: recentLogins.filter(l => l.user_type === 'student').length,
    volunteerLogins: recentLogins.filter(l => l.user_type === 'volunteer').length,
    adminLogins: recentLogins.filter(l => l.user_type === 'admin').length,
    totalShowSelections: recentSelections.length,
    totalPurchases: recentPurchases.length,
    totalRevenue: recentPurchases.reduce((sum, p) => sum + (parseFloat(p.metadata?.total_cost) || 0), 0),
    activeUsers: new Set(recentLogins.map(s => s.user_id)).size,
    activeStudentUsers: new Set(recentLogins.filter(l => l.user_type === 'student').map(s => s.user_id)).size,
    activeVolunteerUsers: new Set(recentLogins.filter(l => l.user_type === 'volunteer').map(s => s.user_id)).size,
    activeUsersList: recentLogins
      .sort((a, b) => new Date(b.login_timestamp) - new Date(a.login_timestamp))
      .slice(0, 20)
      .map(session => ({
        user_id: session.user_id,
        user_type: session.user_type,
        identifier: session.identifier,
        login_timestamp: session.login_timestamp,
        time_ago: Math.floor((Date.now() - new Date(session.login_timestamp).getTime()) / 1000 / 60) // minutes ago
      })),
    showBreakdown: {},
    recentActivity: recentLogins.slice(0, 10),
    topUsers: [],
    limitViolations: [],
    timeframe: '30 days',
    byDomain: {
      maidutickets: recentLogins.filter(l => l.domain?.includes('maidutickets')).length,
      sproutersecure: recentLogins.filter(l => l.domain?.includes('sproutersecure')).length,
      localhost: recentLogins.filter(l => l.domain?.includes('localhost')).length
    },
    byDate: {},
    uniqueStudents: new Set(recentLogins.filter(l => l.user_type === 'student').map(s => s.user_id)).size,
    uniqueVolunteers: new Set(recentLogins.filter(l => l.user_type === 'volunteer').map(s => s.user_id)).size,
    recentSessions: recentLogins
      .sort((a, b) => new Date(b.login_timestamp) - new Date(a.login_timestamp))
      .slice(0, 50),
    hourlyDistribution: {},
    userAgentStats: {},
    topHouseholds: {}
  };

  // Count by date
  recentLogins.forEach(session => {
    const date = new Date(session.login_timestamp).toISOString().split('T')[0];
    analytics.byDate[date] = (analytics.byDate[date] || 0) + 1;
  });

  // Hourly distribution
  recentLogins.forEach(session => {
    const hour = new Date(session.login_timestamp).getHours();
    analytics.hourlyDistribution[hour] = (analytics.hourlyDistribution[hour] || 0) + 1;
  });

  // User agent stats
  recentLogins.forEach(session => {
    const ua = session.user_agent || 'unknown';
    const browser = ua.includes('Chrome') ? 'Chrome' : 
                   ua.includes('Firefox') ? 'Firefox' : 
                   ua.includes('Safari') ? 'Safari' : 
                   ua.includes('Edge') ? 'Edge' : 'Other';
    analytics.userAgentStats[browser] = (analytics.userAgentStats[browser] || 0) + 1;
  });

  // Top households (from student sessions)
  recentLogins.filter(l => l.user_type === 'student').forEach(session => {
    if (session.household_id) {
      analytics.topHouseholds[session.household_id] = (analytics.topHouseholds[session.household_id] || 0) + 1;
    }
  });

  return analytics;
}

// Get database analytics (from existing tables)
function getDatabaseAnalytics() {
  return new Promise((resolve, reject) => {
    const analytics = {
      totalStudents: 0,
      totalHouseholds: 0,
      totalVolunteerCodes: 0,
      usedVolunteerCodes: 0,
      familyNightStates: 0,
      totalShowSelections: 0,
      totalPurchases: 0,
      totalRevenue: 0,
      totalPurchaseIntents: 0,
      totalSprouterSuccesses: 0,
      totalUserLogins: 0,
      totalActivityEvents: 0,
      recentActivity: [],
      showBreakdown: {},
      topUsers: [],
      activeUsers: 0,
      activeUsersList: []
    };

    // Get student count
    db.get('SELECT COUNT(*) as count FROM students', (err, row) => {
      if (err) {
        console.error('Error getting student count:', err);
        return resolve(analytics);
      }
      analytics.totalStudents = row.count;

      // Get household count
      db.get('SELECT COUNT(*) as count FROM households', (err, row) => {
        if (err) {
          console.error('Error getting household count:', err);
          return resolve(analytics);
        }
        analytics.totalHouseholds = row.count;

        // Get volunteer code stats
        db.get('SELECT COUNT(*) as count FROM volunteer_codes', (err, row) => {
          if (err) {
            console.error('Error getting volunteer code count:', err);
            return resolve(analytics);
          }
          analytics.totalVolunteerCodes = row.count;

          db.get('SELECT COUNT(*) as count FROM volunteer_codes WHERE is_used = TRUE', (err, row) => {
            if (err) {
              console.error('Error getting used volunteer codes:', err);
              return resolve(analytics);
            }
            analytics.usedVolunteerCodes = row.count;

            // Get family night states
            db.get('SELECT COUNT(*) as count FROM family_night_state', (err, row) => {
              if (err) {
                console.error('Error getting family night states:', err);
                return resolve(analytics);
              }
              analytics.familyNightStates = row.count;

              // Get show selections
              db.get('SELECT COUNT(*) as count FROM show_selections', (err, row) => {
                if (err) {
                  console.error('Error getting show selections:', err);
                  return resolve(analytics);
                }
                analytics.totalShowSelections = row.count;

                // Get purchases and revenue
                db.get('SELECT COUNT(*) as count, COALESCE(SUM(total_cost), 0) as revenue FROM purchases', (err, row) => {
                  if (err) {
                    console.error('Error getting purchases:', err);
                    return resolve(analytics);
                  }
                  analytics.totalPurchases = row.count;
                  analytics.totalRevenue = row.revenue;

                  // Get purchase intents
                  db.get('SELECT COUNT(*) as count FROM purchase_intents', (err, row) => {
                    if (err) {
                      console.error('Error getting purchase intents:', err);
                      return resolve(analytics);
                    }
                    analytics.totalPurchaseIntents = row.count;

                    // Get sprouter successes
                    db.get('SELECT COUNT(*) as count FROM sprouter_success_visits', (err, row) => {
                      if (err) {
                        console.error('Error getting sprouter successes:', err);
                        return resolve(analytics);
                      }
                      analytics.totalSprouterSuccesses = row.count;

                      // Get user logins
                      db.get('SELECT COUNT(*) as count FROM user_logins', (err, row) => {
                        if (err) {
                          console.error('Error getting user logins:', err);
                          return resolve(analytics);
                        }
                        analytics.totalUserLogins = row.count;

                        // Get activity timeline
                        db.get('SELECT COUNT(*) as count FROM user_activity_timeline', (err, row) => {
                          if (err) {
                            console.error('Error getting activity timeline:', err);
                            return resolve(analytics);
                          }
                          analytics.totalActivityEvents = row.count;

                          // Get show breakdown
                          db.all(`
                            SELECT 
                              show_id,
                              COUNT(*) as selections,
                              SUM(CASE WHEN p.id IS NOT NULL THEN 1 ELSE 0 END) as purchases,
                              COALESCE(SUM(p.total_cost), 0) as revenue
                            FROM show_selections ss
                            LEFT JOIN purchases p ON ss.user_id = p.user_id AND ss.show_id = p.show_id
                            GROUP BY show_id
                          `, (err, rows) => {
                            if (err) {
                              console.error('Error getting show breakdown:', err);
                            } else {
                              analytics.showBreakdown = {};
                              rows.forEach(row => {
                                analytics.showBreakdown[row.show_id] = {
                                  selections: row.selections,
                                  purchases: row.purchases,
                                  conversion_rate: row.selections > 0 ? (row.purchases / row.selections) * 100 : 0,
                                  revenue: row.revenue
                                };
                              });
                            }

                            // Get top users
                            db.all(`
                              SELECT 
                                ul.user_id,
                                ul.user_type,
                                ul.identifier,
                                ul.name,
                                COUNT(DISTINCT ss.id) as total_selections,
                                COUNT(DISTINCT pi.id) as total_purchase_intents,
                                COUNT(DISTINCT p.id) as total_purchases,
                                COUNT(DISTINCT ssv.id) as total_sprouter_successes,
                                COALESCE(SUM(p.total_cost), 0) as total_spent
                              FROM user_logins ul
                              LEFT JOIN show_selections ss ON ul.user_id = ss.user_id
                              LEFT JOIN purchase_intents pi ON ul.user_id = pi.user_id
                              LEFT JOIN purchases p ON ul.user_id = p.user_id
                              LEFT JOIN sprouter_success_visits ssv ON ul.user_id = ssv.user_id
                              GROUP BY ul.user_id, ul.user_type, ul.identifier, ul.name
                              ORDER BY total_spent DESC, total_purchases DESC
                              LIMIT 10
                            `, (err, rows) => {
                              if (err) {
                                console.error('Error getting top users:', err);
                              } else {
                                analytics.topUsers = rows || [];
                              }

                              // Get active users (last 5 minutes)
                              const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
                              db.all(`
                                SELECT 
                                  user_id,
                                  user_type,
                                  identifier,
                                  name,
                                  login_timestamp
                                FROM user_logins 
                                WHERE login_timestamp > ?
                                ORDER BY login_timestamp DESC
                              `, [fiveMinutesAgo], (err, rows) => {
                                if (err) {
                                  console.error('Error getting active users:', err);
                                } else {
                                  analytics.activeUsers = rows.length;
                                  analytics.activeUsersList = rows.map(row => ({
                                    user_id: row.user_id,
                                    user_type: row.user_type,
                                    identifier: row.identifier,
                                    login_timestamp: row.login_timestamp,
                                    time_ago: Math.floor((Date.now() - new Date(row.login_timestamp).getTime()) / 1000)
                                  }));
                                }

                                // Get recent activity
                                db.all(`
                                  SELECT 
                                    activity_type,
                                    activity_details,
                                    activity_timestamp,
                                    user_id,
                                    user_type
                                  FROM user_activity_timeline 
                                  ORDER BY activity_timestamp DESC 
                                  LIMIT 20
                                `, (err, rows) => {
                                  if (err) {
                                    console.error('Error getting recent activity:', err);
                                  } else {
                                    analytics.recentActivity = rows || [];
                                  }
                                  resolve(analytics);
                                });
                              });
                            });
                          });
                        });
                      });
                    });
                  });
                });
              });
            });
          });
        });
      });
    });
  });
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    // Verify admin token
    const authHeader = event.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ success: false, message: 'Unauthorized' })
      };
    }

    const token = authHeader.substring(7);
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
      } catch (error) {
        return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ success: false, message: 'Invalid token' })
      };
    }

    // Check if user is admin
    if (decoded.type !== 'admin') {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ success: false, message: 'Admin access required' })
      };
    }

    // Get analytics from secureStorage
    const analyticsData = await secureStorage.getAnalytics();
    
    // Get database analytics (primary source)
    const databaseAnalytics = await getDatabaseAnalytics();
    
    // Calculate session analytics from secureStorage data (fallback)
    const sessionAnalytics = calculateSessionAnalytics(analyticsData);
    
    // Combine analytics - prioritize database data
    const combinedAnalytics = {
      // Use database analytics as primary source
      totalLogins: databaseAnalytics.totalUserLogins || sessionAnalytics.totalLogins,
      studentLogins: sessionAnalytics.studentLogins,
      volunteerLogins: sessionAnalytics.volunteerLogins,
      adminLogins: sessionAnalytics.adminLogins,
      totalShowSelections: databaseAnalytics.totalShowSelections,
      totalPurchases: databaseAnalytics.totalPurchases,
      totalRevenue: databaseAnalytics.totalRevenue,
      totalPurchaseIntents: databaseAnalytics.totalPurchaseIntents,
      totalSprouterSuccesses: databaseAnalytics.totalSprouterSuccesses,
      totalUserLogins: databaseAnalytics.totalUserLogins,
      totalActivityEvents: databaseAnalytics.totalActivityEvents,
      activeUsers: databaseAnalytics.activeUsers,
      activeUsersList: databaseAnalytics.activeUsersList,
      // Show breakdown
      showBreakdown: databaseAnalytics.showBreakdown,
      // Top users
      topUsers: databaseAnalytics.topUsers,
      // Recent activity
      recentActivity: databaseAnalytics.recentActivity,
      // Session analytics (from file storage as fallback)
      byDomain: sessionAnalytics.byDomain,
      byDate: sessionAnalytics.byDate,
      hourlyDistribution: sessionAnalytics.hourlyDistribution,
      userAgentStats: sessionAnalytics.userAgentStats,
      topHouseholds: sessionAnalytics.topHouseholds,
      // Database summary
      database: databaseAnalytics,
      // Raw data from secureStorage (for debugging)
      rawData: {
        userLogins: analyticsData.userLogins || [],
        showSelections: analyticsData.showSelections || [],
        purchases: analyticsData.purchases || [],
        sessions: analyticsData.sessions || [],
        activities: analyticsData.activities || []
      },
      generatedAt: new Date().toISOString(),
      timeRange: '30 days',
      dataSource: 'database_primary'
    };
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: combinedAnalytics
      })
    };
  } catch (error) {
    console.error('Analytics error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, message: 'Server error' })
    };
  }
};