# Mobile App Build Instructions for Snag-App

## Current Build Status
**Build ID**: 383e28fe-bad5-484e-8efb-2c7128a9de95
**Status**: In Progress (Building on Expo Cloud)
**Track Progress**: https://expo.dev/accounts/1.61design/projects/pmc-snag-list/builds/383e28fe-bad5-484e-8efb-2c7128a9de95

Once complete, the APK download link will appear on the build page above.

## Backend URL
Your mobile app connects to:
```
EXPO_PUBLIC_BACKEND_URL=https://buildtrack-app-3.preview.emergentagent.com
```

This has been set in `/app/Snag-App-main/frontend/.env`

## App Credentials
- **Email**: 1.61design@pmc.com
- **Password**: 1.61@Design

## Expo Account
- **Username**: 1.61Design
- **Project**: https://expo.dev/accounts/1.61design/projects/pmc-snag-list

## Building Future Updates

### To rebuild the APK:
```bash
cd /app/Snag-App-main/frontend
npx expo login -u "1.61Design" -p "1.61@Design"
npx eas build --platform android --profile preview
```

### Build Profiles:
- `preview` - APK for testing (internal distribution)
- `production` - APK for production release

## Features Available
- User authentication (JWT-based)
- Snag management (CRUD)
- Photo capture and upload
- GPS location tagging (UTM format)
- Push notifications
- Contractor assignment
- Authority approval workflow
- Real-time sync via WebSocket
