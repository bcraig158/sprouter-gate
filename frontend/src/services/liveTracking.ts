// Live Analytics Tracking Service
// Real-time tracking without persistent storage

class LiveTrackingService {
  private endpoint = '/.netlify/functions/live-tracking';
  
  // Track user login
  async trackLogin(userId: string, studentId: string, userType: string, identifier?: string) {
    try {
      await fetch(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'login',
          userId,
          studentId,
          userType,
          identifier: identifier || studentId,
          timestamp: new Date().toISOString()
        })
      });
      console.log('✅ Login tracked:', { userId, studentId, userType });
    } catch (error) {
      console.error('❌ Login tracking failed:', error);
    }
  }
  
  // Track event selection
  async trackEventSelection(userId: string, eventName: string, eventKey: string) {
    try {
      await fetch(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'event_selection',
          userId,
          eventName,
          eventKey,
          timestamp: new Date().toISOString()
        })
      });
      console.log('✅ Event selection tracked:', { userId, eventName, eventKey });
    } catch (error) {
      console.error('❌ Event selection tracking failed:', error);
    }
  }
  
  // Track purchase completion
  async trackPurchaseCompleted(data: {
    userId: string;
    studentId: string;
    eventName: string;
    eventKey: string;
    quantity: number;
    amount: number;
    transactionId?: string;
  }) {
    try {
      await fetch(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'purchase_completed',
          ...data,
          timestamp: new Date().toISOString()
        })
      });
      console.log('✅ Purchase completed tracked:', data);
    } catch (error) {
      console.error('❌ Purchase tracking failed:', error);
    }
  }
  
  // Track general user activity
  async trackActivity(userId: string, activityType: string, details?: any) {
    try {
      await fetch(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'activity',
          userId,
          activityType,
          details,
          timestamp: new Date().toISOString()
        })
      });
    } catch (error) {
      console.error('❌ Activity tracking failed:', error);
    }
  }
  
  // Get live analytics data (admin only)
  async getLiveAnalytics(token: string) {
    try {
      const response = await fetch(this.endpoint, {
        method: 'GET',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('❌ Failed to fetch live analytics:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const liveTracking = new LiveTrackingService();
export default liveTracking;
