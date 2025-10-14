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
      // Use AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
      
      const response = await fetch('/api/track-event', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventKey: event.eventKey,
          eventType: event.eventType,
          userId: this.userId,
          userType: this.userType,
          metadata: event.metadata
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        this.trackedEvents.add(eventKey);
        console.log('✅ Event tracked successfully:', event.eventType);
        return true;
      } else {
        console.warn('⚠️ Event tracking failed with status:', response.status);
        return false;
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        console.warn('Event tracking timeout, skipping:', event.eventType);
      } else {
        console.error('Event tracking failed:', error);
      }
      // Don't throw - tracking failures should not affect app functionality
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
      
      // Set up comprehensive monitoring after iframe loads
      this.setupComprehensiveMonitoring(iframe, eventKey);
    });

    // Monitor for Sprouter-specific events via postMessage
    const handleMessage = (event: MessageEvent) => {
      // Accept messages from Sprouter domains and our own domain
      if (!event.origin.includes('sprouter') && !event.origin.includes('maidutickets')) {
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

  // Comprehensive iframe monitoring for checkout details
  setupComprehensiveMonitoring(iframe: HTMLIFrameElement, eventKey: string) {
    let monitoringInterval: NodeJS.Timeout;
    let lastUrl = '';
    let checkoutStarted = false;

    // Monitor iframe content changes
    const monitorIframe = () => {
      try {
        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
        const currentUrl = iframe.contentWindow?.location.href || '';
        
        // Check if URL changed (indicates navigation)
        if (currentUrl !== lastUrl) {
          lastUrl = currentUrl;
          
          // Check for checkout indicators in URL
          if (currentUrl.includes('checkout') || currentUrl.includes('payment') || currentUrl.includes('confirm')) {
            if (!checkoutStarted) {
              checkoutStarted = true;
              this.trackCheckoutStarted(eventKey);
            }
          }
        }

        // If we can access the iframe content, extract checkout data
        if (iframeDoc) {
          const checkoutData = this.extractCheckoutData(iframeDoc);
          
          if (checkoutData.ticket_quantity || checkoutData.total_price) {
            if (!checkoutStarted) {
              checkoutStarted = true;
              this.trackCheckoutStarted(eventKey);
            }
            
            // Track detailed checkout information
            this.trackEvent({
              eventKey,
              eventType: 'sprouter_checkout_started',
              userId: this.userId!,
              userType: this.userType!,
              metadata: {
                ...checkoutData,
                iframe_url: currentUrl,
                timestamp: new Date().toISOString()
              }
            });
          }
        }
      } catch (error) {
        // Cross-origin restrictions - this is expected for external iframes
        console.log('Cross-origin iframe detected, using postMessage monitoring only');
      }
    };

    // Start monitoring
    monitoringInterval = setInterval(monitorIframe, 2000); // Check every 2 seconds

    // Cleanup function
    return () => {
      if (monitoringInterval) {
        clearInterval(monitoringInterval);
      }
    };
  }

  // Extract checkout data from iframe content
  extractCheckoutData(doc: Document) {
    const data: any = {};
    
    try {
      // Look for ticket quantity
      const quantitySelectors = [
        'input[name*="quantity"]',
        'select[name*="quantity"]',
        '.quantity',
        '.ticket-quantity',
        '[data-quantity]',
        'input[type="number"]'
      ];
      
      for (const selector of quantitySelectors) {
        const element = doc.querySelector(selector) as HTMLInputElement;
        if (element) {
          data.ticket_quantity = element.value || element.textContent || element.getAttribute('data-quantity');
          break;
        }
      }

      // Look for total price
      const priceSelectors = [
        '.total',
        '.price',
        '.amount',
        '[data-total]',
        '.checkout-total',
        '.final-price',
        '.grand-total'
      ];
      
      for (const selector of priceSelectors) {
        const element = doc.querySelector(selector) as HTMLInputElement;
        if (element) {
          data.total_price = element.textContent || element.value;
          break;
        }
      }

      // Look for event details
      const eventSelectors = [
        '.event-name',
        '.show-title',
        '[data-event]',
        '.ticket-event',
        'h1',
        'h2',
        '.title'
      ];
      
      for (const selector of eventSelectors) {
        const element = doc.querySelector(selector);
        if (element) {
          data.event_name = element.textContent;
          break;
        }
      }

      // Look for form data
      const forms = doc.querySelectorAll('form');
      if (forms.length > 0) {
        data.form_count = forms.length;
        data.has_checkout_form = true;
      }

      // Look for payment method indicators
      const paymentSelectors = [
        'input[name*="payment"]',
        'input[name*="card"]',
        '.payment-method',
        '[data-payment]'
      ];
      
      for (const selector of paymentSelectors) {
        const element = doc.querySelector(selector) as HTMLInputElement;
        if (element) {
          data.payment_method = element.value || element.textContent;
          break;
        }
      }

      // Check for confirmation/success indicators
      const successIndicators = [
        'success', 'confirmed', 'completed', 'thank you', 'purchase complete'
      ];
      
      const pageText = doc.body?.innerText?.toLowerCase() || '';
      data.has_success_indicators = successIndicators.some(indicator => 
        pageText.includes(indicator)
      );

    } catch (error) {
      console.error('Error extracting checkout data:', error);
    }

    return data;
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
