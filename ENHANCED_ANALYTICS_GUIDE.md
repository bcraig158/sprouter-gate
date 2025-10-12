# Enhanced Analytics System - Implementation Guide

## Overview

The enhanced analytics system provides comprehensive tracking of user behavior, purchase completion verification, and detailed reporting for the Sprouter Gate event management system.

## Key Features

### 🔍 **Detailed User Journey Tracking**
- **Login Tracking**: Enhanced login tracking with session management
- **Show Selection**: Detailed showtime selection tracking with timestamps
- **Purchase Intent**: Track when users start checkout process
- **Purchase Completion**: Comprehensive purchase tracking with Sprouter integration
- **Sprouter Success**: Verify successful ticket purchases via success page visits
- **Activity Timeline**: Complete user journey tracking with metadata

### 📊 **Enhanced Analytics Dashboard**
- **Real-time Metrics**: Live tracking of all user activities
- **Show Performance**: Detailed breakdown by showtime with conversion rates
- **User Analytics**: Comprehensive user behavior analysis
- **Limit Violations**: Track daily purchase limit violations
- **Revenue Tracking**: Detailed revenue analysis with Sprouter verification

### 🛡️ **Purchase Verification & Limits**
- **Daily Purchase Limits**: Enforce and track daily ticket purchase limits
- **Sprouter Integration**: Verify purchases through Sprouter success page visits
- **Duplicate Prevention**: Track and prevent multiple purchases on same day
- **Transaction Linking**: Link purchases to specific Sprouter transactions

## Database Schema

### Enhanced Tables

#### 1. **user_logins** (Enhanced)
```sql
CREATE TABLE user_logins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  user_type TEXT NOT NULL CHECK (user_type IN ('student', 'volunteer')),
  identifier TEXT NOT NULL,
  email TEXT,
  name TEXT,
  ip_address TEXT,
  user_agent TEXT,
  login_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  session_id TEXT,
  login_source TEXT DEFAULT 'web',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### 2. **show_selections** (Enhanced)
```sql
CREATE TABLE show_selections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  user_type TEXT NOT NULL CHECK (user_type IN ('student', 'volunteer')),
  show_id TEXT NOT NULL,
  show_date TEXT NOT NULL,
  show_time TEXT NOT NULL,
  show_datetime TEXT NOT NULL,
  tickets_requested INTEGER NOT NULL,
  selection_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  session_id TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### 3. **purchases** (Enhanced)
```sql
CREATE TABLE purchases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  user_type TEXT NOT NULL CHECK (user_type IN ('student', 'volunteer')),
  show_id TEXT NOT NULL,
  show_date TEXT NOT NULL,
  show_time TEXT NOT NULL,
  show_datetime TEXT NOT NULL,
  tickets_purchased INTEGER NOT NULL,
  total_cost DECIMAL(10,2) NOT NULL,
  payment_status TEXT NOT NULL CHECK (payment_status IN ('pending', 'completed', 'failed', 'cancelled')),
  transaction_id TEXT,
  sprouter_transaction_id TEXT,
  sprouter_order_id TEXT,
  purchase_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  completion_timestamp DATETIME,
  session_id TEXT,
  ip_address TEXT,
  user_agent TEXT,
  payment_method TEXT,
  refund_status TEXT DEFAULT 'none',
  refund_timestamp DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### 4. **purchase_intents** (New)
```sql
CREATE TABLE purchase_intents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  user_type TEXT NOT NULL CHECK (user_type IN ('student', 'volunteer')),
  show_id TEXT NOT NULL,
  show_date TEXT NOT NULL,
  show_time TEXT NOT NULL,
  show_datetime TEXT NOT NULL,
  tickets_requested INTEGER NOT NULL,
  intent_id TEXT UNIQUE NOT NULL,
  sprouter_url TEXT,
  intent_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  session_id TEXT,
  ip_address TEXT,
  user_agent TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned', 'expired')),
  completion_timestamp DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### 5. **sprouter_success_visits** (New)
```sql
CREATE TABLE sprouter_success_visits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  user_type TEXT NOT NULL CHECK (user_type IN ('student', 'volunteer')),
  show_id TEXT NOT NULL,
  show_date TEXT NOT NULL,
  show_time TEXT NOT NULL,
  show_datetime TEXT NOT NULL,
  sprouter_transaction_id TEXT,
  sprouter_order_id TEXT,
  success_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  session_id TEXT,
  ip_address TEXT,
  user_agent TEXT,
  return_url TEXT,
  verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'failed')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### 6. **user_activity_timeline** (New)
```sql
CREATE TABLE user_activity_timeline (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  user_type TEXT NOT NULL CHECK (user_type IN ('student', 'volunteer')),
  activity_type TEXT NOT NULL CHECK (activity_type IN ('login', 'show_selection', 'purchase_intent', 'purchase_completed', 'purchase_failed', 'sprouter_success', 'logout', 'session_timeout')),
  activity_details TEXT,
  show_id TEXT,
  session_id TEXT,
  ip_address TEXT,
  user_agent TEXT,
  activity_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  metadata TEXT, -- JSON string for additional data
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### 7. **daily_purchase_limits** (New)
```sql
CREATE TABLE daily_purchase_limits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  user_type TEXT NOT NULL CHECK (user_type IN ('student', 'volunteer')),
  purchase_date DATE NOT NULL,
  total_tickets_purchased INTEGER DEFAULT 0,
  total_spent DECIMAL(10,2) DEFAULT 0.00,
  shows_attended TEXT, -- JSON array of show_ids
  limit_exceeded BOOLEAN DEFAULT FALSE,
  last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, purchase_date)
);
```

## API Endpoints

### Enhanced Analytics Endpoints

#### 1. **GET /api/analytics**
Enhanced analytics endpoint with comprehensive data:
```typescript
// Query Parameters
{
  timeframe?: '24h' | '7d' | '30d' | 'all' // Default: 'all'
}

// Response
{
  totalLogins: number;
  studentLogins: number;
  volunteerLogins: number;
  totalShowSelections: number;
  totalPurchases: number;
  totalRevenue: number;
  showBreakdown: {
    [showId: string]: {
      show_date: string;
      show_time: string;
      selections: number;
      purchase_intents: number;
      purchases: number;
      sprouter_successes: number;
      revenue: number;
      conversion_rate: number;
    };
  };
  recentActivity: Array<{
    activity_type: string;
    activity_details: string;
    show_id?: string;
    activity_timestamp: string;
    user_id: string;
    user_type: string;
    metadata?: any;
  }>;
  topUsers: Array<{
    user_id: string;
    user_type: string;
    identifier: string;
    name: string;
    total_selections: number;
    total_purchase_intents: number;
    total_purchases: number;
    total_sprouter_successes: number;
    total_spent: number;
    last_activity: string;
  }>;
  limitViolations: Array<{
    user_id: string;
    user_type: string;
    purchase_date: string;
    total_tickets_purchased: number;
    limit_exceeded: boolean;
  }>;
  timeframe: string;
}
```

#### 2. **POST /api/track-purchase**
Track completed purchases:
```typescript
// Request Body
{
  showId: string;
  showDate: string;
  showTime: string;
  ticketsPurchased: number;
  totalCost: number;
  paymentStatus: 'pending' | 'completed' | 'failed' | 'cancelled';
  transactionId?: string;
  sprouterTransactionId?: string;
  sprouterOrderId?: string;
  paymentMethod?: string;
}

// Response
{
  success: boolean;
  message: string;
}
```

#### 3. **POST /api/track-sprouter-success**
Track Sprouter success page visits:
```typescript
// Request Body
{
  showId: string;
  showDate: string;
  showTime: string;
  sprouterTransactionId?: string;
  sprouterOrderId?: string;
  returnUrl?: string;
}

// Response
{
  success: boolean;
  message: string;
}
```

#### 4. **GET /api/user-activity/:userId**
Get user activity timeline:
```typescript
// Query Parameters
{
  limit?: number // Default: 50
}

// Response
Array<{
  activity_type: string;
  activity_details: string;
  show_id?: string;
  activity_timestamp: string;
  metadata?: any;
}>
```

## Implementation Steps

### 1. **Database Migration**
```bash
# Run the enhanced analytics tables migration
cd backend
npm run ts-node src/scripts/run-enhanced-analytics.ts
```

### 2. **Backend Integration**
The enhanced tracking is automatically integrated into existing endpoints:
- **Login endpoints** now track detailed user activity
- **Show selection** tracks with enhanced metadata
- **Purchase intent** tracks checkout initiation
- **Purchase completion** tracks with Sprouter integration

### 3. **Frontend Integration**
The admin analytics dashboard automatically displays enhanced data:
- **Enhanced metrics** with conversion rates
- **Detailed user analytics** with activity timeline
- **Limit violations** tracking
- **Real-time activity** monitoring

### 4. **Sprouter Integration**
To track Sprouter success page visits, add this to your Sprouter success page:
```javascript
// Track successful purchase completion
fetch('/api/track-sprouter-success', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${userToken}`
  },
  body: JSON.stringify({
    showId: 'tue-530',
    showDate: '2025-10-28',
    showTime: '17:30',
    sprouterTransactionId: transactionId,
    sprouterOrderId: orderId,
    returnUrl: window.location.href
  })
});
```

## Admin Dashboard Features

### **Overview Tab**
- **Key Metrics**: Total logins, selections, purchases, revenue
- **Show Breakdown**: Enhanced performance with conversion rates
- **Recent Activity**: Real-time activity timeline
- **Limit Violations**: Daily purchase limit violations

### **Users Tab**
- **Enhanced User Analytics**: Comprehensive user behavior data
- **Activity Timeline**: Complete user journey tracking
- **Limit Violations**: Users who exceeded daily limits
- **Purchase Verification**: Sprouter success verification

### **Shows Tab**
- **Performance Analysis**: Detailed show performance metrics
- **Conversion Tracking**: Selection to purchase conversion rates
- **Revenue Analysis**: Revenue breakdown by showtime

### **Revenue Tab**
- **Revenue Analysis**: Comprehensive revenue tracking
- **Average Order Value**: Per-purchase analysis
- **Conversion Rates**: Selection to purchase conversion

## Key Benefits

### 🎯 **Complete User Journey Tracking**
- Track every step from login to purchase completion
- Verify successful purchases through Sprouter integration
- Monitor user behavior patterns and drop-off points

### 📈 **Enhanced Analytics**
- Real-time performance metrics
- Detailed conversion rate analysis
- Comprehensive user behavior insights

### 🛡️ **Purchase Verification & Security**
- Verify purchases through Sprouter success page visits
- Track and prevent daily purchase limit violations
- Link purchases to specific Sprouter transactions

### 📊 **Detailed Reporting**
- Complete activity timeline for each user
- Show performance breakdown with conversion rates
- Revenue analysis with purchase verification

## Admin Login Credentials

**Access the enhanced analytics dashboard:**
- **Volunteer Code**: `339933`
- **Email**: `admin@maidu.com`
- **URL**: Navigate to `/admin-analytics` after login

## Monitoring & Maintenance

### **Database Performance**
- All tables include comprehensive indexes for optimal query performance
- Regular cleanup of expired sessions and old data
- Monitor database size and performance

### **Analytics Accuracy**
- Verify Sprouter integration is working correctly
- Monitor conversion rates for anomalies
- Track limit violations and investigate patterns

### **User Experience**
- Monitor activity timeline for user journey insights
- Track drop-off points in the purchase process
- Analyze user behavior patterns for improvements

## Troubleshooting

### **Common Issues**
1. **Missing Analytics Data**: Ensure enhanced tables are created
2. **Sprouter Integration**: Verify success page tracking is implemented
3. **Limit Violations**: Check daily purchase limit enforcement
4. **Performance Issues**: Monitor database query performance

### **Debugging**
- Check activity timeline for user journey issues
- Verify Sprouter success page visits are being tracked
- Monitor limit violations for system integrity

## Future Enhancements

### **Planned Features**
- **Email Notifications**: Alert on limit violations
- **Real-time Alerts**: Live monitoring of system issues
- **Advanced Analytics**: Machine learning insights
- **Export Functionality**: Data export for external analysis

---

**The enhanced analytics system provides comprehensive tracking and verification capabilities for the Sprouter Gate event management system, ensuring complete visibility into user behavior and purchase completion.**
