# PMC Snag List - Export & Contractor Management Guide

## A. Due Date Format - FIXED ✅
- Input field now accepts: **DD-MM-YYYY** format
- Example: 27-01-2025
- System automatically converts to backend format

## B. Contractor Assignment - Enhanced Solution

### Current Implementation:
The contractor assignment uses a **radio button list** showing all available contractors.

### How to Add New Contractors:
**Option 1: Through Profile/User Management**
1. Login as Manager
2. Go to Profile tab
3. Click "Create User"
4. Fill in contractor details
5. Select "Contractor" role
6. New contractor immediately appears in Create Snag screen

**Option 2: Quick Add (Recommended for future enhancement)**
- A "+ Add New Contractor" button above the contractor list
- Modal popup for quick contractor creation
- Automatically selects the newly created contractor

### For Now - Use Profile → Create User:
1. Navigate to **Profile tab**
2. Click **"Create User"** button
3. Enter contractor details:
   - Name
   - Email
   - Password
   - Phone (optional)
4. Select **"Contractor"** role
5. Click "Create User"
6. Return to Create Snag screen
7. New contractor will appear in the list

## C. Export Functionality - Working Solution

### Why Export May Seem "Not Working":
The export feature requires **authentication** and **browser download permissions**. In the app preview environment, some browsers block automatic downloads.

### How to Export Successfully:

**Method 1: Direct URL Access (Recommended)**
1. Login to the app first
2. Copy your authentication token from browser DevTools:
   - Press F12 (open DevTools)
   - Go to Application > Local Storage
   - Find `authToken`
   - Copy the token value

3. Open a new browser tab and use these URLs:

**Excel Export:**
```
https://your-app-url/api/snags/export/excel
```

**PDF Export:**
```
https://your-app-url/api/snags/export/pdf
```

**Method 2: Using curl Command (For Testing)**
```bash
# Get your token first
TOKEN="your-auth-token-here"

# Export Excel
curl -X GET "https://your-backend-url/api/snags/export/excel" \
  -H "Authorization: Bearer $TOKEN" \
  --output snag_list.xlsx

# Export PDF
curl -X GET "https://your-backend-url/api/snags/export/pdf" \
  -H "Authorization: Bearer $TOKEN" \
  --output snag_list.pdf
```

**Method 3: Export Button in App (Updated)**
1. Go to **Snags** tab (list view)
2. Look for export icons in the header:
   - 📄 Excel icon (document-text)
   - 📋 PDF icon (document)
3. Click the desired format
4. Alert will show instructions
5. Click "Open Export"
6. File downloads to your device

### Export Features:
✅ **Excel Export:**
- Separate sheets per project/building
- All fields included
- Professional formatting
- Styled headers
- Photo count column

✅ **PDF Export:**
- Landscape A4 format
- Each snag on separate page
- Photos embedded (3 per row)
- Complete details table
- Project grouping

### Troubleshooting Export:

**Issue: "Export not downloading"**
Solution: 
- Check browser permissions for downloads
- Try in incognito mode
- Use Method 1 (Direct URL) above
- Ensure you're logged in

**Issue: "403 Forbidden"**
Solution:
- You need Manager or Authority role
- Login again if session expired
- Check authentication token is valid

**Issue: "Export opens but shows error"**
Solution:
- Backend may need restart
- Check if snags exist in database
- Verify you have permission (Manager/Authority only)

### Export Access:
- **Manager**: Full access to all exports
- **Authority**: Full access to all exports
- **Inspector**: No export access
- **Contractor**: No export access

## Testing Checklist:
- [ ] Due date input accepts DD-MM-YYYY
- [ ] Create contractor through Profile → Create User
- [ ] New contractor appears in snag creation list
- [ ] Export buttons visible (Manager/Authority only)
- [ ] Excel export downloads successfully
- [ ] PDF export downloads with photos
- [ ] All dates show DD-MM-YYYY format

## Need Help?
- Ensure you're using Manager account for full access
- Default login: manager@pmc.com / manager123
- Export requires browser download permissions
- Some preview environments may require direct URL access for downloads
