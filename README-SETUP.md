# Sprouter Gate - Complete Setup Guide

## 🚀 Quick Start

### Automated Setup (Recommended)
```bash
# Run the automated setup script
./setup-system.sh
```

### Manual Setup

#### 1. Backend Setup
```bash
cd backend
npm install
npm run consolidate-database
npm run dev
```

#### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

## 🔑 Login Credentials

### Admin Access
- **URL**: http://localhost:3002/volunteer-login
- **Code**: `339933`
- **Email**: `admin@maidu.com`
- **Access**: Full admin analytics dashboard

### Student Access
- **URL**: http://localhost:3002/login
- **Student ID**: Any valid student ID from the database

### Volunteer Access
- **URL**: http://localhost:3002/volunteer-login
- **Code**: Any code from `volunteer-codes.json`
- **Email**: Corresponding email from `volunteer-codes.json`

## 🗄️ Database Structure

### Core Tables
- `students` - Student records with household IDs
- `households` - Household information and volunteer status
- `volunteer_codes` - Volunteer access codes
- `sessions` - User session management
- `audit_log` - System activity logging

### Analytics Tables
- `user_logins` - Detailed login tracking
- `show_selections` - Show selection tracking
- `purchase_intents` - Purchase intent tracking
- `purchases` - Completed purchase records
- `sprouter_success_visits` - Sprouter integration tracking
- `user_activity_timeline` - Comprehensive user activity
- `daily_purchase_limits` - Purchase limit enforcement

## 🔧 System Architecture

### Backend (Node.js + Express + SQLite)
- **Port**: 3001
- **API Base**: `/api`
- **Database**: SQLite (`data/sprouter_events.db`)
- **Authentication**: JWT tokens
- **Security**: Helmet, CORS, Rate limiting

### Frontend (React + Vite + TypeScript)
- **Port**: 3002
- **Proxy**: `/api` → `http://localhost:3001/api`
- **Routing**: React Router
- **State**: Context API for authentication

## 🚨 Troubleshooting

### Common Issues

#### 1. Admin Login Not Working
```bash
# Check if admin credentials are in database
cd backend
sqlite3 data/sprouter_events.db "SELECT * FROM volunteer_codes WHERE code = '339933';"

# If not found, run database consolidation
npm run consolidate-database
```

#### 2. Frontend Can't Connect to Backend
```bash
# Check if backend is running
curl http://localhost:3001/health

# Check Vite proxy configuration in frontend/vite.config.ts
```

#### 3. Database Issues
```bash
# Reset database
rm backend/data/sprouter_events.db
cd backend
npm run consolidate-database
```

### Debug Commands

```bash
# Test admin login
cd backend
npm run test-admin-login

# Check database status
cd backend
sqlite3 data/sprouter_events.db ".tables"
sqlite3 data/sprouter_events.db "SELECT COUNT(*) FROM students;"
```

## 📊 Admin Analytics

### Access Admin Dashboard
1. Go to http://localhost:3002/volunteer-login
2. Login with admin credentials (339933 / admin@maidu.com)
3. You'll be automatically redirected to `/admin-analytics`

### Analytics Features
- Real-time user activity
- Show selection tracking
- Purchase analytics
- Revenue tracking
- User behavior analysis
- System performance metrics

## 🔄 Development Workflow

### Making Changes
1. **Backend Changes**: Edit files in `backend/src/`
2. **Frontend Changes**: Edit files in `frontend/src/`
3. **Database Changes**: Update scripts in `backend/src/scripts/`

### Testing Changes
```bash
# Test backend API
curl -X POST http://localhost:3001/api/volunteer-login \
  -H "Content-Type: application/json" \
  -d '{"volunteerCode": "339933", "email": "admin@maidu.com"}'

# Test frontend
# Open http://localhost:3002 and test login flows
```

## 📁 Project Structure

```
sprouter-gate/
├── backend/                 # Node.js backend
│   ├── src/
│   │   ├── routes/         # API routes
│   │   ├── scripts/       # Database scripts
│   │   ├── utils/          # Utility functions
│   │   └── db.ts          # Database configuration
│   └── data/              # SQLite database
├── frontend/               # React frontend
│   ├── src/
│   │   ├── features/      # Feature components
│   │   ├── hooks/         # Custom hooks
│   │   ├── services/      # API services
│   │   └── components/    # Reusable components
│   └── dist/              # Built frontend
├── netlify/               # Netlify functions (production)
└── Documentation/        # Project documentation
```

## 🚀 Production Deployment

### Backend Deployment
- Deploy to Railway, Heroku, or similar
- Set environment variables
- Configure database connection

### Frontend Deployment
- Build: `npm run build`
- Deploy to Netlify, Vercel, or similar
- Configure API base URL

## 📞 Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review the console logs
3. Verify all dependencies are installed
4. Ensure both backend and frontend are running

## 🎯 Next Steps

1. **Test the system**: Use the provided credentials to test all login flows
2. **Customize**: Modify the UI, add features, or adjust the database schema
3. **Deploy**: Follow the production deployment guide
4. **Monitor**: Use the admin analytics to monitor system usage
