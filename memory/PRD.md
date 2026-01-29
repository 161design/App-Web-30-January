# PMC Snag List - Product Requirements Document

## Overview
Property Management Construction (PMC) Snag List application for tracking and managing construction defects/snags across multiple buildings.

## Architecture
- **Frontend**: React.js with Recharts for charts, browser-image-compression for image optimization
- **Backend**: FastAPI (Python) with MongoDB
- **Real-time**: WebSocket for live updates
- **Mobile**: React Native/Expo app (in Snag-App-main folder)

## User Personas & Roles
1. **Manager** - Full access: create/edit/delete snags, manage users, export reports
2. **Inspector** - Create and edit snags, assign contractors
3. **Contractor** - View assigned snags, mark work complete
4. **Authority** - Approve/reject work, provide feedback

## Core Features (Implemented)
- [x] User authentication with JWT
- [x] Role-based access control
- [x] Snag CRUD operations
- [x] Photo uploads with base64 encoding
- [x] Building-wise snag numbering
- [x] Status tracking (Open → In Progress → Resolved → Verified)
- [x] Priority levels (High/Medium/Low)
- [x] Excel/PDF export functionality
- [x] Real-time updates via WebSocket
- [x] Notifications system
- [x] Dashboard with statistics

## Recent Improvements (Jan 29, 2026)
- [x] **Image Compression** - Auto-compress photos to 500KB max, 1200px dimensions
- [x] **Dashboard Charts** - Pie chart for status distribution, Bar chart for building-wise snags
- [x] **Pagination** - Paginated snags list with 10/25/50/100 items per page options

## Backlog (Future Enhancements)
### P0 - High Priority
- [ ] Offline support for mobile app
- [ ] Push notifications (Firebase/Expo)

### P1 - Medium Priority  
- [ ] Dark mode toggle
- [ ] Advanced date range filters
- [ ] Snag comments/activity timeline
- [ ] Location map integration

### P2 - Nice to Have
- [ ] Email notifications (SendGrid)
- [ ] AI-powered categorization
- [ ] Multi-language support
- [ ] Audit trail logging

## API Endpoints
- POST /api/auth/login - User login
- POST /api/auth/register - Create user (Manager only)
- GET /api/snags - List snags with filters
- POST /api/snags - Create snag
- PUT /api/snags/{id} - Update snag
- DELETE /api/snags/{id} - Delete snag
- GET /api/dashboard/stats - Dashboard statistics
- GET /api/snags/export/excel - Export to Excel
- GET /api/snags/export/pdf - Export to PDF
- WebSocket /api/ws - Real-time updates

## Default Credentials
- Email: manager@pmc.com
- Password: manager123

## Photo Annotation Feature (Jan 29, 2026)

### Web App Implementation
- **PhotoAnnotationModal component** in App.js
- HTML5 Canvas-based drawing
- Features:
  - Draw ellipses/circles by click and drag
  - Color picker: Red (default), Yellow, Green, Blue, White, Black
  - Undo last annotation
  - Clear all annotations
  - Save annotated image (replaces original)
  - Auto-opens after photo capture/selection
  - Click existing photos to re-annotate

### Mobile App Implementation (Expo/React Native)
- **PhotoAnnotation component** at `/app/components/PhotoAnnotation.tsx`
- Uses `react-native-svg` for drawing ellipses
- Uses `react-native-view-shot` for capturing annotated image
- Features:
  - Same color picker as web (6 colors)
  - Touch-based drawing (PanResponder)
  - Undo/Clear functionality
  - Full-screen modal for annotation
  - Auto-opens after camera/gallery selection

### Dependencies Added
- Web: `browser-image-compression`, `recharts`
- Mobile: `react-native-svg`, `react-native-view-shot`

## Calendar UI & Auto-Assign Authorities (Jan 29, 2026)

### A. Calendar UI Fix
- **DatePickerCalendar component** - Full calendar picker UI
- Features:
  - Visual calendar grid with month/year navigation
  - Click any date to select
  - DD/MM/YYYY format display
  - Clear date button
  - "Today" quick select button
  - Minimum date support (for future dates)
- Works in both Create Snag and Edit Snag modals

### B. Auto-Assign Authorities
- **Backend API**: `/api/buildings/{name}/suggested-authorities`
  - Aggregates historical snag data by building
  - Returns top 3 authorities who handled most snags for that building
  - Includes snag count for each authority
- **Web App UI**:
  - "Auto-Assign" button with lightning bolt icon
  - Suggested authorities shown as clickable chips
  - Shows snag count (e.g., "John Authority (5 snags)")
  - One-click to assign suggested authority
- **Mobile App UI**:
  - Same features adapted for React Native
  - Styled suggestion chips
  - Auto-assign button in header

### Test Data
- Authority user: authority1@pmc.com / auth123
- Building A has 5+ snags with authority assigned (for suggestions)

## Multiple Authorities Selection (Jan 29, 2026)

### Feature Description
Allows selecting multiple responsible authorities for a single snag using checkboxes instead of a single dropdown.

### Backend Changes
- **New field**: `assigned_authority_ids: List[str]` - Array of authority IDs
- **New field**: `assigned_authority_names: List[str]` - Array of authority names
- **Backward compatibility**: Old `assigned_authority_id` field still supported
- Updated snag create, get, and list endpoints

### Web App UI
- **Checkbox list** - All authorities shown with checkboxes
- **Selected count badge** - Shows "X selected" next to label
- **Auto-Assign All** button - Selects all suggested authorities
- **Removable tags** - Selected authorities shown as chips with X button
- **Snag table** - New "Authorities" column showing multiple authority tags

### Mobile App Updates
- Same checkbox selection UI
- Radio buttons replaced with checkboxes
- Suggested authorities with selection
- Auto-assign functionality
