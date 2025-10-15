'use strict';

const jwt = require('jsonwebtoken');

// Environment variables
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

// In-memory storage for real-time analytics
let liveData = {
  recentActivity: [], // Last 50 activities
  currentUsers: {},   // Currently active users
  purchaseLog: [],    // Last 100 purchases for verification
  eventSelections: {}, // Event selections by user
  stats: {
    totalLogins: 0,
    totalPurchases: 0,
    totalRevenue: 0,
    activeUsers: 0
  }
};

// Clean up old data periodically
setInterval(() => {
  const now = Date.now();
  const oneHourAgo = now - (60 * 60 * 1000);
  
  // Remove old activities
  liveData.recentActivity = liveData.recentActivity.filter(activity => 
    new Date(activity.timestamp).getTime() > oneHourAgo
  );
  
  // Remove old users (inactive for more than 30 minutes)
  const thirtyMinutesAgo = now - (30 * 60 * 1000);
  Object.keys(liveData.currentUsers).forEach(userId => {
    const user = liveData.currentUsers[userId];
    if (new Date(user.lastActivity).getTime() < thirtyMinutesAgo) {
      delete liveData.currentUsers[userId];
    }
  });
  
  // Update active users count
  liveData.stats.activeUsers = Object.keys(liveData.currentUsers).length;
}, 5 * 60 * 1000); // Clean up every 5 minutes

// Verify admin token
function verifyAdminToken(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  try {
    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Check if user is admin
    if (decoded.isAdmin && decoded.type === 'admin') {
      return decoded;
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

exports.handler = async (event, context) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ''
    };
  }

  try {
    // Track events
    if (event.httpMethod === 'POST') {
      let data;
      try {
        data = JSON.parse(event.body);
      } catch (parseError) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ 
            success: false,
            error: 'Invalid JSON in request body' 
          })
        };
      }
      const timestamp = new Date().toISOString();
      
      // Add to recent activity
      const activity = {
        ...data,
        timestamp,
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      };
      
      liveData.recentActivity.unshift(activity);
      
      // Keep only last 50 activities
      if (liveData.recentActivity.length > 50) {
        liveData.recentActivity = liveData.recentActivity.slice(0, 50);
      }
      
      // Track specific events
      switch (data.type) {
        case 'login':
          liveData.currentUsers[data.userId] = {
            studentId: data.studentId,
            loginTime: timestamp,
            lastActivity: timestamp,
            type: data.userType,
            identifier: data.identifier
          };
          liveData.stats.totalLogins++;
          liveData.stats.activeUsers = Object.keys(liveData.currentUsers).length;
          break;
          
        case 'event_selection':
          liveData.eventSelections[data.userId] = {
            event: data.eventName,
            eventKey: data.eventKey,
            timestamp: timestamp
          };
          // Update user activity
          if (liveData.currentUsers[data.userId]) {
            liveData.currentUsers[data.userId].lastActivity = timestamp;
          }
          break;
          
        case 'purchase_completed':
          const purchase = {
            studentId: data.studentId,
            userId: data.userId,
            event: data.eventName,
            eventKey: data.eventKey,
            tickets: data.quantity,
            amount: data.amount,
            timestamp,
            transactionId: data.transactionId || `TXN_${Date.now()}`
          };
          
          liveData.purchaseLog.unshift(purchase);
          
          // Keep only last 100 purchases
          if (liveData.purchaseLog.length > 100) {
            liveData.purchaseLog = liveData.purchaseLog.slice(0, 100);
          }
          
          liveData.stats.totalPurchases++;
          liveData.stats.totalRevenue += (data.amount || 0);
          
          // Update user activity
          if (liveData.currentUsers[data.userId]) {
            liveData.currentUsers[data.userId].lastActivity = timestamp;
          }
          break;
          
        case 'activity':
          // Update user activity timestamp
          if (liveData.currentUsers[data.userId]) {
            liveData.currentUsers[data.userId].lastActivity = timestamp;
          }
          break;
      }
      
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ 
          success: true,
          message: 'Event tracked successfully'
        })
      };
    }
    
    // Get current data for admin
    if (event.httpMethod === 'GET') {
      // Check for admin token
      const adminUser = verifyAdminToken(event.headers.authorization);
      if (!adminUser) {
        return {
          statusCode: 401,
          headers: corsHeaders,
          body: JSON.stringify({ 
            success: false,
            error: 'Unauthorized - Admin access required' 
          })
        };
      }
      
      // Calculate additional stats
      const stats = {
        ...liveData.stats,
        recentActivityCount: liveData.recentActivity.length,
        eventSelectionsCount: Object.keys(liveData.eventSelections).length,
        lastUpdated: new Date().toISOString()
      };
      
      // Format current users for display
      const currentUsersList = Object.entries(liveData.currentUsers).map(([userId, user]) => ({
        userId,
        studentId: user.studentId,
        type: user.type,
        identifier: user.identifier,
        loginTime: user.loginTime,
        lastActivity: user.lastActivity,
        timeSinceLogin: Math.floor((Date.now() - new Date(user.loginTime).getTime()) / 1000 / 60), // minutes
        timeSinceActivity: Math.floor((Date.now() - new Date(user.lastActivity).getTime()) / 1000 / 60) // minutes
      }));
      
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          success: true,
          data: {
            stats,
            currentUsers: liveData.currentUsers,
            currentUsersList,
            purchaseLog: liveData.purchaseLog,
            recentActivity: liveData.recentActivity,
            eventSelections: liveData.eventSelections,
            generatedAt: new Date().toISOString()
          }
        })
      };
    }
    
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ 
        success: false,
        error: 'Method not allowed' 
      })
    };
    
  } catch (error) {
    console.error('Live tracking error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ 
        success: false,
        error: 'Internal server error',
        message: error.message 
      })
    };
  }
};
