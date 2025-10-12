#!/bin/bash

# Sprouter Gate System Setup Script
# This script sets up the entire system for development

echo "🚀 Setting up Sprouter Gate System..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Please run this script from the project root directory"
    exit 1
fi

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check dependencies
echo "📋 Checking dependencies..."

if ! command_exists node; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

if ! command_exists npm; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "✅ Node.js and npm are available"

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
if [ ! -d "node_modules" ]; then
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install backend dependencies"
        exit 1
    fi
else
    echo "✅ Backend dependencies already installed"
fi

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd ../frontend
if [ ! -d "node_modules" ]; then
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install frontend dependencies"
        exit 1
    fi
else
    echo "✅ Frontend dependencies already installed"
fi

# Setup database
echo "🗄️  Setting up database..."
cd ../backend
npm run consolidate-database
if [ $? -ne 0 ]; then
    echo "❌ Failed to setup database"
    exit 1
fi

echo ""
echo "🎉 System setup complete!"
echo ""
echo "📝 To start the system:"
echo "1. Start backend: cd backend && npm run dev"
echo "2. Start frontend: cd frontend && npm run dev"
echo ""
echo "🔑 Admin login credentials:"
echo "   Code: 339933"
echo "   Email: admin@maidu.com"
echo ""
echo "🌐 Access URLs:"
echo "   Frontend: http://localhost:3002"
echo "   Backend API: http://localhost:3001"
echo "   Admin Analytics: http://localhost:3002/admin-analytics"
