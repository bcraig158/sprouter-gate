# Starstruck Presents - Event Management System

A modern React-based event management system for Starstruck Presents dance shows, featuring student authentication, event selection, and integrated Sprouter checkout.

## 🌐 Live Application

**Production URL**: https://sproutersecure.com

## 🎯 Overview

This application manages ticket sales for Starstruck Presents dance shows, allowing students to:
- Login with their Student ID
- Select from available show times (Tuesday/Thursday, 5:30 PM/6:30 PM)
- Complete ticket purchases through integrated Sprouter checkout
- View event details and policies

## 🏗️ Architecture

### Frontend (React + Vite)
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite 4.5
- **Styling**: Tailwind CSS
- **Routing**: React Router DOM
- **HTTP Client**: Axios
- **Date Handling**: Luxon
- **Authentication**: JWT-based with jwt-decode

### Backend Integration
- **Payment Processing**: Sprouter integration
- **Event Management**: Direct Sprouter URLs for each show time
- **Authentication**: Simple Student ID-based login

## 📁 Project Structure

```
StarstruckPresents/
├── frontend/                 # React application
│   ├── src/
│   │   ├── components/       # Reusable components
│   │   ├── features/         # Feature-specific pages
│   │   ├── hooks/           # Custom React hooks
│   │   ├── services/        # API services
│   │   ├── utils/           # Utility functions
│   │   └── App.tsx          # Main application
│   ├── public/              # Static assets
│   ├── package.json         # Dependencies
│   ├── vite.config.ts       # Vite configuration
│   ├── tailwind.config.js   # Tailwind CSS config
│   └── tsconfig.json        # TypeScript config
├── backend/                 # Node.js backend (if needed)
├── netlify.toml            # Netlify deployment config
└── README.md               # This file
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/bcraig158/sprouter-gate.git
   cd StarstruckPresents
   ```

2. **Install dependencies**
   ```bash
   cd frontend
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```
   The application will be available at `http://localhost:3002`

4. **Build for production**
   ```bash
   npm run build:production
   ```

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run build:production` - Build with production environment
- `npm run preview` - Preview production build
- `npm run type-check` - Run TypeScript type checking
- `npm run clean` - Clean build directory

## 🎭 Features

### Student Authentication
- Simple Student ID-based login
- No password required (any valid Student ID works)
- Session management with localStorage

### Event Selection
- **Tuesday, October 28, 2025**: 5:30 PM and 6:30 PM shows
- **Thursday, October 30, 2025**: 5:30 PM and 6:30 PM shows
- Students can select one show time total
- Visual selection interface with radio buttons

### Sprouter Integration
- Direct integration with Sprouter payment system
- Secure iframe embedding for checkout
- Event-specific URLs for each show time
- Seamless user experience

### Responsive Design
- Mobile-first design approach
- Tailwind CSS for styling
- Optimized for all device sizes
- Accessible user interface

## 🔧 Configuration

### Environment Variables
- `VITE_APP_ENV=production` - Environment setting
- `VITE_APP_URL=https://sproutersecure.com` - Application URL

### Sprouter URLs
The application includes hardcoded Sprouter URLs for each event:
- Tuesday 5:30 PM
- Tuesday 6:30 PM  
- Thursday 5:30 PM
- Thursday 6:30 PM

## 🚀 Deployment

### Netlify Deployment
The application is automatically deployed to Netlify when changes are pushed to the main branch.

**Configuration** (`netlify.toml`):
```toml
[build]
  base = "frontend"
  command = "npm install --legacy-peer-deps && npm run build:production"
  publish = "dist"

[build.environment]
  NODE_VERSION = "18"
  NODE_ENV = "production"
  VITE_APP_ENV = "production"
```

### Build Process
1. Install dependencies with legacy peer deps support
2. Run production build with Vite
3. Deploy to Netlify CDN
4. Configure SPA routing with redirects

## 🛠️ Dependencies

### Core Dependencies
- **React 18.2.0** - UI framework
- **React DOM 18.2.0** - DOM rendering
- **React Router DOM 6.20.1** - Client-side routing
- **Axios 1.6.2** - HTTP client
- **Luxon 3.4.4** - Date/time handling

### Build Dependencies
- **Vite 4.5.0** - Build tool
- **TypeScript 5.2.2** - Type checking
- **Tailwind CSS 3.3.6** - Styling
- **Babel** - JavaScript compilation
- **Terser** - Code minification

## 📱 User Flow

1. **Landing Page**: Students see event information and login form
2. **Authentication**: Enter Student ID to access event selection
3. **Event Selection**: Choose from available show times
4. **Checkout**: Complete purchase through Sprouter integration
5. **Confirmation**: Return to application or view status

## 🎨 Design System

### Colors
- **Primary**: Blue (#3b82f6)
- **Secondary**: Gray (#6b7280)
- **Success**: Green (#10b981)
- **Warning**: Yellow (#f59e0b)
- **Error**: Red (#ef4444)

### Typography
- **Font Family**: Inter, system-ui, sans-serif
- **Headings**: Bold, various sizes
- **Body**: Regular weight, readable sizes

## 🔒 Security

- **HTTPS**: All traffic encrypted
- **CSP**: Content Security Policy headers
- **XSS Protection**: Input sanitization
- **Secure Headers**: Security headers configured

## 📊 Performance

- **Build Size**: ~140KB vendor bundle
- **Load Time**: Optimized for fast loading
- **Caching**: Static assets cached by CDN
- **Compression**: Gzip compression enabled

## 🚀 Future Enhancements

- [ ] Admin dashboard for event management
- [ ] Email notifications for ticket confirmations
- [ ] Mobile app development
- [ ] Analytics and reporting
- [ ] Multi-language support

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is proprietary software for Starstruck Presents.

## 📞 Support

For technical support or questions:
- **Email**: maiduelementaryptc@gmail.com
- **Phone**: 916-749-0848
- **Website**: https://maidutickets.com

---

**Built with ❤️ for Starstruck Presents**