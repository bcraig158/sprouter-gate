// Event tracking service for Sprouter embedded widgets
interface TrackingEvent {
  eventKey: string;
  eventType: 'sprouter_embed_loaded' | 'sprouter_checkout_started' | 'sprouter_checkout_completed' | 'sprouter_checkout_abandoned';
  userId: string;
  userType: 'student' | 'volunteer';
  metadata?: Record<string, any>;
}

class EventTracker {
  private userId: string | null = null;
  private userType: 'student' | 'volunteer' | null = null;
  private trackedEvents: Set<string> = new Set();

  setUser(userId: string, userType: 'student' | 'volunteer') {
    this.userId = userId;
    this.userType = userType;
  }

  async trackEvent(event: TrackingEvent): Promise<boolean> {
    if (!this.userId || !this.userType) {
      console.warn('EventTracker: User not set, cannot track event');
      return false;
    }

    // Prevent duplicate tracking
    const eventKey = `${event.eventKey}-${event.eventType}`;
    if (this.trackedEvents.has(eventKey)) {
      return true;
    }

    try {
      const response = await fetch('/api/track-event', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...event,
          userId: this.userId,
          userType: this.userType
        })
      });

      if (response.ok) {
        this.trackedEvents.add(eventKey);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Event tracking failed:', error);
      return false;
    }
  }

  // Track when Sprouter iframe loads
  trackEmbedLoaded(eventKey: string) {
    return this.trackEvent({
      eventKey,
      eventType: 'sprouter_embed_loaded',
      userId: this.userId!,
      userType: this.userType!
    });
  }

  // Track when user starts checkout process
  trackCheckoutStarted(eventKey: string) {
    return this.trackEvent({
      eventKey,
      eventType: 'sprouter_checkout_started',
      userId: this.userId!,
      userType: this.userType!
    });
  }

  // Track successful purchase completion
  trackCheckoutCompleted(eventKey: string, metadata: { total_cost: number; tickets_purchased: number; payment_method: string }) {
    return this.trackEvent({
      eventKey,
      eventType: 'sprouter_checkout_completed',
      userId: this.userId!,
      userType: this.userType!,
      metadata
    });
  }

  // Track abandoned checkout
  trackCheckoutAbandoned(eventKey: string) {
    return this.trackEvent({
      eventKey,
      eventType: 'sprouter_checkout_abandoned',
      userId: this.userId!,
      userType: this.userType!
    });
  }

  // Monitor iframe for Sprouter events
  setupIframeTracking(iframe: HTMLIFrameElement, eventKey: string) {
    if (!iframe) return;

    // Track when iframe loads
    iframe.addEventListener('load', () => {
      this.trackEmbedLoaded(eventKey);
    });

    // Monitor for Sprouter-specific events via postMessage
    const handleMessage = (event: MessageEvent) => {
      // Only accept messages from Sprouter domains
      if (!event.origin.includes('sprouter.online')) {
        return;
      }

      try {
        const data = event.data;
        
        if (data.type === 'sprouter_checkout_started') {
          this.trackCheckoutStarted(eventKey);
        } else if (data.type === 'sprouter_checkout_completed') {
          this.trackCheckoutCompleted(eventKey, {
            total_cost: data.total_cost || 0,
            tickets_purchased: data.tickets_purchased || 0,
            payment_method: data.payment_method || 'unknown'
          });
        } else if (data.type === 'sprouter_checkout_abandoned') {
          this.trackCheckoutAbandoned(eventKey);
        }
      } catch (error) {
        console.error('Error processing Sprouter message:', error);
      }
    };

    window.addEventListener('message', handleMessage);

    // Cleanup function
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }

  // Track page visibility changes (for abandonment detection)
  setupAbandonmentTracking(eventKey: string) {
    let startTime = Date.now();
    let isVisible = true;

    const handleVisibilityChange = () => {
      if (document.hidden && isVisible) {
        // User left the page, track abandonment if they were on checkout
        const timeOnPage = Date.now() - startTime;
        if (timeOnPage > 30000) { // Only track if they spent more than 30 seconds
          this.trackCheckoutAbandoned(eventKey);
        }
        isVisible = false;
      } else if (!document.hidden && !isVisible) {
        // User returned to the page
        startTime = Date.now();
        isVisible = true;
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup function
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }
}

// Export singleton instance
export const eventTracker = new EventTracker();
export default eventTracker;
