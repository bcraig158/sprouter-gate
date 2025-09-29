# Development Guide

## 🚀 Quick Start

### Local Development (Frontend Only)
```bash
cd frontend
yarn install
yarn dev
```
- **Frontend**: http://localhost:3002
- **Features**: Hot reload, TypeScript checking, Tailwind CSS

### Local Development (Full Stack)
```bash
cd frontend
yarn install
yarn dev:backend
```
- **Frontend**: http://localhost:3002
- **Backend**: http://localhost:3001
- **Features**: Both servers running with hot reload

### Production Build
```bash
cd frontend
yarn build:production
```
- **Output**: `frontend/dist/` (ready for deployment)

## 🔧 Environment Configuration

### Development Environment
- **API Base URL**: `http://localhost:3001/api` (via Vite proxy)
- **Environment**: `development`
- **Features**: Hot reload, sourcemaps, development tools

### Production Environment (Netlify)
- **API Base URL**: `/api` (relative URLs)
- **Environment**: `production`
- **Features**: Optimized build, no sourcemaps, minified code

## 📁 Project Structure

```
frontend/
├── src/
│   ├── components/     # Reusable UI components
│   ├── features/       # Feature-specific components
│   ├── hooks/         # Custom React hooks
│   ├── services/      # API services
│   ├── utils/         # Utility functions
│   └── types/         # TypeScript type definitions
├── public/            # Static assets
├── .env.local        # Local development environment
├── .env.production   # Production environment
└── vite.config.ts    # Vite configuration
```

## 🛠️ Available Scripts

| Script | Description |
|--------|-------------|
| `yarn dev` | Start development server (frontend only) |
| `yarn dev:backend` | Start both frontend and backend |
| `yarn build` | Build for production |
| `yarn build:production` | Build with production optimizations |
| `yarn preview` | Preview production build locally |
| `yarn lint` | Run ESLint |
| `yarn type-check` | Run TypeScript type checking |

## 🌐 Deployment

### Netlify (Current)
- **Automatic**: Pushes to GitHub trigger builds
- **Manual**: Trigger deploy from Netlify dashboard
- **URL**: https://sproutersecure.com

### Environment Variables
- **Development**: Uses `.env.local`
- **Production**: Uses Netlify environment variables
- **API**: Automatically configured for each environment

## 🔍 Troubleshooting

### Common Issues

1. **Port 3002 already in use**
   ```bash
   # Kill process using port 3002
   lsof -ti:3002 | xargs kill -9
   ```

2. **TypeScript errors**
   ```bash
   yarn type-check
   ```

3. **Build failures**
   ```bash
   yarn build:production
   ```

### Development Tips

- **Hot Reload**: Changes automatically refresh the browser
- **TypeScript**: Errors shown in terminal and browser
- **Tailwind**: Classes auto-complete in VS Code
- **API**: Proxy handles CORS in development

## 📝 Notes

- **Backend Optional**: Frontend works independently
- **Sprouter Integration**: Direct iframe embedding
- **Authentication**: Simple student ID validation
- **Responsive**: Mobile-friendly design
