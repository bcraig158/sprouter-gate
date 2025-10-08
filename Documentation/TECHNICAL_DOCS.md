# Technical Documentation - Starstruck Presents

## 🏗️ System Architecture

### Frontend Stack
```
React 18.2.0 (TypeScript)
├── Vite 4.5.0 (Build Tool)
├── Tailwind CSS 3.3.6 (Styling)
├── React Router DOM 6.20.1 (Routing)
├── Axios 1.6.2 (HTTP Client)
├── Luxon 3.4.4 (Date/Time)
└── JWT Decode 3.1.2 (Authentication)
```

### Build Pipeline
```
Source Code → TypeScript → Vite → Rollup → Terser → Production Bundle
```

## 📁 File Structure Analysis

### Core Application Files
```
src/
├── App.tsx                 # Main application component (634 lines)
├── main.tsx                # React DOM entry point
├── index.css               # Global styles with Tailwind
├── vite-env.d.ts          # Vite environment types
├── components/
│   ├── Layout.tsx          # Main layout wrapper
│   └── ProtectedRoute.tsx  # Route protection component
├── features/
│   ├── auth/LoginPage.tsx  # Authentication page
│   ├── select/SelectPage.tsx # Event selection
│   ├── purchase/PurchasePage.tsx # Checkout process
│   └── status/StatusPage.tsx # Purchase status
├── hooks/
│   └── useAuth.tsx         # Authentication hook
├── services/
│   └── api.ts              # API client configuration
└── utils/
    └── dateUtils.ts        # Date/time utilities
```

## 🔧 Configuration Files

### Vite Configuration (`vite.config.ts`)
```typescript
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
        },
      },
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', 'axios', 'jwt-decode', 'date-fns', 'luxon'],
  },
})
```

### TypeScript Configuration (`tsconfig.json`)
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

### Tailwind Configuration (`tailwind.config.js`)
```javascript
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: { /* Blue color palette */ },
        secondary: { /* Gray color palette */ }
      }
    }
  }
}
```

## 🚀 Build Process

### Local Development
```bash
npm run dev          # Start Vite dev server (port 3002)
npm run build        # Production build
npm run type-check   # TypeScript validation
```

### Production Build
```bash
npm run build:production  # NODE_ENV=production vite build
```

### Build Output
```
dist/
├── index.html                    # Main HTML file
├── assets/
│   ├── index-[hash].css         # Compiled CSS
│   ├── index-[hash].js          # Main application bundle
│   ├── vendor-[hash].js         # Third-party libraries
│   └── router-[hash].js         # Router-specific code
```

## 🌐 Deployment Configuration

### Netlify Configuration (`netlify.toml`)
```toml
[build]
  base = "frontend"
  command = "npm install --legacy-peer-deps && npm run build:production"
  publish = "dist"

[build.environment]
  NODE_VERSION = "18"
  NODE_ENV = "production"
  VITE_APP_ENV = "production"
  NPM_CONFIG_LEGACY_PEER_DEPS = "true"
  NPM_CONFIG_ENGINE_STRICT = "false"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### Environment Variables
```bash
NODE_VERSION=18
NODE_ENV=production
VITE_APP_ENV=production
NPM_CONFIG_LEGACY_PEER_DEPS=true
NPM_CONFIG_ENGINE_STRICT=false
NPM_CONFIG_AUDIT=false
NPM_CONFIG_FUND=false
NPM_CONFIG_LOGLEVEL=error
```

## 🔐 Authentication System

### Implementation
- **Method**: Simple Student ID-based authentication
- **Storage**: localStorage for session persistence
- **Validation**: Any non-empty Student ID is accepted
- **Session**: No expiration, persists until logout

### Code Structure
```typescript
// useAuth.tsx
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
```

## 🎭 Event Management

### Event Configuration
```typescript
const sprouterUrls = {
  tue530: 'https://events.sprouter.online/events/...',
  tue630: 'https://events.sprouter.online/events/...',
  thu530: 'https://events.sprouter.online/events/...',
  thu630: 'https://events.sprouter.online/events/...'
};
```

### Event Selection Logic
- Students can select **one show time total**
- Selection is exclusive (selecting one deselects others)
- Visual feedback with radio buttons
- Validation before checkout

## 💳 Sprouter Integration

### Implementation Details
```typescript
// Purchase flow
const handleRequestTickets = () => {
  const eventKey = `${day === 'tuesday' ? 'tue' : 'thu'}${time}`;
  const sprouterUrl = sprouterUrls[eventKey];
  setCurrentSprouterUrl(sprouterUrl);
  setShowSprouter(true);
};
```

### Security Considerations
- **Sandbox**: iframe with restricted permissions
- **CSP**: Content Security Policy headers
- **HTTPS**: All Sprouter URLs use HTTPS
- **Referrer Policy**: no-referrer for security

## 📱 Responsive Design

### Breakpoints
```css
/* Mobile First */
@media (min-width: 640px) { /* sm */ }
@media (min-width: 768px) { /* md */ }
@media (min-width: 1024px) { /* lg */ }
@media (min-width: 1280px) { /* xl */ }
```

### Grid Layout
```css
.grid-template-columns: repeat(auto-fit, minmax(280px, 1fr))
```

## 🎨 Styling System

### CSS Architecture
- **Base**: Tailwind CSS reset and base styles
- **Components**: Custom component classes
- **Utilities**: Tailwind utility classes
- **Custom**: Application-specific styles

### Component Classes
```css
.btn-primary {
  @apply bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 px-4 rounded-lg;
}

.card {
  @apply bg-white rounded-lg shadow-sm border border-gray-200 p-6;
}
```

## 🔧 Development Tools

### Package Management
```json
{
  "dependencies": {
    "react": "18.2.0",
    "react-dom": "18.2.0",
    "react-router-dom": "6.20.1",
    "axios": "1.6.2",
    "jwt-decode": "3.1.2",
    "luxon": "3.4.4",
    "vite": "4.5.0",
    "@vitejs/plugin-react": "4.1.1",
    "tailwindcss": "3.3.6",
    "typescript": "5.2.2"
  }
}
```

### Build Dependencies
- **Vite**: Fast build tool with HMR
- **TypeScript**: Type safety and IntelliSense
- **Tailwind CSS**: Utility-first CSS framework
- **Babel**: JavaScript compilation
- **Terser**: Code minification
- **Rollup**: Module bundling

## 🚀 Performance Optimizations

### Bundle Splitting
```typescript
rollupOptions: {
  output: {
    manualChunks: {
      vendor: ['react', 'react-dom'],
      router: ['react-router-dom'],
    },
  },
}
```

### Asset Optimization
- **Images**: Optimized and compressed
- **CSS**: Purged unused styles
- **JavaScript**: Minified and tree-shaken
- **Fonts**: System fonts for performance

## 🔍 Error Handling

### Build Error Handling
```typescript
onwarn(warning, warn) {
  if (warning.code === 'MODULE_LEVEL_DIRECTIVE') return;
  if (warning.code === 'UNUSED_EXTERNAL_IMPORT') return;
  warn(warning);
}
```

### Runtime Error Handling
- **API Errors**: Axios interceptors
- **Authentication**: Token validation
- **Navigation**: Route protection
- **External Assets**: Fallback handling

## 📊 Monitoring & Analytics

### Performance Metrics
- **Build Time**: ~3.2 seconds
- **Bundle Size**: ~140KB vendor bundle
- **Load Time**: Optimized for fast loading
- **Cache Strategy**: Static assets cached by CDN

### Error Tracking
- **Console Logging**: Development errors
- **User Feedback**: Error boundaries
- **Network Issues**: Axios error handling

## 🔄 CI/CD Pipeline

### Git Workflow
1. **Development**: Feature branches
2. **Testing**: Local validation
3. **Deployment**: Automatic on main branch push
4. **Monitoring**: Netlify build logs

### Build Process
1. **Install**: `npm install --legacy-peer-deps`
2. **Build**: `npm run build:production`
3. **Deploy**: Netlify CDN distribution
4. **Cache**: Static asset caching

## 🛠️ Troubleshooting

### Common Issues
1. **Build Failures**: Check Node version (18+)
2. **Dependency Conflicts**: Use `--legacy-peer-deps`
3. **Type Errors**: Run `npm run type-check`
4. **Styling Issues**: Check Tailwind configuration

### Debug Commands
```bash
npm run type-check    # TypeScript validation
npm run build        # Test production build
npm run preview      # Preview production build
```

## 📈 Future Improvements

### Technical Debt
- [ ] Add comprehensive error boundaries
- [ ] Implement proper logging system
- [ ] Add unit tests
- [ ] Performance monitoring
- [ ] Accessibility improvements

### Feature Enhancements
- [ ] Admin dashboard
- [ ] Email notifications
- [ ] Mobile app
- [ ] Analytics integration
- [ ] Multi-language support

---

**Last Updated**: December 2024  
**Version**: 1.0.0  
**Status**: Production Ready ✅
