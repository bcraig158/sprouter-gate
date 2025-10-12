# Starstruck Presents - Event Management System

A modern React-based event management system for Starstruck Presents dance shows, featuring student authentication, event selection, and integrated Sprouter checkout with domain-specific branding.

## 🌐 Live Applications

**Primary URL**: https://sproutersecure.com (Sprouter branding)  
**Maidu URL**: https://maidutickets.com (Maidu Elementary branding)

## 🎯 Overview

This application manages ticket sales for Starstruck Presents dance shows, featuring:

### Multi-Domain Support
- **Domain Detection**: Automatically detects and adapts to different domains
- **Dynamic Branding**: Different favicons, logos, and titles based on domain
- **Sprouter Secure**: Professional Sprouter branding for sproutersecure.com
- **Maidu Elementary**: School-specific branding for maidutickets.com

### User Features
- **Student Authentication**: Simple Student ID-based login
- **Volunteer Portal**: Separate volunteer portal with enhanced benefits
- **Event Selection**: Choose from available show times (Monday/Wednesday, 5:30 PM/6:30 PM)
- **Ticket Options**: Free general admission and $25 reserved seating
- **Comprehensive Information**: Clear event details, rules, and policies
- **Sprouter Integration**: Seamless checkout experience

## 🏗️ Architecture

### Frontend (React + Vite)
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite 4.5
- **Styling**: Tailwind CSS
- **Routing**: React Router DOM
- **HTTP Client**: Axios
- **Date Handling**: Luxon
- **Authentication**: JWT-based with jwt-decode
- **Domain Detection**: Custom utility for multi-domain support
- **Dynamic Assets**: Runtime favicon and manifest generation

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
│   │   │   ├── auth/         # Login pages (Student & Volunteer)
│   │   │   ├── select/       # Event selection pages
│   │   │   ├── purchase/     # Checkout pages
│   │   │   ├── status/       # Status and confirmation
│   │   │   └── admin/        # Admin analytics
│   │   ├── hooks/           # Custom React hooks
│   │   ├── services/         # API services
│   │   ├── utils/            # Utility functions
│   │   │   ├── domainUtils.ts # Domain detection
│   │   │   └── __tests__/    # Unit tests
│   │   └── App.tsx           # Main application
│   ├── public/               # Static assets
│   │   ├── favicon.ico       # Default favicon
│   │   ├── maidu-*.png       # Maidu-specific favicons
│   │   ├── maidu3.png        # Maidu logo
│   │   └── EventBanner.png   # Default logo
│   ├── package.json          # Dependencies
│   ├── vite.config.ts       # Vite configuration
│   ├── tailwind.config.js    # Tailwind CSS config
│   └── tsconfig.json         # TypeScript config
├── backend/                  # Node.js backend (if needed)
├── netlify.toml             # Netlify deployment config
└── README.md                # This file
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

### Multi-Domain Support
- **Domain Detection**: Automatic detection of sproutersecure.com vs maidutickets.com
- **Dynamic Favicons**: Domain-specific favicon sets with `maidu-` prefix for Maidu site
- **Dynamic Logos**: Maidu Elementary logo for maidutickets.com, default for sproutersecure.com
- **Dynamic Titles**: "Maidu Elementary - Dance Show Tickets" vs "Sprouter Events - Access Control"
- **Dynamic Manifest**: Runtime web app manifest generation based on domain

### Authentication System
- **Student Login**: Simple Student ID-based authentication
- **Volunteer Portal**: Separate volunteer login with 6-digit codes
- **Session Management**: JWT-based with localStorage persistence
- **No Passwords**: Streamlined authentication process

### Event Management
- **Show Dates**: Monday, October 28 & Wednesday, October 30, 2025
- **Show Times**: 5:30 PM and 6:30 PM for each date
- **Ticket Rules**: Up to 2 tickets per family per night
- **Additional Tickets**: 4 extra tickets available starting October 20th
- **Children Policy**: Children 2 and under free (lap seating)

### Ticket Options
- **General Admission**: FREE (first come, first served, Row 3+)
- **Reserved Seating**: $25 per ticket (guaranteed first 2 rows)
- **Volunteer Benefits**: 4 tickets per night (2 base + 2 bonus), FREE tickets

### User Interface
- **Comprehensive Information Panel**: All event details in one organized section
- **Centered Event Features**: "Full Performance" and "All dance groups" text centered
- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Accessibility**: Screen reader friendly with proper ARIA labels
- **Visual Hierarchy**: Clear sections with color-coded information

### Sprouter Integration
- **Direct Integration**: Seamless checkout experience
- **Event-Specific URLs**: Unique Sprouter URLs for each show time
- **Secure Processing**: HTTPS iframe embedding
- **User Experience**: No redirects, stays within application

## 🔧 Configuration

### Environment Variables
- `VITE_APP_ENV=production` - Environment setting
- `VITE_APP_URL=https://sproutersecure.com` - Application URL

### Domain Configuration
The application supports multiple domains with automatic detection:

**sproutersecure.com** (Default Sprouter branding):
- Uses default favicon set
- Shows Sprouter logo on login page
- Title: "Sprouter Events - Access Control"

**maidutickets.com** (Maidu Elementary branding):
- Uses `maidu-` prefixed favicon set
- Shows Maidu Elementary logo on login page  
- Title: "Maidu Elementary - Dance Show Tickets"

### Sprouter URLs
The application includes hardcoded Sprouter URLs for each event:
- Monday 5:30 PM
- Monday 6:30 PM  
- Wednesday 5:30 PM
- Wednesday 6:30 PM

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

### Student Flow
1. **Landing Page**: Comprehensive event information with clear sections
2. **Authentication**: Enter Student ID to access event selection
3. **Event Selection**: Choose from available show times (Monday/Wednesday, 5:30 PM/6:30 PM)
4. **Checkout**: Complete purchase through Sprouter integration
5. **Confirmation**: Return to application or view status

### Volunteer Flow
1. **Landing Page**: Same comprehensive information panel
2. **Volunteer Login**: Enter 6-digit volunteer code and email
3. **Enhanced Selection**: Up to 4 tickets per night (2 base + 2 volunteer bonus)
4. **Free Checkout**: All volunteer tickets are FREE
5. **Confirmation**: Same checkout experience as students

### Domain-Specific Experience
- **sproutersecure.com**: Professional Sprouter branding throughout
- **maidutickets.com**: Maidu Elementary branding with school logo and colors

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

## 🆕 Recent Updates

### v2.0 - Multi-Domain Support & UI Improvements
- ✅ **Domain Detection System**: Automatic detection and adaptation for different domains
- ✅ **Dynamic Favicon Loading**: Domain-specific favicon sets with runtime generation
- ✅ **Maidu Elementary Branding**: Complete branding package for maidutickets.com
- ✅ **Comprehensive Information Panel**: Single, well-organized event information section
- ✅ **Centered Event Features**: Improved visual alignment for event selection
- ✅ **Volunteer Portal**: Enhanced volunteer experience with 4 tickets per night
- ✅ **Unit Tests**: Domain detection utilities with comprehensive test coverage
- ✅ **Dynamic Manifest**: Runtime web app manifest generation based on domain

### Technical Improvements
- ✅ **Domain Utils**: Custom utility functions for domain detection and asset management
- ✅ **Dynamic Asset Loading**: Runtime favicon and manifest generation
- ✅ **Improved UX**: Better information hierarchy and visual design
- ✅ **Accessibility**: Enhanced screen reader support and ARIA labels

## 🚀 Future Enhancements

- [ ] Admin dashboard for event management
- [ ] Email notifications for ticket confirmations
- [ ] Mobile app development
- [ ] Analytics and reporting
- [ ] Multi-language support
- [ ] Advanced volunteer management features
- [ ] Real-time ticket availability updates

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is proprietary software for Maidu Elementary School.

## 📞 Support

For technical support or questions:
- **Email**: maiduelementaryptc@gmail.com
- **Phone**: 916-749-0848
- **Website**: https://maidutickets.com
