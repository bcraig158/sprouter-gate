# Data Structure Analysis & Configuration

## 🔍 **Where Login Data is Actually Stored**

### **Primary Storage Location**
- **File**: `/opt/netlify/analytics/analytics.json` (primary)
- **Backups**: Multiple locations for persistence across deployments
- **System**: `secureStorage.js` handles all data operations

### **Data Structure in Production**
```json
{
  "userLogins": [
    {
      "user_id": "HH_33727",
      "user_type": "student",
      "identifier": "33727",
      "email": "",
      "name": "",
      "ip_hash": "abc123...",
      "user_agent_hash": "def456...",
      "login_timestamp": "2024-01-15T10:30:00.000Z",
      "session_id": "session_123",
      "domain": "maidutickets.com"
    }
  ],
  "showSelections": [
    {
      "user_id": "HH_33727",
      "event_key": "tue-530",
      "timestamp": "2024-01-15T10:35:00.000Z",
      "metadata": {
        "ticket_quantity": 2,
        "total_price": 20.00
      }
    }
  ],
  "purchases": [
    {
      "user_id": "HH_33727",
      "event_key": "tue-530",
      "timestamp": "2024-01-15T10:40:00.000Z",
      "metadata": {
        "tickets_purchased": 2,
        "total_cost": 20.00,
        "payment_method": "credit_card"
      }
    }
  ],
  "metadata": {
    "lastUpdated": "2024-01-15T10:30:00.000Z",
    "version": "2.0",
    "storage": "netlify-secure-file",
    "encryption": "AES-256-CBC"
  }
}
```

## 🔧 **How Data Flows**

### **1. Login Process**
```
User Login → netlify/functions/api.js → secureStorage.storeLogin() → analytics.json
```

### **2. Analytics Request**
```
Admin Dashboard → /api/analytics → netlify/functions/analytics.js → secureStorage.loadData() → analytics.json
```

### **3. Data Processing**
```
Raw Data → Time Filtering → Calculate Metrics → JSON Response → Frontend Display
```

## 📊 **Data Retention & Cleanup**

### **Automatic 30-Day Retention**
- **Location**: `secureStorage.js` lines 136-155
- **Process**: Runs on every `loadData()` call
- **Cleanup**: Removes data older than 30 days
- **Backup**: Creates backups before cleanup

### **Storage Locations (Priority Order)**
1. `/opt/netlify/analytics/analytics.json` (primary)
2. `./analytics-backup.json` (backup)
3. `/tmp/analytics-backup.json` (fallback)

## 🎯 **Analytics Function Configuration**

### **Fixed Data Format Issues**
- ✅ **Login Data**: Now reads from `analyticsData.userLogins[]`
- ✅ **Show Selections**: Reads from `analyticsData.showSelections[]`
- ✅ **Purchases**: Reads from `analyticsData.purchases[]`
- ✅ **Time Filtering**: Properly filters by `login_timestamp`
- ✅ **Metrics Calculation**: Uses actual data instead of placeholders

### **Analytics Endpoint Response**
```json
{
  "totalLogins": 15,
  "studentLogins": 12,
  "volunteerLogins": 3,
  "totalShowSelections": 8,
  "totalPurchases": 5,
  "totalRevenue": 100.00,
  "activeUsers": 4,
  "activeStudentUsers": 3,
  "activeVolunteerUsers": 1,
  "activeUsersList": [...],
  "showBreakdown": {
    "tue-530": { "selections": 3, "purchases": 2, "revenue": 40.00, "conversion_rate": 67 },
    "tue-630": { "selections": 2, "purchases": 1, "revenue": 20.00, "conversion_rate": 50 },
    "thu-530": { "selections": 2, "purchases": 1, "revenue": 20.00, "conversion_rate": 50 },
    "thu-630": { "selections": 1, "purchases": 1, "revenue": 20.00, "conversion_rate": 100 }
  },
  "recentActivity": [...],
  "topUsers": [...],
  "timeframe": "all"
}
```

## 🚀 **Deployment Status**

### **What's Working**
- ✅ **Login Tracking**: Already functional via `secureStorage.js`
- ✅ **Data Persistence**: 30-day retention configured
- ✅ **Analytics Function**: Fixed to read actual data format
- ✅ **Netlify Configuration**: Redirects properly configured
- ✅ **Frontend Integration**: AdminAnalyticsPage ready

### **What Was Fixed**
1. **Data Format Compatibility**: Analytics function now reads from correct data structure
2. **Time Filtering**: Properly filters data by timeframe
3. **Metrics Calculation**: Uses real data instead of placeholders
4. **Show Breakdown**: Calculates from actual show selections and purchases
5. **Revenue Tracking**: Sums actual purchase amounts

### **No Migration Needed**
- ✅ **Existing Data**: Already in correct format
- ✅ **No Database**: Uses file-based storage
- ✅ **No Scripts**: Works with existing `secureStorage.js`

## 🧪 **Testing the Fix**

### **1. Test Analytics Endpoint**
```bash
curl "https://maidutickets.com/api/analytics?timeframe=all"
```

### **2. Test with Timeframes**
```bash
curl "https://maidutickets.com/api/analytics?timeframe=24h"
curl "https://maidutickets.com/api/analytics?timeframe=7d"
curl "https://maidutickets.com/api/analytics?timeframe=30d"
```

### **3. Test Admin Dashboard**
1. Navigate to `https://maidutickets.com/admin-analytics`
2. Login with admin credentials
3. Verify data displays correctly

## 📈 **Expected Results**

After deployment:
- ✅ **Analytics endpoint** returns actual login data
- ✅ **Admin dashboard** shows real metrics
- ✅ **Time filtering** works correctly
- ✅ **Show breakdown** displays actual selections/purchases
- ✅ **Revenue tracking** shows real purchase amounts
- ✅ **Data persistence** maintains 30-day retention

## 🎉 **Ready for Deployment**

The analytics system is now properly configured to:
- Read existing login data from `secureStorage.js`
- Calculate real metrics from stored data
- Filter by timeframe correctly
- Display actual show selections and purchases
- Track revenue from real purchase data
- Maintain 30-day data retention automatically
