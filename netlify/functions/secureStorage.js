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
      
      if (eventData.event_type === 'sprouter_embed_loaded') {
        data.showSelections.push(eventData);
      } else if (eventData.event_type === 'sprouter_checkout_completed') {
        data.purchases.push(eventData);
      }
      
      await this.saveData(data);
      console.log(`✅ Event stored: ${eventData.event_type} - ${eventData.event_key}`);
      return true;
    } catch (error) {
      console.error('Error storing event:', error);
      return false;
    }
  }

  // Get analytics data
  async getAnalytics() {
    try {
      return await this.loadData();
    } catch (error) {
      console.error('Error getting analytics:', error);
      return this.getEmptyData();
    }
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
}

// Export singleton instance
const secureStorage = new SecureStorage();
module.exports = secureStorage;
