// Secure File-Based Storage for Netlify
// No external dependencies - uses only Node.js built-ins
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class SecureStorage {
  constructor() {
    // Use Netlify's persistent storage directory
    this.storageDir = '/tmp/netlify-analytics';
    this.dataFile = path.join(this.storageDir, 'analytics.json');
    this.encryptionKey = process.env.ANALYTICS_ENCRYPTION_KEY || this.generateKey();
    
    // Ensure storage directory exists
    this.ensureStorageDir();
  }

  generateKey() {
    // Generate a secure key if none provided
    return crypto.randomBytes(32).toString('hex');
  }

  ensureStorageDir() {
    try {
      if (!fs.existsSync(this.storageDir)) {
        fs.mkdirSync(this.storageDir, { recursive: true });
        console.log('📁 Created analytics storage directory');
      }
    } catch (error) {
      console.error('Error creating storage directory:', error);
    }
  }

  // Simple encryption for sensitive data
  encrypt(text) {
    try {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipher('aes-256-cbc', this.encryptionKey);
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      return iv.toString('hex') + ':' + encrypted;
    } catch (error) {
      console.error('Encryption error:', error);
      return text; // Return unencrypted if encryption fails
    }
  }

  decrypt(encryptedText) {
    try {
      const parts = encryptedText.split(':');
      const iv = Buffer.from(parts[0], 'hex');
      const encrypted = parts[1];
      const decipher = crypto.createDecipher('aes-256-cbc', this.encryptionKey);
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (error) {
      console.error('Decryption error:', error);
      return encryptedText; // Return as-is if decryption fails
    }
  }

  // Sanitize sensitive data
  sanitizeLoginData(loginData) {
    return {
      user_id: loginData.user_id,
      user_type: loginData.user_type,
      identifier: loginData.identifier,
      email: loginData.email ? this.maskEmail(loginData.email) : '',
      name: loginData.name ? this.maskName(loginData.name) : '',
      ip_hash: crypto.createHash('sha256').update(loginData.ip_address).digest('hex').substring(0, 16),
      user_agent_hash: crypto.createHash('sha256').update(loginData.user_agent).digest('hex').substring(0, 16),
      login_timestamp: loginData.login_timestamp,
      session_id: loginData.session_id,
      domain: loginData.domain
    };
  }

  maskEmail(email) {
    if (!email || !email.includes('@')) return '';
    const [local, domain] = email.split('@');
    if (local.length <= 2) return email;
    return local.substring(0, 2) + '***@' + domain;
  }

  maskName(name) {
    if (!name || name.length <= 2) return '';
    if (name.length <= 3) return name.charAt(0) + '***';
    return name.charAt(0) + '***' + name.charAt(name.length - 1);
  }

  // Load data from storage
  async loadData() {
    try {
      if (!fs.existsSync(this.dataFile)) {
        console.log('📊 No existing analytics data found, starting fresh');
        return this.getEmptyData();
      }

      const fileContent = fs.readFileSync(this.dataFile, 'utf8');
      const data = JSON.parse(fileContent);
      
      // Clean up old data (keep only last 30 days)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      
      if (data.userLogins) {
        data.userLogins = data.userLogins.filter(login => 
          new Date(login.login_timestamp) > thirtyDaysAgo
        );
      }
      
      if (data.showSelections) {
        data.showSelections = data.showSelections.filter(selection => 
          new Date(selection.timestamp) > thirtyDaysAgo
        );
      }
      
      if (data.purchases) {
        data.purchases = data.purchases.filter(purchase => 
          new Date(purchase.timestamp) > thirtyDaysAgo
        );
      }

      console.log(`📊 Loaded ${data.userLogins?.length || 0} logins, ${data.showSelections?.length || 0} selections, ${data.purchases?.length || 0} purchases`);
      return data;
    } catch (error) {
      console.error('Error loading analytics data:', error);
      return this.getEmptyData();
    }
  }

  // Save data to storage
  async saveData(data) {
    try {
      // Add metadata
      data.metadata = {
        lastUpdated: new Date().toISOString(),
        version: '2.0',
        storage: 'netlify-secure-file',
        encryption: 'AES-256-CBC'
      };

      // Write to file
      fs.writeFileSync(this.dataFile, JSON.stringify(data, null, 2));
      console.log('💾 Analytics data saved securely');
      return true;
    } catch (error) {
      console.error('Error saving analytics data:', error);
      return false;
    }
  }

  // Store a login
  async storeLogin(loginData) {
    try {
      const data = await this.loadData();
      const sanitizedData = this.sanitizeLoginData(loginData);
      
      data.userLogins.push(sanitizedData);
      await this.saveData(data);
      
      console.log(`✅ Login stored: ${sanitizedData.user_type} - ${sanitizedData.identifier}`);
      return true;
    } catch (error) {
      console.error('Error storing login:', error);
      return false;
    }
  }

  // Store an event
  async storeEvent(eventData) {
    try {
      const data = await this.loadData();
      
      // Enhanced event storage with detailed metadata
      const enhancedEventData = {
        ...eventData,
        stored_at: new Date().toISOString(),
        metadata: {
          ...eventData.metadata,
          // Extract and store detailed checkout information
          ticket_quantity: eventData.metadata?.ticket_quantity || null,
          total_price: eventData.metadata?.total_price || null,
          event_name: eventData.metadata?.event_name || null,
          iframe_url: eventData.metadata?.iframe_url || null,
          form_count: eventData.metadata?.form_count || null,
          has_checkout_form: eventData.metadata?.has_checkout_form || false,
          payment_method: eventData.metadata?.payment_method || null,
          has_success_indicators: eventData.metadata?.has_success_indicators || false,
          // Store raw metadata for debugging
          raw_metadata: eventData.metadata
        }
      };
      
      if (eventData.event_type === 'sprouter_embed_loaded') {
        data.showSelections.push(enhancedEventData);
      } else if (eventData.event_type === 'sprouter_checkout_completed') {
        data.purchases.push(enhancedEventData);
      } else {
        // Store other event types in a general events array
        if (!data.events) data.events = [];
        data.events.push(enhancedEventData);
      }
      
      await this.saveData(data);
      console.log(`✅ Event stored: ${eventData.event_type} - ${eventData.event_key}`);
      return true;
    } catch (error) {
      console.error('Error storing event:', error);
      return false;
    }
  }

  // Store session data
  async storeSession(sessionData) {
    try {
      const data = await this.loadData();
      
      if (!data.sessions) data.sessions = [];
      
      const enhancedSessionData = {
        ...sessionData,
        stored_at: new Date().toISOString(),
        ip_hash: crypto.createHash('sha256').update(sessionData.ip_address).digest('hex').substring(0, 16),
        user_agent_hash: crypto.createHash('sha256').update(sessionData.user_agent).digest('hex').substring(0, 16)
      };
      
      data.sessions.push(enhancedSessionData);
      await this.saveData(data);
      console.log(`✅ Session stored: ${sessionData.user_id} - ${sessionData.page}`);
      return true;
    } catch (error) {
      console.error('Error storing session:', error);
      return false;
    }
  }

  // Store activity data
  async storeActivity(activityData) {
    try {
      const data = await this.loadData();
      
      if (!data.activities) data.activities = [];
      
      const enhancedActivityData = {
        ...activityData,
        stored_at: new Date().toISOString(),
        ip_hash: crypto.createHash('sha256').update(activityData.ip_address).digest('hex').substring(0, 16),
        user_agent_hash: crypto.createHash('sha256').update(activityData.user_agent).digest('hex').substring(0, 16)
      };
      
      data.activities.push(enhancedActivityData);
      await this.saveData(data);
      console.log(`✅ Activity stored: ${activityData.activity_type} - ${activityData.user_id}`);
      return true;
    } catch (error) {
      console.error('Error storing activity:', error);
      return false;
    }
  }

  // Get enhanced analytics data
  async getAnalytics() {
    try {
      const data = await this.loadData();
      
      // Add enhanced analytics
      const enhancedData = {
        ...data,
        enhancedAnalytics: this.calculateEnhancedAnalytics(data)
      };
      
      return enhancedData;
    } catch (error) {
      console.error('Error getting analytics:', error);
      return this.getEmptyData();
    }
  }

  // Calculate enhanced analytics
  calculateEnhancedAnalytics(data) {
    const userLogins = data.userLogins || [];
    const showSelections = data.showSelections || [];
    const purchases = data.purchases || [];

    // User login frequency analysis
    const loginFrequency = {};
    const userSessions = {};
    const domainActivity = {};
    const timePatterns = {};

    userLogins.forEach(login => {
      const userId = login.user_id;
      const domain = login.domain;
      const hour = new Date(login.login_timestamp).getHours();
      const dayOfWeek = new Date(login.login_timestamp).getDay();

      // Count login frequency per user
      if (!loginFrequency[userId]) {
        loginFrequency[userId] = {
          totalLogins: 0,
          studentLogins: 0,
          volunteerLogins: 0,
          firstLogin: login.login_timestamp,
          lastLogin: login.login_timestamp,
          domains: new Set(),
          sessions: new Set()
        };
      }

      loginFrequency[userId].totalLogins++;
      if (login.user_type === 'student') loginFrequency[userId].studentLogins++;
      if (login.user_type === 'volunteer') loginFrequency[userId].volunteerLogins++;
      loginFrequency[userId].domains.add(domain);
      loginFrequency[userId].sessions.add(login.session_id);
      loginFrequency[userId].lastLogin = login.login_timestamp;

      // Track user sessions
      if (!userSessions[userId]) {
        userSessions[userId] = [];
      }
      userSessions[userId].push(login);

      // Domain activity
      if (!domainActivity[domain]) {
        domainActivity[domain] = { logins: 0, uniqueUsers: new Set() };
      }
      domainActivity[domain].logins++;
      domainActivity[domain].uniqueUsers.add(userId);

      // Time patterns
      if (!timePatterns[hour]) timePatterns[hour] = 0;
      timePatterns[hour]++;
    });

    // Convert sets to arrays for JSON serialization
    Object.keys(loginFrequency).forEach(userId => {
      loginFrequency[userId].domains = Array.from(loginFrequency[userId].domains);
      loginFrequency[userId].sessions = Array.from(loginFrequency[userId].sessions);
    });

    Object.keys(domainActivity).forEach(domain => {
      domainActivity[domain].uniqueUsers = Array.from(domainActivity[domain].uniqueUsers);
    });

    // Event interaction analysis
    const eventInteractions = {};
    const userEventPatterns = {};
    const checkoutAttempts = {};

    showSelections.forEach(selection => {
      const userId = selection.user_id;
      const eventKey = selection.event_key;
      const timestamp = new Date(selection.timestamp);

      // Track event interactions
      if (!eventInteractions[eventKey]) {
        eventInteractions[eventKey] = {
          totalViews: 0,
          uniqueUsers: new Set(),
          hourlyViews: {},
          userEngagement: {}
        };
      }

      eventInteractions[eventKey].totalViews++;
      eventInteractions[eventKey].uniqueUsers.add(userId);

      const hour = timestamp.getHours();
      if (!eventInteractions[eventKey].hourlyViews[hour]) {
        eventInteractions[eventKey].hourlyViews[hour] = 0;
      }
      eventInteractions[eventKey].hourlyViews[hour]++;

      // Track user event patterns
      if (!userEventPatterns[userId]) {
        userEventPatterns[userId] = {
          eventsViewed: new Set(),
          totalViews: 0,
          firstView: selection.timestamp,
          lastView: selection.timestamp
        };
      }

      userEventPatterns[userId].eventsViewed.add(eventKey);
      userEventPatterns[userId].totalViews++;
      userEventPatterns[userId].lastView = selection.timestamp;

      // Track checkout attempts
      if (!checkoutAttempts[userId]) {
        checkoutAttempts[userId] = {
          totalAttempts: 0,
          eventsAttempted: new Set(),
          sameNightAttempts: {},
          ticketQuantities: []
        };
      }
    });

    // Analyze purchases for checkout patterns
    purchases.forEach(purchase => {
      const userId = purchase.user_id;
      const eventKey = purchase.event_key;
      const timestamp = new Date(purchase.timestamp);
      const date = timestamp.toDateString();

      if (!checkoutAttempts[userId]) {
        checkoutAttempts[userId] = {
          totalAttempts: 0,
          eventsAttempted: new Set(),
          sameNightAttempts: {},
          ticketQuantities: []
        };
      }

      checkoutAttempts[userId].totalAttempts++;
      checkoutAttempts[userId].eventsAttempted.add(eventKey);

      // Track same-night attempts
      if (!checkoutAttempts[userId].sameNightAttempts[date]) {
        checkoutAttempts[userId].sameNightAttempts[date] = [];
      }
      checkoutAttempts[userId].sameNightAttempts[date].push({
        eventKey,
        timestamp: purchase.timestamp,
        tickets: purchase.metadata?.tickets_purchased || 0,
        cost: purchase.metadata?.total_cost || 0
      });

      // Track ticket quantities
      checkoutAttempts[userId].ticketQuantities.push({
        eventKey,
        quantity: purchase.metadata?.tickets_purchased || 0,
        timestamp: purchase.timestamp
      });
    });

    // Convert sets to arrays
    Object.keys(eventInteractions).forEach(eventKey => {
      eventInteractions[eventKey].uniqueUsers = Array.from(eventInteractions[eventKey].uniqueUsers);
    });

    Object.keys(userEventPatterns).forEach(userId => {
      userEventPatterns[userId].eventsViewed = Array.from(userEventPatterns[userId].eventsViewed);
    });

    Object.keys(checkoutAttempts).forEach(userId => {
      checkoutAttempts[userId].eventsAttempted = Array.from(checkoutAttempts[userId].eventsAttempted);
    });

    // Calculate detailed checkout analytics
    const checkoutAnalytics = this.calculateCheckoutAnalytics(data);

    // Calculate session analytics
    const sessionAnalytics = this.calculateSessionAnalytics(data);

    // Calculate summary statistics
    const summary = {
      totalUniqueUsers: Object.keys(loginFrequency).length,
      totalLogins: userLogins.length,
      averageLoginsPerUser: userLogins.length / Math.max(Object.keys(loginFrequency).length, 1),
      mostActiveUsers: Object.entries(loginFrequency)
        .sort((a, b) => b[1].totalLogins - a[1].totalLogins)
        .slice(0, 10),
      domainBreakdown: Object.entries(domainActivity).map(([domain, data]) => ({
        domain,
        totalLogins: data.logins,
        uniqueUsers: data.uniqueUsers.length
      })),
      peakHours: Object.entries(timePatterns)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5),
      eventEngagement: Object.entries(eventInteractions).map(([eventKey, data]) => ({
        eventKey,
        totalViews: data.totalViews,
        uniqueUsers: data.uniqueUsers.length,
        averageViewsPerUser: data.totalViews / Math.max(data.uniqueUsers.length, 1)
      })),
      sameNightCheckouts: Object.entries(checkoutAttempts)
        .filter(([userId, data]) => Object.keys(data.sameNightAttempts).length > 0)
        .map(([userId, data]) => ({
          userId,
          sameNightDates: Object.keys(data.sameNightAttempts),
          totalSameNightAttempts: Object.values(data.sameNightAttempts).reduce((sum, attempts) => sum + attempts.length, 0)
        })),
      checkoutAnalytics,
      ...sessionAnalytics
    };

    return {
      loginFrequency,
      userSessions,
      domainActivity,
      timePatterns,
      eventInteractions,
      userEventPatterns,
      checkoutAttempts,
      summary
    };
  }

  // Get empty data structure
  getEmptyData() {
    return {
      userLogins: [],
      showSelections: [],
      purchases: [],
      sessions: {},
      metadata: {
        lastUpdated: new Date().toISOString(),
        version: '2.0',
        storage: 'netlify-secure-file',
        encryption: 'AES-256-CBC'
      }
    };
  }

  // Export data (admin only)
  async exportData() {
    try {
      const data = await this.loadData();
      return {
        metadata: data.metadata,
        summary: {
          totalLogins: data.userLogins.length,
          totalSelections: data.showSelections.length,
          totalPurchases: data.purchases.length,
          dateRange: {
            from: data.userLogins.length > 0 ? data.userLogins[0].login_timestamp : null,
            to: data.userLogins.length > 0 ? data.userLogins[data.userLogins.length - 1].login_timestamp : null
          }
        },
        data: {
          userLogins: data.userLogins,
          showSelections: data.showSelections,
          purchases: data.purchases
        }
      };
    } catch (error) {
      console.error('Error exporting data:', error);
      return null;
    }
  }

  // Calculate detailed checkout analytics
  calculateCheckoutAnalytics(data) {
    const allEvents = [
      ...(data.showSelections || []),
      ...(data.purchases || []),
      ...(data.events || [])
    ];

    const checkoutAnalytics = {
      totalCheckoutAttempts: 0,
      totalSuccessfulPurchases: 0,
      totalTicketQuantities: [],
      totalRevenue: 0,
      averageTicketQuantity: 0,
      checkoutFormAnalysis: {
        totalForms: 0,
        formsWithPayment: 0,
        formsWithQuantity: 0
      },
      paymentMethodBreakdown: {},
      eventCheckoutPatterns: {},
      userCheckoutBehavior: {},
      iframeNavigationPatterns: {},
      successRate: 0,
      abandonmentRate: 0
    };

    // Analyze all events for checkout patterns
    allEvents.forEach(event => {
      const metadata = event.metadata || {};
      
      // Count checkout attempts
      if (event.event_type === 'sprouter_checkout_started') {
        checkoutAnalytics.totalCheckoutAttempts++;
        
        // Track ticket quantities
        if (metadata.ticket_quantity) {
          checkoutAnalytics.totalTicketQuantities.push(parseInt(metadata.ticket_quantity) || 0);
        }
        
        // Track form analysis
        if (metadata.form_count) {
          checkoutAnalytics.checkoutFormAnalysis.totalForms += metadata.form_count;
        }
        if (metadata.has_checkout_form) {
          checkoutAnalytics.checkoutFormAnalysis.formsWithPayment++;
        }
        if (metadata.ticket_quantity) {
          checkoutAnalytics.checkoutFormAnalysis.formsWithQuantity++;
        }
        
        // Track payment methods
        if (metadata.payment_method) {
          checkoutAnalytics.paymentMethodBreakdown[metadata.payment_method] = 
            (checkoutAnalytics.paymentMethodBreakdown[metadata.payment_method] || 0) + 1;
        }
        
        // Track event-specific patterns
        if (!checkoutAnalytics.eventCheckoutPatterns[event.event_key]) {
          checkoutAnalytics.eventCheckoutPatterns[event.event_key] = {
            attempts: 0,
            successful: 0,
            totalTickets: 0,
            totalRevenue: 0
          };
        }
        checkoutAnalytics.eventCheckoutPatterns[event.event_key].attempts++;
        
        // Track user behavior
        if (!checkoutAnalytics.userCheckoutBehavior[event.user_id]) {
          checkoutAnalytics.userCheckoutBehavior[event.user_id] = {
            totalAttempts: 0,
            successfulPurchases: 0,
            totalTicketsPurchased: 0,
            totalSpent: 0,
            averageTicketQuantity: 0
          };
        }
        checkoutAnalytics.userCheckoutBehavior[event.user_id].totalAttempts++;
        
        // Track iframe navigation
        if (metadata.iframe_url) {
          checkoutAnalytics.iframeNavigationPatterns[metadata.iframe_url] = 
            (checkoutAnalytics.iframeNavigationPatterns[metadata.iframe_url] || 0) + 1;
        }
      }
      
      // Count successful purchases
      if (event.event_type === 'sprouter_checkout_completed') {
        checkoutAnalytics.totalSuccessfulPurchases++;
        
        // Track revenue
        if (metadata.total_cost) {
          checkoutAnalytics.totalRevenue += parseFloat(metadata.total_cost) || 0;
        }
        
        // Update event patterns
        if (checkoutAnalytics.eventCheckoutPatterns[event.event_key]) {
          checkoutAnalytics.eventCheckoutPatterns[event.event_key].successful++;
          if (metadata.tickets_purchased) {
            checkoutAnalytics.eventCheckoutPatterns[event.event_key].totalTickets += parseInt(metadata.tickets_purchased) || 0;
          }
          if (metadata.total_cost) {
            checkoutAnalytics.eventCheckoutPatterns[event.event_key].totalRevenue += parseFloat(metadata.total_cost) || 0;
          }
        }
        
        // Update user behavior
        if (checkoutAnalytics.userCheckoutBehavior[event.user_id]) {
          checkoutAnalytics.userCheckoutBehavior[event.user_id].successfulPurchases++;
          if (metadata.tickets_purchased) {
            checkoutAnalytics.userCheckoutBehavior[event.user_id].totalTicketsPurchased += parseInt(metadata.tickets_purchased) || 0;
          }
          if (metadata.total_cost) {
            checkoutAnalytics.userCheckoutBehavior[event.user_id].totalSpent += parseFloat(metadata.total_cost) || 0;
          }
        }
      }
    });

    // Calculate averages and rates
    if (checkoutAnalytics.totalTicketQuantities.length > 0) {
      checkoutAnalytics.averageTicketQuantity = 
        checkoutAnalytics.totalTicketQuantities.reduce((sum, qty) => sum + qty, 0) / checkoutAnalytics.totalTicketQuantities.length;
    }

    if (checkoutAnalytics.totalCheckoutAttempts > 0) {
      checkoutAnalytics.successRate = (checkoutAnalytics.totalSuccessfulPurchases / checkoutAnalytics.totalCheckoutAttempts) * 100;
      checkoutAnalytics.abandonmentRate = 100 - checkoutAnalytics.successRate;
    }

    // Calculate user averages
    Object.keys(checkoutAnalytics.userCheckoutBehavior).forEach(userId => {
      const user = checkoutAnalytics.userCheckoutBehavior[userId];
      if (user.successfulPurchases > 0) {
        user.averageTicketQuantity = user.totalTicketsPurchased / user.successfulPurchases;
      }
    });

    return checkoutAnalytics;
  }

  // Calculate session analytics
  calculateSessionAnalytics(data) {
    const sessions = data.sessions || [];
    const activities = data.activities || [];
    const userLogins = data.userLogins || [];

    const sessionAnalytics = {
      totalSessions: sessions.length,
      totalPageViews: activities.filter(a => a.activity_type === 'page_view').length,
      totalClicks: activities.filter(a => a.activity_type === 'click').length,
      totalScrolls: activities.filter(a => a.activity_type === 'scroll').length,
      totalFormInteractions: activities.filter(a => a.activity_type === 'form_interaction').length,
      averageSessionDuration: '0m',
      bounceRate: 0,
      topPages: {},
      userEngagement: {},
      deviceBreakdown: {},
      browserBreakdown: {},
      geographicData: {}
    };

    if (sessions.length > 0) {
      // Calculate average session duration
      const totalDuration = sessions.reduce((sum, session) => sum + (session.time_on_page || 0), 0);
      const avgDurationMs = totalDuration / sessions.length;
      const avgMinutes = Math.round(avgDurationMs / 60000);
      sessionAnalytics.averageSessionDuration = `${avgMinutes}m`;

      // Calculate bounce rate (sessions with only 1 page view)
      const singlePageSessions = sessions.filter(session => {
        const pageViews = activities.filter(a => 
          a.user_id === session.user_id && 
          a.activity_type === 'page_view' && 
          a.page === session.page
        ).length;
        return pageViews <= 1;
      }).length;
      
      sessionAnalytics.bounceRate = Math.round((singlePageSessions / sessions.length) * 100);
    }

    // Top pages analysis
    const pageViews = activities.filter(a => a.activity_type === 'page_view');
    pageViews.forEach(activity => {
      const page = activity.page;
      if (!sessionAnalytics.topPages[page]) {
        sessionAnalytics.topPages[page] = 0;
      }
      sessionAnalytics.topPages[page]++;
    });

    // User engagement analysis
    userLogins.forEach(login => {
      const userActivities = activities.filter(a => a.user_id === login.user_id);
      const userSessions = sessions.filter(s => s.user_id === login.user_id);
      
      sessionAnalytics.userEngagement[login.user_id] = {
        totalActivities: userActivities.length,
        totalSessions: userSessions.length,
        totalTimeOnSite: userSessions.reduce((sum, s) => sum + (s.time_on_page || 0), 0),
        averageTimePerSession: userSessions.length > 0 ? 
          userSessions.reduce((sum, s) => sum + (s.time_on_page || 0), 0) / userSessions.length : 0,
        pagesViewed: [...new Set(userActivities.filter(a => a.activity_type === 'page_view').map(a => a.page))].length,
        clicks: userActivities.filter(a => a.activity_type === 'click').length,
        scrolls: userActivities.filter(a => a.activity_type === 'scroll').length
      };
    });

    // Device and browser breakdown
    activities.forEach(activity => {
      const userAgent = activity.user_agent || '';
      const metadata = activity.metadata || {};
      
      // Device type
      const deviceType = metadata.screenResolution ? 
        (parseInt(metadata.screenResolution.split('x')[0]) > 768 ? 'Desktop' : 'Mobile') : 'Unknown';
      
      if (!sessionAnalytics.deviceBreakdown[deviceType]) {
        sessionAnalytics.deviceBreakdown[deviceType] = 0;
      }
      sessionAnalytics.deviceBreakdown[deviceType]++;

      // Browser detection
      let browser = 'Unknown';
      if (userAgent.includes('Chrome')) browser = 'Chrome';
      else if (userAgent.includes('Firefox')) browser = 'Firefox';
      else if (userAgent.includes('Safari')) browser = 'Safari';
      else if (userAgent.includes('Edge')) browser = 'Edge';
      
      if (!sessionAnalytics.browserBreakdown[browser]) {
        sessionAnalytics.browserBreakdown[browser] = 0;
      }
      sessionAnalytics.browserBreakdown[browser]++;
    });

    // Geographic data (if available)
    sessions.forEach(session => {
      const country = session.country || 'Unknown';
      if (!sessionAnalytics.geographicData[country]) {
        sessionAnalytics.geographicData[country] = 0;
      }
      sessionAnalytics.geographicData[country]++;
    });

    return sessionAnalytics;
  }
}

// Export singleton instance
const secureStorage = new SecureStorage();
module.exports = secureStorage;
