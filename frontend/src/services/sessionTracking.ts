// Comprehensive session tracking service
interface SessionData {
  userId: string;
  userType: 'student' | 'volunteer';
  sessionId: string;
  page: string;
  timeOnPage: number;
  referrer: string;
}

interface ActivityData {
  userId: string;
  userType: 'student' | 'volunteer';
  activityType: 'page_view' | 'click' | 'scroll' | 'form_interaction' | 'time_on_page' | 'focus' | 'blur';
  page: string;
  metadata?: Record<string, any>;
}

class SessionTracker {
  private userId: string | null = null;
  private userType: 'student' | 'volunteer' | null = null;
  private sessionId: string | null = null;
  private pageStartTime: number = Date.now();
  private currentPage: string = '';
  private isTracking: boolean = false;
  private activityQueue: ActivityData[] = [];
  private sessionQueue: SessionData[] = [];
  private sessionTimeout: number = 30 * 60 * 1000; // 30 minutes
  private flushInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Try to restore session from localStorage on initialization
    this.restoreSession();
  }

  // Restore session from localStorage
  private restoreSession() {
    try {
      // Check for our standard session storage keys
      const token = localStorage.getItem('token');
      const user = localStorage.getItem('user');
      const sessionId = localStorage.getItem('sessionId');
      
      if (token && user && sessionId) {
        const userData = JSON.parse(user);
        const now = Date.now();
        
        // Check if session is still valid (within timeout)
        if (now - (userData.timestamp || 0) < this.sessionTimeout) {
          this.userId = userData.household_id || userData.student_id;
          this.userType = userData.type === 'volunteer' ? 'volunteer' : 'student';
          this.sessionId = sessionId;
          this.isTracking = true;
          
          this.setupPageTracking();
          this.setupActivityTracking();
          this.setupPeriodicFlush();
          
          console.log(`SessionTracker: Restored session for ${this.userType} ${this.userId}`);
        } else {
          // Session expired, clear it
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          localStorage.removeItem('sessionId');
          console.log('SessionTracker: Session expired, cleared');
        }
      }
    } catch (error) {
      console.warn('SessionTracker: Failed to restore session:', error);
      // Clear invalid session data
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('sessionId');
    }
  }

  // Initialize tracking for a user
  initialize(userId: string, userType: 'student' | 'volunteer', sessionId: string) {
    this.userId = userId;
    this.userType = userType;
    this.sessionId = sessionId;
    this.isTracking = true;
    
    // Store session info in localStorage for persistence (using standard keys)
    const userData = {
      household_id: userId,
      student_id: userId,
      type: userType,
      timestamp: Date.now()
    };
    
    // Update the user data in localStorage if it exists
    const existingUser = localStorage.getItem('user');
    if (existingUser) {
      try {
        const parsedUser = JSON.parse(existingUser);
        const updatedUser = { ...parsedUser, ...userData };
        localStorage.setItem('user', JSON.stringify(updatedUser));
      } catch (error) {
        console.warn('Failed to update user data:', error);
      }
    }
    
    this.setupPageTracking();
    this.setupActivityTracking();
    this.setupPeriodicFlush();
    
    // Immediately track the current page
    this.trackPageView(window.location.pathname);
    
    console.log(`SessionTracker: Initialized for ${userType} ${userId}`);
  }

  // Track page views and time on page
  trackPageView(page: string) {
    if (!this.isTracking || !this.userId || !this.userType || !this.sessionId) return;

    const now = Date.now();
    const timeOnPage = now - this.pageStartTime;

    // Track previous page if we have one
    if (this.currentPage && this.currentPage !== page) {
      this.trackSessionData(this.currentPage, timeOnPage);
    }

    // Start tracking new page
    this.currentPage = page;
    this.pageStartTime = now;

    // Track page view activity
    this.trackActivity('page_view', page, {
      referrer: document.referrer,
      url: window.location.href,
      timestamp: new Date().toISOString()
    });

    // Also track session data immediately for login pages
    if (page.includes('login') || page.includes('select') || page.includes('purchase')) {
      this.trackSessionData(page, 1000); // Track 1 second on login/select pages
    }

    console.log(`SessionTracker: Page view tracked - ${page}`);
  }

  // Track user activities
  trackActivity(activityType: ActivityData['activityType'], page: string, metadata: Record<string, any> = {}) {
    if (!this.isTracking || !this.userId || !this.userType) return;

    const activityData: ActivityData = {
      userId: this.userId,
      userType: this.userType,
      activityType,
      page,
      metadata: {
        ...metadata,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        screenResolution: `${screen.width}x${screen.height}`,
        viewportSize: `${window.innerWidth}x${window.innerHeight}`,
        language: navigator.language,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      }
    };

    this.activityQueue.push(activityData);
    this.flushActivityQueue();
  }

  // Track session data
  private trackSessionData(page: string, timeOnPage: number) {
    if (!this.userId || !this.userType || !this.sessionId) return;

    const sessionData: SessionData = {
      userId: this.userId,
      userType: this.userType,
      sessionId: this.sessionId,
      page,
      timeOnPage,
      referrer: document.referrer
    };

    this.sessionQueue.push(sessionData);
    this.flushSessionQueue();
  }

  // Setup automatic page tracking
  private setupPageTracking() {
    // Track initial page
    this.trackPageView(window.location.pathname);

    // Track page changes (for SPA navigation)
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function(...args) {
      originalPushState.apply(history, args);
      sessionTracker.trackPageView(window.location.pathname);
    };

    history.replaceState = function(...args) {
      originalReplaceState.apply(history, args);
      sessionTracker.trackPageView(window.location.pathname);
    };

    // Track page unload with beacon API for guaranteed delivery
    window.addEventListener('beforeunload', () => {
      if (this.currentPage) {
        const timeOnPage = Date.now() - this.pageStartTime;
        this.trackSessionData(this.currentPage, timeOnPage);
      }
      
      // Use sendBeacon for guaranteed delivery
      this.sendBeacon();
    });

    // Track visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.trackActivity('blur', this.currentPage, {
          reason: 'page_hidden',
          timeOnPage: Date.now() - this.pageStartTime
        });
      } else {
        this.trackActivity('focus', this.currentPage, {
          reason: 'page_visible',
          timeOnPage: Date.now() - this.pageStartTime
        });
      }
    });
  }

  // Setup activity tracking
  private setupActivityTracking() {
    // Track clicks
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      this.trackActivity('click', this.currentPage, {
        element: target.tagName,
        id: target.id,
        className: target.className,
        text: target.textContent?.substring(0, 100),
        x: event.clientX,
        y: event.clientY
      });
    });

    // Track scroll events (throttled)
    let scrollTimeout: NodeJS.Timeout;
    window.addEventListener('scroll', () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        this.trackActivity('scroll', this.currentPage, {
          scrollY: window.scrollY,
          scrollX: window.scrollX,
          documentHeight: document.documentElement.scrollHeight,
          viewportHeight: window.innerHeight
        });
      }, 1000);
    });

    // Track form interactions
    document.addEventListener('input', (event) => {
      const target = event.target as HTMLInputElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
        this.trackActivity('form_interaction', this.currentPage, {
          element: target.tagName,
          type: target.type,
          name: target.name,
          id: target.id,
          value: target.value?.substring(0, 50) // Truncate for privacy
        });
      }
    });

    // Track time on page (every 30 seconds)
    setInterval(() => {
      if (this.isTracking && this.currentPage) {
        const timeOnPage = Date.now() - this.pageStartTime;
        this.trackActivity('time_on_page', this.currentPage, {
          timeOnPage,
          sessionDuration: timeOnPage
        });
      }
    }, 30000);
  }

  // Flush activity queue
  private async flushActivityQueue() {
    if (this.activityQueue.length === 0) return;

    const activities = [...this.activityQueue];
    this.activityQueue = [];

    try {
      console.log('SessionTracker: Sending activities to backend:', activities);
      const response = await fetch('/api/track-activity', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(activities)
      });

      if (response.ok) {
        console.log(`✅ SessionTracker: Successfully flushed ${activities.length} activities`);
      } else {
        console.warn(`⚠️ SessionTracker: Failed to send activities, status: ${response.status}`);
        // Re-queue failed activities (limit to prevent infinite loops)
        if (this.activityQueue.length < 100) {
          this.activityQueue.unshift(...activities);
        }
      }
    } catch (error) {
      console.error('SessionTracker: Failed to flush activities:', error);
      // Re-queue failed activities (limit to prevent infinite loops)
      if (this.activityQueue.length < 100) {
        this.activityQueue.unshift(...activities);
      }
    }
  }

  // Flush session queue
  private async flushSessionQueue() {
    if (this.sessionQueue.length === 0) return;

    const sessions = [...this.sessionQueue];
    this.sessionQueue = [];

    try {
      console.log('SessionTracker: Sending sessions to backend:', sessions);
      const response = await fetch('/api/track-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sessions)
      });

      if (response.ok) {
        console.log(`✅ SessionTracker: Successfully flushed ${sessions.length} sessions`);
      } else {
        console.warn(`⚠️ SessionTracker: Failed to send sessions, status: ${response.status}`);
        // Re-queue failed sessions (limit to prevent infinite loops)
        if (this.sessionQueue.length < 50) {
          this.sessionQueue.unshift(...sessions);
        }
      }
    } catch (error) {
      console.error('SessionTracker: Failed to flush sessions:', error);
      // Re-queue failed sessions (limit to prevent infinite loops)
      if (this.sessionQueue.length < 50) {
        this.sessionQueue.unshift(...sessions);
      }
    }
  }

  // Stop tracking
  stop() {
    this.isTracking = false;
    
    // Clear periodic flush
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
    
    // Track final page if we have one
    if (this.currentPage) {
      const timeOnPage = Date.now() - this.pageStartTime;
      this.trackSessionData(this.currentPage, timeOnPage);
    }

    // Flush remaining data
    this.flushActivityQueue();
    this.flushSessionQueue();

    // Clear localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('sessionId');

    console.log('SessionTracker: Stopped tracking');
  }

  // Force flush all pending data
  async forceFlush() {
    console.log('SessionTracker: Force flushing all data');
    await this.flushActivityQueue();
    await this.flushSessionQueue();
  }

  // Setup periodic data flushing
  private setupPeriodicFlush() {
    // Clear existing interval
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    
    // Flush data every 30 seconds
    this.flushInterval = setInterval(() => {
      if (this.isTracking) {
        this.flushActivityQueue();
        this.flushSessionQueue();
      }
    }, 30000);
  }

  // Send data using beacon API for guaranteed delivery
  private sendBeacon() {
    if (!this.isTracking || (!this.activityQueue.length && !this.sessionQueue.length)) {
      return;
    }

    const data = {
      activities: [...this.activityQueue],
      sessions: [...this.sessionQueue]
    };

    try {
      // Use sendBeacon for guaranteed delivery
      const success = navigator.sendBeacon('/api/track-batch', JSON.stringify(data));
      if (success) {
        console.log('✅ SessionTracker: Data sent via beacon API');
        this.activityQueue = [];
        this.sessionQueue = [];
      } else {
        console.warn('⚠️ SessionTracker: Beacon API failed, data may be lost');
      }
    } catch (error) {
      console.error('SessionTracker: Beacon API error:', error);
    }
  }

  // Get current session info
  getSessionInfo() {
    return {
      userId: this.userId,
      userType: this.userType,
      sessionId: this.sessionId,
      currentPage: this.currentPage,
      timeOnCurrentPage: Date.now() - this.pageStartTime,
      isTracking: this.isTracking
    };
  }
}

// Export singleton instance
export const sessionTracker = new SessionTracker();
export default sessionTracker;
