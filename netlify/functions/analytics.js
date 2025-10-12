// Analytics API for Netlify Functions - Reads from file-based storage
const secureStorage = require('./secureStorage');

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
        console.log('Analytics requested');
        console.log(`📊 Analytics timeframe requested: ${timeframe}`);
        
        // Get data from secure file storage
        const data = await secureStorage.getAnalytics();
        
        console.log('Analytics data structure:', {
          userLogins: data.userLogins?.length || 0,
          showSelections: data.showSelections?.length || 0,
          purchases: data.purchases?.length || 0,
          sessions: data.sessions?.length || 0,
          activities: data.activities?.length || 0
        });
        
        // Show sample of login data to debug
        if (data.userLogins && data.userLogins.length > 0) {
          console.log('📊 Sample login data:', data.userLogins.slice(0, 3).map(login => ({
            user_type: login.user_type,
            identifier: login.identifier,
            timestamp: login.login_timestamp,
            domain: login.domain
          })));
        }
        
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
        
        // Filter logins by timeframe
        let logins = data.userLogins || [];
        if (timeFilter) {
          logins = logins.filter(login => 
            new Date(login.login_timestamp) >= timeFilter
          );
        }
        
        // Sort by timestamp (most recent first)
        logins = logins.sort((a, b) => 
          new Date(b.login_timestamp) - new Date(a.login_timestamp)
        );
        
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
          .map(login => ({
            user_id: login.user_id,
            user_type: login.user_type,
            identifier: login.identifier,
            login_timestamp: login.login_timestamp,
            time_ago: Math.floor((now - new Date(login.login_timestamp)) / (1000 * 60)) // minutes ago
          }))
          .slice(0, 10);
        
        // Get show selections and purchases
        const showSelections = data.showSelections || [];
        const purchases = data.purchases || [];
        
        // Filter by timeframe if needed
        let filteredSelections = showSelections;
        let filteredPurchases = purchases;
        
        if (timeFilter) {
          filteredSelections = showSelections.filter(selection => 
            new Date(selection.timestamp) >= timeFilter
          );
          filteredPurchases = purchases.filter(purchase => 
            new Date(purchase.timestamp) >= timeFilter
          );
        }
        
        // Calculate show breakdown
        const showBreakdown = {
          'tue-530': { 
            selections: filteredSelections.filter(s => s.event_key === 'tue-530').length,
            purchases: filteredPurchases.filter(p => p.event_key === 'tue-530').length,
            revenue: filteredPurchases.filter(p => p.event_key === 'tue-530').reduce((sum, p) => sum + (p.metadata?.total_cost || 0), 0),
            conversion_rate: 0
          },
          'tue-630': { 
            selections: filteredSelections.filter(s => s.event_key === 'tue-630').length,
            purchases: filteredPurchases.filter(p => p.event_key === 'tue-630').length,
            revenue: filteredPurchases.filter(p => p.event_key === 'tue-630').reduce((sum, p) => sum + (p.metadata?.total_cost || 0), 0),
            conversion_rate: 0
          },
          'thu-530': { 
            selections: filteredSelections.filter(s => s.event_key === 'thu-530').length,
            purchases: filteredPurchases.filter(p => p.event_key === 'thu-530').length,
            revenue: filteredPurchases.filter(p => p.event_key === 'thu-530').reduce((sum, p) => sum + (p.metadata?.total_cost || 0), 0),
            conversion_rate: 0
          },
          'thu-630': { 
            selections: filteredSelections.filter(s => s.event_key === 'thu-630').length,
            purchases: filteredPurchases.filter(p => p.event_key === 'thu-630').length,
            revenue: filteredPurchases.filter(p => p.event_key === 'thu-630').reduce((sum, p) => sum + (p.metadata?.total_cost || 0), 0),
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
        
        // Calculate totals
        const totalShowSelections = filteredSelections.length;
        const totalPurchases = filteredPurchases.length;
        const totalRevenue = filteredPurchases.reduce((sum, purchase) => 
          sum + (purchase.metadata?.total_cost || 0), 0
        );
        
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
        
        // Add activity data to user stats
        filteredSelections.forEach(selection => {
          if (userStats[selection.user_id]) {
            userStats[selection.user_id].total_selections++;
          }
        });
        
        filteredPurchases.forEach(purchase => {
          if (userStats[purchase.user_id]) {
            userStats[purchase.user_id].total_purchases++;
            userStats[purchase.user_id].total_spent += purchase.metadata?.total_cost || 0;
          }
        });
        
        const topUsers = Object.values(userStats)
          .sort((a, b) => b.total_spent - a.total_spent)
          .slice(0, 10);
        
        // Get fraud detection data (placeholder - would need to implement actual fraud detection)
        const fraudDetection = {
          total_violations: 0,
          violations_by_type: {
            dailyTicketExceeded: 0,
            multipleLogins: 0,
            suspiciousIPs: 0
          },
          recent_violations: []
        };
        
        // Return analytics data
        const analyticsData = {
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
          limitViolations: [], // Not implemented yet
          fraud_detection: fraudDetection,
          timeframe,
          lastUpdated: data.metadata?.lastUpdated || new Date().toISOString()
        };
        
        return {
          statusCode: 200,
          headers: corsHeaders,
          body: JSON.stringify(analyticsData)
        };
        
      } catch (error) {
        console.error('Analytics error:', error);
        return {
          statusCode: 500,
          headers: corsHeaders,
          body: JSON.stringify({ 
            error: 'Failed to retrieve analytics data',
            details: error.message 
          })
        };
      }
    }
    
    // Default response
    return {
      statusCode: 404,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Not found' })
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