import { runQuery, getQuery, allQuery } from '../db';
import { DateTime } from 'luxon';

export interface UserActivity {
  user_id: string;
  user_type: 'student' | 'volunteer';
  activity_type: 'login' | 'show_selection' | 'purchase_intent' | 'purchase_completed' | 'purchase_failed' | 'sprouter_success' | 'logout' | 'session_timeout';
  activity_details: string;
  show_id?: string;
  session_id?: string;
  ip_address?: string;
  user_agent?: string;
  metadata?: any;
}

export interface ShowSelectionData {
  user_id: string;
  user_type: 'student' | 'volunteer';
  show_id: string;
  show_date: string;
  show_time: string;
  show_datetime: string;
  tickets_requested: number;
  session_id?: string;
  ip_address?: string;
  user_agent?: string;
}

export interface PurchaseIntentData {
  user_id: string;
  user_type: 'student' | 'volunteer';
  show_id: string;
  show_date: string;
  show_time: string;
  show_datetime: string;
  tickets_requested: number;
  intent_id: string;
  sprouter_url: string;
  session_id?: string;
  ip_address?: string;
  user_agent?: string;
}

export interface PurchaseData {
  user_id: string;
  user_type: 'student' | 'volunteer';
  show_id: string;
  show_date: string;
  show_time: string;
  show_datetime: string;
  tickets_purchased: number;
  total_cost: number;
  payment_status: 'pending' | 'completed' | 'failed' | 'cancelled';
  transaction_id?: string;
  sprouter_transaction_id?: string;
  sprouter_order_id?: string;
  session_id?: string;
  ip_address?: string;
  user_agent?: string;
  payment_method?: string;
}

export interface SprouterSuccessData {
  user_id: string;
  user_type: 'student' | 'volunteer';
  show_id: string;
  show_date: string;
  show_time: string;
  show_datetime: string;
  sprouter_transaction_id?: string;
  sprouter_order_id?: string;
  session_id?: string;
  ip_address?: string;
  user_agent?: string;
  return_url?: string;
}

/**
 * Track user activity in the timeline
 */
export async function trackUserActivity(activity: UserActivity): Promise<void> {
  try {
    await runQuery(
      `INSERT INTO user_activity_timeline 
       (user_id, user_type, activity_type, activity_details, show_id, session_id, ip_address, user_agent, metadata) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        activity.user_id,
        activity.user_type,
        activity.activity_type,
        activity.activity_details,
        activity.show_id || null,
        activity.session_id || null,
        activity.ip_address || null,
        activity.user_agent || null,
        activity.metadata ? JSON.stringify(activity.metadata) : null
      ]
    );
  } catch (error) {
    console.error('Error tracking user activity:', error);
    throw error;
  }
}

/**
 * Track detailed show selection with enhanced metadata
 */
export async function trackShowSelection(selection: ShowSelectionData): Promise<void> {
  try {
    // Insert into show_selections table
    await runQuery(
      `INSERT INTO show_selections 
       (user_id, user_type, show_id, show_date, show_time, show_datetime, tickets_requested, session_id, ip_address, user_agent) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        selection.user_id,
        selection.user_type,
        selection.show_id,
        selection.show_date,
        selection.show_time,
        selection.show_datetime,
        selection.tickets_requested,
        selection.session_id || null,
        selection.ip_address || null,
        selection.user_agent || null
      ]
    );

    // Track in activity timeline
    await trackUserActivity({
      user_id: selection.user_id,
      user_type: selection.user_type,
      activity_type: 'show_selection',
      activity_details: `Selected ${selection.show_id} for ${selection.show_date} at ${selection.show_time} (${selection.tickets_requested} tickets)`,
      show_id: selection.show_id,
      session_id: selection.session_id,
      ip_address: selection.ip_address,
      user_agent: selection.user_agent,
      metadata: {
        show_date: selection.show_date,
        show_time: selection.show_time,
        show_datetime: selection.show_datetime,
        tickets_requested: selection.tickets_requested
      }
    });
  } catch (error) {
    console.error('Error tracking show selection:', error);
    throw error;
  }
}

/**
 * Track purchase intent when user starts checkout
 */
export async function trackPurchaseIntent(intent: PurchaseIntentData): Promise<void> {
  try {
    // Insert into purchase_intents table
    await runQuery(
      `INSERT INTO purchase_intents 
       (user_id, user_type, show_id, show_date, show_time, show_datetime, tickets_requested, intent_id, sprouter_url, session_id, ip_address, user_agent) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        intent.user_id,
        intent.user_type,
        intent.show_id,
        intent.show_date,
        intent.show_time,
        intent.show_datetime,
        intent.tickets_requested,
        intent.intent_id,
        intent.sprouter_url,
        intent.session_id || null,
        intent.ip_address || null,
        intent.user_agent || null
      ]
    );

    // Track in activity timeline
    await trackUserActivity({
      user_id: intent.user_id,
      user_type: intent.user_type,
      activity_type: 'purchase_intent',
      activity_details: `Started checkout for ${intent.show_id} (${intent.tickets_requested} tickets)`,
      show_id: intent.show_id,
      session_id: intent.session_id,
      ip_address: intent.ip_address,
      user_agent: intent.user_agent,
      metadata: {
        intent_id: intent.intent_id,
        sprouter_url: intent.sprouter_url,
        show_date: intent.show_date,
        show_time: intent.show_time,
        tickets_requested: intent.tickets_requested
      }
    });
  } catch (error) {
    console.error('Error tracking purchase intent:', error);
    throw error;
  }
}

/**
 * Track completed purchase
 */
export async function trackPurchase(purchase: PurchaseData): Promise<void> {
  try {
    // Insert into purchases table
    await runQuery(
      `INSERT INTO purchases 
       (user_id, user_type, show_id, show_date, show_time, show_datetime, tickets_purchased, total_cost, payment_status, transaction_id, sprouter_transaction_id, sprouter_order_id, session_id, ip_address, user_agent, payment_method) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        purchase.user_id,
        purchase.user_type,
        purchase.show_id,
        purchase.show_date,
        purchase.show_time,
        purchase.show_datetime,
        purchase.tickets_purchased,
        purchase.total_cost,
        purchase.payment_status,
        purchase.transaction_id || null,
        purchase.sprouter_transaction_id || null,
        purchase.sprouter_order_id || null,
        purchase.session_id || null,
        purchase.ip_address || null,
        purchase.user_agent || null,
        purchase.payment_method || null
      ]
    );

    // Update purchase intent status
    await runQuery(
      `UPDATE purchase_intents 
       SET status = 'completed', completion_timestamp = CURRENT_TIMESTAMP 
       WHERE user_id = ? AND show_id = ? AND status = 'active'`,
      [purchase.user_id, purchase.show_id]
    );

    // Track in activity timeline
    await trackUserActivity({
      user_id: purchase.user_id,
      user_type: purchase.user_type,
      activity_type: 'purchase_completed',
      activity_details: `Completed purchase for ${purchase.show_id} (${purchase.tickets_purchased} tickets, $${purchase.total_cost})`,
      show_id: purchase.show_id,
      session_id: purchase.session_id,
      ip_address: purchase.ip_address,
      user_agent: purchase.user_agent,
      metadata: {
        tickets_purchased: purchase.tickets_purchased,
        total_cost: purchase.total_cost,
        payment_status: purchase.payment_status,
        transaction_id: purchase.transaction_id,
        sprouter_transaction_id: purchase.sprouter_transaction_id,
        sprouter_order_id: purchase.sprouter_order_id,
        payment_method: purchase.payment_method
      }
    });

    // Update daily purchase limits
    await updateDailyPurchaseLimits(purchase);
  } catch (error) {
    console.error('Error tracking purchase:', error);
    throw error;
  }
}

/**
 * Track Sprouter success page visit (verification of completed purchase)
 */
export async function trackSprouterSuccess(success: SprouterSuccessData): Promise<void> {
  try {
    // Insert into sprouter_success_visits table
    await runQuery(
      `INSERT INTO sprouter_success_visits 
       (user_id, user_type, show_id, show_date, show_time, show_datetime, sprouter_transaction_id, sprouter_order_id, session_id, ip_address, user_agent, return_url) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        success.user_id,
        success.user_type,
        success.show_id,
        success.show_date,
        success.show_time,
        success.show_datetime,
        success.sprouter_transaction_id || null,
        success.sprouter_order_id || null,
        success.session_id || null,
        success.ip_address || null,
        success.user_agent || null,
        success.return_url || null
      ]
    );

    // Track in activity timeline
    await trackUserActivity({
      user_id: success.user_id,
      user_type: success.user_type,
      activity_type: 'sprouter_success',
      activity_details: `Verified successful purchase for ${success.show_id} via Sprouter`,
      show_id: success.show_id,
      session_id: success.session_id,
      ip_address: success.ip_address,
      user_agent: success.user_agent,
      metadata: {
        sprouter_transaction_id: success.sprouter_transaction_id,
        sprouter_order_id: success.sprouter_order_id,
        return_url: success.return_url
      }
    });
  } catch (error) {
    console.error('Error tracking Sprouter success:', error);
    throw error;
  }
}

/**
 * Update daily purchase limits tracking
 */
export async function updateDailyPurchaseLimits(purchase: PurchaseData): Promise<void> {
  try {
    const purchaseDate = DateTime.fromISO(purchase.show_date).toISODate();
    
    // Get current daily limits
    const existing = await getQuery<{
      total_tickets_purchased: number;
      total_spent: number;
      shows_attended: string;
    }>(
      'SELECT total_tickets_purchased, total_spent, shows_attended FROM daily_purchase_limits WHERE user_id = ? AND purchase_date = ?',
      [purchase.user_id, purchaseDate]
    );

    if (existing) {
      // Update existing record
      const newTickets = existing.total_tickets_purchased + purchase.tickets_purchased;
      const newSpent = existing.total_spent + purchase.total_cost;
      const shows = JSON.parse(existing.shows_attended || '[]');
      if (!shows.includes(purchase.show_id)) {
        shows.push(purchase.show_id);
      }

      await runQuery(
        `UPDATE daily_purchase_limits 
         SET total_tickets_purchased = ?, total_spent = ?, shows_attended = ?, last_updated = CURRENT_TIMESTAMP 
         WHERE user_id = ? AND purchase_date = ?`,
        [newTickets, newSpent, JSON.stringify(shows), purchase.user_id, purchaseDate]
      );
    } else {
      // Create new record
      await runQuery(
        `INSERT INTO daily_purchase_limits 
         (user_id, user_type, purchase_date, total_tickets_purchased, total_spent, shows_attended) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          purchase.user_id,
          purchase.user_type,
          purchaseDate,
          purchase.tickets_purchased,
          purchase.total_cost,
          JSON.stringify([purchase.show_id])
        ]
      );
    }
  } catch (error) {
    console.error('Error updating daily purchase limits:', error);
    throw error;
  }
}

/**
 * Check if user has exceeded daily purchase limits
 */
export async function checkDailyPurchaseLimits(userId: string, userType: 'student' | 'volunteer', showId: string, ticketsRequested: number): Promise<{
  canPurchase: boolean;
  currentTickets: number;
  maxAllowed: number;
  reason?: string;
}> {
  try {
    const today = DateTime.now().toISODate();
    
    const limits = await getQuery<{
      total_tickets_purchased: number;
      total_spent: number;
      shows_attended: string;
    }>(
      'SELECT total_tickets_purchased, total_spent, shows_attended FROM daily_purchase_limits WHERE user_id = ? AND purchase_date = ?',
      [userId, today]
    );

    const currentTickets = limits?.total_tickets_purchased || 0;
    const maxAllowed = userType === 'volunteer' ? 4 : 2; // Volunteers can purchase up to 4 tickets per day
    
    if (currentTickets + ticketsRequested > maxAllowed) {
      return {
        canPurchase: false,
        currentTickets,
        maxAllowed,
        reason: `Daily limit exceeded. You have already purchased ${currentTickets} tickets today. Maximum allowed: ${maxAllowed} tickets per day.`
      };
    }

    return {
      canPurchase: true,
      currentTickets,
      maxAllowed
    };
  } catch (error) {
    console.error('Error checking daily purchase limits:', error);
    throw error;
  }
}

/**
 * Get comprehensive user activity for admin dashboard
 */
export async function getUserActivityTimeline(userId: string, limit: number = 50): Promise<any[]> {
  try {
    return await allQuery(
      `SELECT 
        activity_type,
        activity_details,
        show_id,
        activity_timestamp,
        metadata
       FROM user_activity_timeline 
       WHERE user_id = ? 
       ORDER BY activity_timestamp DESC 
       LIMIT ?`,
      [userId, limit]
    );
  } catch (error) {
    console.error('Error getting user activity timeline:', error);
    throw error;
  }
}

/**
 * Get detailed analytics for admin dashboard
 */
export async function getDetailedAnalytics(timeframe: '24h' | '7d' | '30d' | 'all' = 'all'): Promise<any> {
  try {
    let timeFilter = '';
    switch (timeframe) {
      case '24h':
        timeFilter = "AND activity_timestamp >= datetime('now', '-1 day')";
        break;
      case '7d':
        timeFilter = "AND activity_timestamp >= datetime('now', '-7 days')";
        break;
      case '30d':
        timeFilter = "AND activity_timestamp >= datetime('now', '-30 days')";
        break;
      default:
        timeFilter = '';
    }

    // Get comprehensive analytics
    const analytics = await allQuery(`
      SELECT 
        'login' as activity_type,
        COUNT(*) as count,
        user_type
      FROM user_logins 
      WHERE 1=1 ${timeFilter.replace('activity_timestamp', 'login_timestamp')}
      GROUP BY user_type
      
      UNION ALL
      
      SELECT 
        'show_selection' as activity_type,
        COUNT(*) as count,
        user_type
      FROM show_selections 
      WHERE 1=1 ${timeFilter.replace('activity_timestamp', 'selection_timestamp')}
      GROUP BY user_type
      
      UNION ALL
      
      SELECT 
        'purchase_intent' as activity_type,
        COUNT(*) as count,
        user_type
      FROM purchase_intents 
      WHERE 1=1 ${timeFilter.replace('activity_timestamp', 'intent_timestamp')}
      GROUP BY user_type
      
      UNION ALL
      
      SELECT 
        'purchase_completed' as activity_type,
        COUNT(*) as count,
        user_type
      FROM purchases 
      WHERE payment_status = 'completed' ${timeFilter.replace('activity_timestamp', 'purchase_timestamp')}
      GROUP BY user_type
      
      UNION ALL
      
      SELECT 
        'sprouter_success' as activity_type,
        COUNT(*) as count,
        user_type
      FROM sprouter_success_visits 
      WHERE 1=1 ${timeFilter.replace('activity_timestamp', 'success_timestamp')}
      GROUP BY user_type
    `);

    return analytics;
  } catch (error) {
    console.error('Error getting detailed analytics:', error);
    throw error;
  }
}
