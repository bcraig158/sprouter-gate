// Analytics API for Netlify Functions - Reads from SQLite database
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

exports.handler = async (event, context) => {
  try {
    const { httpMethod, path: requestPath, headers, body } = event;
    
    // Extract the route
    let route = requestPath;
    if (requestPath.startsWith('/.netlify/functions/analytics')) {
      route = requestPath.replace('/.netlify/functions/analytics', '');
    } else if (requestPath.startsWith('/api/analytics')) {
      route = requestPath.replace('/api/analytics', '');
    }
    route = route || '/';
    
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Content-Type': 'application/json'
    };
    
    // Handle preflight requests
    if (httpMethod === 'OPTIONS') {
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: ''
      };
    }
    
    // Get analytics data
    if (route === '/' && httpMethod === 'GET') {
      const { timeframe = 'all' } = event.queryStringParameters || {};
      
      try {
        // Path to the SQLite database
        const dbPath = path.join(__dirname, 'backend/data/sprouter_events.db');
        
        // Connect to database
        const db = new sqlite3.Database(dbPath);
        
        // Calculate time-based filtering
        const now = new Date();
        let timeFilter = null;
        
        switch (timeframe) {
          case '24h':
            timeFilter = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            break;
          case '7d':
            timeFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case '30d':
            timeFilter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
          default:
            timeFilter = null;
        }
        
        // Build time filter SQL
        let timeFilterSQL = '';
        if (timeFilter) {
          timeFilterSQL = `WHERE login_timestamp >= '${timeFilter.toISOString()}'`;
        }
        
        // Get login data from database
        const logins = await new Promise((resolve, reject) => {
          const query = `SELECT * FROM user_logins ${timeFilterSQL} ORDER BY login_timestamp DESC`;
          db.all(query, [], (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
          });
        });
        
        console.log(`📊 Analytics: Found ${logins.length} logins for timeframe ${timeframe}`);
        
        // Calculate metrics
        const totalLogins = logins.length;
        const studentLogins = logins.filter(login => login.user_type === 'student').length;
        const volunteerLogins = logins.filter(login => login.user_type === 'volunteer').length;
        
        // Get active users (last 24 hours)
        const activeUsersFilter = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const activeUsers = logins.filter(login => 
          new Date(login.login_timestamp) >= activeUsersFilter
        );
        
        // Get recent activity
        const recentActivity = logins
          .slice(0, 20)
          .map(login => ({
            activity_type: 'login',
            activity_details: `${login.user_type} login: ${login.identifier}`,
            activity_timestamp: login.login_timestamp,
            user_id: login.user_id,
            user_type: login.user_type
          }));
        
        // Get active users list
        const activeUsersList = activeUsers
          .map(user => ({
            user_id: user.user_id,
            user_type: user.user_type,
            identifier: user.identifier,
            login_timestamp: user.login_timestamp,
            time_ago: Math.floor((now - new Date(user.login_timestamp)) / (1000 * 60)) // minutes ago
          }));
        
        // Get show selections and purchases data
        const showSelections = await new Promise((resolve, reject) => {
          const query = `SELECT * FROM show_selections ${timeFilterSQL.replace('login_timestamp', 'selection_timestamp')} ORDER BY selection_timestamp DESC`;
          db.all(query, [], (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
          });
        });
        
        const purchases = await new Promise((resolve, reject) => {
          const query = `SELECT * FROM purchases ${timeFilterSQL.replace('login_timestamp', 'purchase_timestamp')} ORDER BY purchase_timestamp DESC`;
          db.all(query, [], (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
          });
        });
        
        // Filter show selections by timeframe
        let filteredSelections = showSelections;
        if (timeFilter) {
          filteredSelections = showSelections.filter(selection => {
            const selectionTime = new Date(selection.selection_timestamp);
            return selectionTime >= timeFilter;
          });
        }
        
        // Filter purchases by timeframe
        let filteredPurchases = purchases;
        if (timeFilter) {
          filteredPurchases = purchases.filter(purchase => {
            const purchaseTime = new Date(purchase.purchase_timestamp);
            return purchaseTime >= timeFilter;
          });
        }
        
        // Calculate show breakdown from actual data
        const showBreakdown = {
          'tue-530': { 
            selections: filteredSelections.filter(s => s.show_id?.includes('tue-530')).length,
            purchases: filteredPurchases.filter(p => p.show_id?.includes('tue-530')).length,
            revenue: filteredPurchases.filter(p => p.show_id?.includes('tue-530')).reduce((sum, p) => sum + (p.total_cost || 0), 0),
            conversion_rate: 0
          },
          'tue-630': { 
            selections: filteredSelections.filter(s => s.show_id?.includes('tue-630')).length,
            purchases: filteredPurchases.filter(p => p.show_id?.includes('tue-630')).length,
            revenue: filteredPurchases.filter(p => p.show_id?.includes('tue-630')).reduce((sum, p) => sum + (p.total_cost || 0), 0),
            conversion_rate: 0
          },
          'thu-530': { 
            selections: filteredSelections.filter(s => s.show_id?.includes('thu-530')).length,
            purchases: filteredPurchases.filter(p => p.show_id?.includes('thu-530')).length,
            revenue: filteredPurchases.filter(p => p.show_id?.includes('thu-530')).reduce((sum, p) => sum + (p.total_cost || 0), 0),
            conversion_rate: 0
          },
          'thu-630': { 
            selections: filteredSelections.filter(s => s.show_id?.includes('thu-630')).length,
            purchases: filteredPurchases.filter(p => p.show_id?.includes('thu-630')).length,
            revenue: filteredPurchases.filter(p => p.show_id?.includes('thu-630')).reduce((sum, p) => sum + (p.total_cost || 0), 0),
            conversion_rate: 0
          }
        };
        
        // Calculate conversion rates
        Object.keys(showBreakdown).forEach(showId => {
          const show = showBreakdown[showId];
          if (show.selections > 0) {
            show.conversion_rate = Math.round((show.purchases / show.selections) * 100);
          }
        });
        
        // Get top users
        const userStats = {};
        logins.forEach(login => {
          if (!userStats[login.user_id]) {
            userStats[login.user_id] = {
              user_id: login.user_id,
              user_type: login.user_type,
              identifier: login.identifier,
              name: login.name || '',
              total_selections: 0,
              total_purchase_intents: 0,
              total_purchases: 0,
              total_sprouter_successes: 0,
              total_spent: 0,
              last_activity: login.login_timestamp
            };
          }
        });
        
        const topUsers = Object.values(userStats)
          .sort((a, b) => new Date(b.last_activity) - new Date(a.last_activity))
          .slice(0, 20);
        
        // Calculate totals from actual data
        const totalShowSelections = filteredSelections.length;
        const totalPurchases = filteredPurchases.length;
        const totalRevenue = filteredPurchases.reduce((sum, purchase) => sum + (purchase.total_cost || 0), 0);
        
        // Close database connection
        db.close();
        
        const response = {
          totalLogins,
          studentLogins,
          volunteerLogins,
          totalShowSelections,
          totalPurchases,
          totalRevenue,
          activeUsers: activeUsers.length,
          activeStudentUsers: activeUsers.filter(u => u.user_type === 'student').length,
          activeVolunteerUsers: activeUsers.filter(u => u.user_type === 'volunteer').length,
          activeUsersList,
          showBreakdown,
          recentActivity,
          topUsers,
          limitViolations: [],
          timeframe
        };
        
        return {
          statusCode: 200,
          headers: corsHeaders,
          body: JSON.stringify(response)
        };
        
      } catch (error) {
        console.error('Analytics error:', error);
        return {
          statusCode: 500,
          headers: corsHeaders,
          body: JSON.stringify({ 
            error: 'Failed to load analytics data',
            details: error.message 
          })
        };
      }
    }
    
    // Default response
    return {
      statusCode: 404,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Analytics endpoint not found' })
    };
    
  } catch (error) {
    console.error('Analytics handler error:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      })
    };
  }
};