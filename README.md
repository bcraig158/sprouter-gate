# Sprouter Events Access Control

A React-based web application for gating access to Sprouter events with student ID verification and direct Sprouter integration.

## Overview

This application provides a streamlined interface for students to access 4 Sprouter events:

- **Tuesday, October 28, 2025** at 5:30 PM and 6:30 PM (America/Los_Angeles)
- **Thursday, October 30, 2025** at 5:30 PM and 6:30 PM (America/Los_Angeles)

### Key Features

- **Student ID Authentication**: Simple login system with student ID validation
- **Event Information**: Complete event details with banner and show times
- **Show Selection**: Choose one show per night (Tuesday and Thursday)
- **Direct Sprouter Integration**: Embedded checkout with secure iframe sandboxing
- **Responsive Design**: Mobile-friendly interface
- **Security**: Iframe sandboxing and secure Sprouter URLs

### Architecture

- **Frontend**: React SPA with Vite, TypeScript, and inline styling
- **Backend**: Node.js/Express API with SQLite database (available but not required)
- **Authentication**: Simple student ID validation
- **Integration**: Direct Sprouter iframe embedding

## Project Structure

```
├── backend/          # Express API server (optional)
│   ├── src/
│   │   ├── index.ts  # Server entry point
│   │   ├── db.ts     # Database setup
│   │   ├── routes/   # API endpoints
│   │   └── utils/    # Business logic
│   ├── data/
│   │   └── sprouter_events.db # SQLite database (454 students)
│   ├── package.json
│   └── tsconfig.json
├── frontend/         # React SPA (main application)
│   ├── src/
│   │   ├── App.tsx   # Main application component
│   │   ├── main.tsx  # Entry point
│   │   └── index.css # Tailwind CSS styles
│   ├── public/
│   │   └── EventBanner.png # Event banner image
│   ├── package.json
│   └── vite.config.ts
├── .env              # Environment configuration
└── README.md
```

## Getting Started

### Prerequisites

- Node.js 18+
- Yarn package manager

### Installation

1. Install frontend dependencies:
   ```bash
   cd frontend
   yarn install
   ```

2. (Optional) Install backend dependencies:
   ```bash
   cd backend
   yarn install
   ```

3. Start the application:
   ```bash
   # Frontend (main application)
   cd frontend && yarn dev
   # Runs on http://localhost:3002
   ```

### Application Flow

1. **Landing Page**: Event information and student login
2. **Login**: Enter student ID to access event selection
3. **Event Selection**: Choose show times for Tuesday and Thursday
4. **Sprouter Checkout**: Complete purchase via embedded Sprouter iframe
5. **Return**: Navigate back to event selection if needed

### Sprouter Integration

The application integrates directly with Sprouter using secure iframe embedding:

- **Tuesday 5:30 PM**: Direct Sprouter checkout
- **Tuesday 6:30 PM**: Direct Sprouter checkout  
- **Thursday 5:30 PM**: Direct Sprouter checkout
- **Thursday 6:30 PM**: Direct Sprouter checkout

## Development

- **Frontend**: Runs on `http://localhost:3002`
- **Backend**: Available on `http://localhost:3001` (optional)
- **Database**: SQLite with 454 students (optional)

## Security

- **Iframe Sandboxing**: Secure Sprouter iframe embedding with restricted permissions
- **Student ID Validation**: Simple but effective authentication
- **Responsive Design**: Mobile-friendly interface
- **Direct Integration**: No sensitive data stored locally
- **Sprouter Security**: Leverages Sprouter's built-in security features

## Features

### Current Implementation
- ✅ **Event Information**: Complete event details with banner
- ✅ **Student Login**: Simple ID-based authentication  
- ✅ **Show Selection**: Choose one show per night
- ✅ **Sprouter Integration**: Direct checkout embedding
- ✅ **Responsive Design**: Works on all devices
- ✅ **Security**: Iframe sandboxing and secure URLs

### Available but Optional
- 🔄 **Database Integration**: 454 students imported
- 🔄 **JWT Authentication**: Full session management
- 🔄 **Family Limits**: Ticket allocation rules
- 🔄 **Volunteer Bonuses**: Additional ticket allowances
- 🔄 **Audit Logging**: Complete activity tracking

## Configuration

### Sprouter URLs
The application uses hardcoded Sprouter URLs for each event:
- Tuesday 5:30 PM and 6:30 PM
- Thursday 5:30 PM and 6:30 PM

### Environment Variables
- Frontend runs on port 3002
- Backend available on port 3001 (optional)
- Database contains 454 students (optional)
