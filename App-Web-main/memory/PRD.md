# PMC Snag List - Product Requirements Document

## Original Problem Statement
Deploy a mobile Snag Management application from a GitHub repository. The project is a React Native/Expo mobile app with a FastAPI backend for construction project snag tracking.

## User Personas
1. **Project Manager** - Creates and assigns snags, monitors overall progress
2. **Inspector** - Reports snags on-site, takes photos, adds GPS coordinates
3. **Contractor** - Views assigned snags, marks work as complete with completion date
4. **Authority** - Verifies completed snag fixes, provides feedback and comments

## Core Requirements
- Mobile app for field workers (React Native/Expo)
- Web admin dashboard for managers
- Backend API for data management
- Real-time synchronization between clients
- Photo documentation with GPS tagging
- Role-based access control

---

## What's Been Implemented

### Backend (FastAPI) - ✅ COMPLETE
- User authentication (JWT-based)
- CRUD operations for snags, projects, users
- Photo upload with base64 handling
- WebSocket for real-time updates
- Notification system
- Role-based permissions
- Dashboard statistics endpoint
- **NEW: Auto-assignment of authorities to buildings based on previous snags**
- **NEW: Authority feedback and comment fields**
- **NEW: Contractor completion date field**
- **NEW: Authorities endpoint (`/api/users/authorities`)**
- **NEW: Previous authority lookup (`/api/buildings/{building}/previous-authority`)**

### Web Admin Dashboard (React) - ✅ COMPLETE
- Login page with authentication
- Dashboard with statistics cards
- Snags management with filtering, search, export
- User management page
- Real-time "Live Sync Active" indicator

### Mobile App (React Native/Expo) - ✅ BUILD IN PROGRESS
- **Build ID**: 722ce5ee-10ed-4b4e-9b28-7b8923843a48
- **Track Build**: https://expo.dev/accounts/1.61design/projects/pmc-snag-list/builds/722ce5ee-10ed-4b4e-9b28-7b8923843a48

**Latest Changes (January 28, 2025):**
- ✅ **A. Auto-assignment of authorities** - Backend now automatically assigns the authority from previous snags for the same building
- ✅ **B. Push Notifications** - Notifications sent to all assigned users (contractor + authority) when snag is created/updated
- ✅ **C. App Logo Changed** - Replaced with 1.61 Design logo
- ✅ **D. Contractor Completion Date** - Added date picker in Action Menu for contractors to set completion date
- ✅ **E. Authority Feedback & Comment** - Added feedback and comment fields in Action Menu for authorities
- ✅ Removed demo credentials from login page
- ✅ Fixed dashboard UI overlapping issue

---

## Credentials

### App Login Credentials
- **Email**: 1.61design@pmc.com
- **Password**: 1.61@Design
- **Role**: Manager

### Expo Account
- **Username**: 1.61Design
- **Password**: 1.61@Design

---

## Architecture

```
/app/
├── backend/                 # FastAPI backend
│   ├── server.py           # Main application (all routes)
│   ├── requirements.txt
│   └── .env
├── frontend/               # React web admin dashboard
│   ├── src/
│   │   ├── App.js         # Main dashboard component
│   │   └── App.css
│   └── .env
└── Snag-App-main/          # Mobile app source
    ├── frontend/           # React Native/Expo app
    │   ├── app/           # Expo Router pages
    │   ├── contexts/      # State management
    │   ├── config/        # API configuration
    │   ├── eas.json       # Build configuration
    │   └── .env
    └── MOBILE_BUILD_GUIDE.md
```

---

## Key API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/login` | POST | User authentication |
| `/api/auth/me` | GET | Current user info |
| `/api/dashboard` | GET | Statistics data |
| `/api/snags` | GET, POST | List/Create snags |
| `/api/snags/{id}` | GET, PUT, DELETE | Snag operations |
| `/api/users` | GET | List users |
| `/api/users/contractors` | GET | List contractors |
| `/api/users/authorities` | GET | List authorities |
| `/api/buildings/{name}/previous-authority` | GET | Get previous authority for building |
| `/api/projects` | GET | List projects |
| `/api/notifications` | GET, PUT | Notifications |
| `/api/ws` | WebSocket | Real-time updates |

---

## Role-Based Permissions

### Contractor
- View assigned snags only
- Start work (status: open → in_progress)
- Mark work complete with completion date
- Cannot edit other fields

### Authority  
- View snags assigned to them
- Approve snags and provide feedback/comments
- Cannot edit other fields

### Manager/Inspector
- Full access to all snags
- Can edit all fields
- Can assign contractors and authorities
- Can delete snags

---

## P0 - Completed This Session
- ✅ Auto-assignment of authorities to buildings
- ✅ Notifications to all assigned users
- ✅ Changed app logo to 1.61 Design
- ✅ Contractor completion date in Action Menu
- ✅ Authority feedback & comment in Action Menu
- ✅ Removed demo credentials from login page
- ✅ Fixed dashboard UI overlapping

## P1 - Next Steps
- [ ] Wait for APK build to complete (~15-20 min)
- [ ] Test all new features on Android device
- [ ] Implement Firebase Cloud Messaging for push notifications when app is closed

## P2 - Future Enhancements
- [ ] Refactor web dashboard into component files
- [ ] Add offline mode for mobile app
- [ ] Implement image compression for uploads
- [ ] Add PDF report generation
- [ ] Dark mode support

---

## URLs
- **Web Dashboard**: https://buildtrack-app-3.preview.emergentagent.com
- **API Base**: https://buildtrack-app-3.preview.emergentagent.com/api
- **Build Tracking**: https://expo.dev/accounts/1.61design/projects/pmc-snag-list/builds/722ce5ee-10ed-4b4e-9b28-7b8923843a48
