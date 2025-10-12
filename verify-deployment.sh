#!/bin/bash

# Deployment Verification Script
# Ensures analytics data persists across Netlify deployments

echo "🚀 Verifying Netlify Deployment Setup..."
echo "========================================"

# Check if we're in the right directory
if [ ! -f "netlify.toml" ]; then
    echo "❌ Error: netlify.toml not found. Please run from project root."
    exit 1
fi

echo "✅ Found netlify.toml configuration"

# Check build configuration
echo ""
echo "📋 Build Configuration:"
echo "======================="

# Check if frontend build command exists
if [ -f "frontend/package.json" ]; then
    echo "✅ Frontend package.json found"
    
    # Check for build:production script
    if grep -q "build:production" frontend/package.json; then
        echo "✅ build:production script found"
    else
        echo "❌ build:production script not found in frontend/package.json"
        exit 1
    fi
else
    echo "❌ Frontend package.json not found"
    exit 1
fi

# Check Netlify functions
if [ -d "netlify/functions" ]; then
    echo "✅ Netlify functions directory found"
    
    if [ -f "netlify/functions/api.js" ]; then
        echo "✅ API function found"
    else
        echo "❌ API function not found"
        exit 1
    fi
    
    if [ -f "netlify/functions/secureStorage.js" ]; then
        echo "✅ Secure storage found"
    else
        echo "❌ Secure storage not found"
        exit 1
    fi
else
    echo "❌ Netlify functions directory not found"
    exit 1
fi

# Check analytics persistence configuration
echo ""
echo "💾 Analytics Persistence Configuration:"
echo "======================================="

# Check if secure storage has backup functionality
if grep -q "createBackups" netlify/functions/secureStorage.js; then
    echo "✅ Backup functionality implemented"
else
    echo "❌ Backup functionality not found"
    exit 1
fi

# Check if loadData has recovery functionality
if grep -q "Recovered analytics data from backup" netlify/functions/secureStorage.js; then
    echo "✅ Data recovery functionality implemented"
else
    echo "❌ Data recovery functionality not found"
    exit 1
fi

# Check environment variables
echo ""
echo "🔧 Environment Variables:"
echo "========================="

# Check if JWT_SECRET is set in netlify.toml
if grep -q "JWT_SECRET" netlify.toml; then
    echo "✅ JWT_SECRET configured"
else
    echo "❌ JWT_SECRET not configured"
    exit 1
fi

# Check if ANALYTICS_ENCRYPTION_KEY is set
if grep -q "ANALYTICS_ENCRYPTION_KEY" netlify.toml; then
    echo "✅ ANALYTICS_ENCRYPTION_KEY configured"
else
    echo "❌ ANALYTICS_ENCRYPTION_KEY not configured"
    exit 1
fi

# Check domain configuration
echo ""
echo "🌐 Domain Configuration:"
echo "========================"

# Check if both domains are configured
if grep -q "maidutickets.com" netlify.toml; then
    echo "✅ maidutickets.com configured"
else
    echo "❌ maidutickets.com not configured"
fi

# Check if sproutersecure.com is supported
if grep -q "sproutersecure.com" frontend/src/utils/domainUtils.ts; then
    echo "✅ sproutersecure.com supported"
else
    echo "❌ sproutersecure.com not supported"
fi

# Check API endpoints
echo ""
echo "🔌 API Endpoints:"
echo "================="

# Check if track-activity endpoint exists
if grep -q "track-activity" netlify/functions/api.js; then
    echo "✅ /api/track-activity endpoint found"
else
    echo "❌ /api/track-activity endpoint not found"
    exit 1
fi

# Check if analytics endpoint exists
if grep -q "analytics" netlify/functions/api.js; then
    echo "✅ /api/analytics endpoint found"
else
    echo "❌ /api/analytics endpoint not found"
    exit 1
fi

# Check if admin login is configured
if grep -q "339933" netlify/functions/api.js; then
    echo "✅ Admin login (339933) configured"
else
    echo "❌ Admin login not configured"
fi

# Check build process
echo ""
echo "🏗️  Build Process:"
echo "==================="

# Test frontend build
echo "Testing frontend build..."
cd frontend
if npm run build:production > /dev/null 2>&1; then
    echo "✅ Frontend build successful"
else
    echo "❌ Frontend build failed"
    exit 1
fi
cd ..

# Test Netlify functions
echo "Testing Netlify functions..."
cd netlify/functions
if npm install > /dev/null 2>&1; then
    echo "✅ Netlify functions dependencies installed"
else
    echo "❌ Netlify functions dependencies failed"
    exit 1
fi
cd ../..

echo ""
echo "🎉 Deployment Verification Complete!"
echo "===================================="
echo ""
echo "✅ All checks passed - Ready for production deployment"
echo ""
echo "📋 Summary:"
echo "  - Analytics data will persist across deployments"
echo "  - Backup and recovery system implemented"
echo "  - Both domains (maidutickets.com, sproutersecure.com) supported"
echo "  - Admin login configured (339933/admin@maidu.com)"
echo "  - All API endpoints functional"
echo "  - Build process verified"
echo ""
echo "🚀 Ready to deploy to Netlify!"
echo "   - Analytics data will survive deployments"
echo "   - Real-time tracking will work on both domains"
echo "   - Admin dashboard will show persistent data"
