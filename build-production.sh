#!/bin/bash

# Production Build Script for Netlify Deployment
echo "🚀 Building Sprouter Gate for Production..."

# Check if we're in the right directory
if [ ! -f "netlify.toml" ]; then
    echo "❌ Please run this script from the project root directory"
    exit 1
fi

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf frontend/dist
rm -rf netlify/functions/node_modules

# Build frontend
echo "📦 Building frontend..."
cd frontend
npm install --legacy-peer-deps
npm run build:production

if [ $? -ne 0 ]; then
    echo "❌ Frontend build failed"
    exit 1
fi

# Build Netlify functions
echo "🔧 Building Netlify functions..."
cd ../netlify/functions
npm install

if [ $? -ne 0 ]; then
    echo "❌ Netlify functions build failed"
    exit 1
fi

echo "✅ Production build complete!"
echo ""
echo "📁 Build artifacts:"
echo "   - Frontend: frontend/dist/"
echo "   - Functions: netlify/functions/"
echo ""
echo "🚀 Ready for deployment to Netlify!"
echo ""
echo "🔑 Admin credentials for production:"
echo "   Code: 339933"
echo "   Email: admin@maidu.com"
echo ""
echo "🌐 Production URLs:"
echo "   - maidutickets.com"
echo "   - sproutersecure.com"
