# FCM Token Implementation Guide

## Overview
यह implementation admin registration के साथ ही FCM (Firebase Cloud Messaging) token generate करके database में store करती है। यह real-time push notifications के लिए जरूरी है।

## Features Implemented

### 1. FCM Token Generation
- Registration के दौरान automatic FCM token generation
- Browser notification permission request
- Token को database में store करना

### 2. Database Schema
Admin collection में नए fields add किए गए हैं:
```javascript
{
  // ... existing fields
  fcmToken: "string",                    // FCM token for push notifications
  fcmTokenStatus: "string",              // Status: generated/failed/not_supported/error
  fcmTokenGeneratedAt: "timestamp",      // When token was generated
  fcmTokenUpdatedAt: "timestamp",        // Last token update time
  notificationPermission: "string"       // Browser permission status
}
```

### 3. Services Added

#### FCM Utils (`src/utils/fcmUtils.js`)
- `requestPermissionAndGetToken()` - Permission request और token generation
- `getCurrentToken()` - Current token retrieve करना
- `setupForegroundMessageListener()` - Foreground message listener
- `isSupported()` - Browser support check
- `getPermissionStatus()` - Permission status check

#### Admin Service Extensions (`src/firebase/services.js`)
- `updateFCMToken(adminId, fcmToken)` - Token update करना
- `getByFCMToken(fcmToken)` - Token से admin find करना
- `removeFCMToken(adminId)` - Token remove करना (logout के लिए)

#### Notification Service (`src/firebase/services.js`)
- `sendToAdmin(fcmToken, notification, data)` - Specific admin को notification
- `sendToAllAdmins(notification, data)` - सभी active admins को notification
- `logNotification(notificationData)` - Notification history log करना
- `getNotificationHistory(limit)` - Notification history retrieve करना

## Setup Instructions

### 1. Firebase VAPID Key Setup
**IMPORTANT**: आपको Firebase console से VAPID key generate करना होगा:

1. Firebase Console में जाएं
2. Project Settings > Cloud Messaging
3. "Web configuration" section में scroll करें
4. "Web Push certificates" tab में "Generate Key Pair" click करें
5. Public key copy करें
6. `src/utils/fcmUtils.js` में vapidKey replace करें:

```javascript
const token = await getToken(messaging, {
  vapidKey: 'YOUR_ACTUAL_VAPID_KEY_HERE' // Replace this
});
```

### 2. Service Worker
Service worker already configured है (`public/firebase-messaging-sw.js`) background notifications के लिए।

### 3. Testing the Implementation

#### Registration Flow Test:
1. Application run करें: `npm run dev`
2. `/register` page पर जाएं
3. Registration form fill करें
4. Submit करने पर:
   - Browser notification permission मांगेगा
   - FCM token generate होगा
   - Database में admin data के साथ FCM token save होगा

#### Login Flow Test:
1. `/login` page पर जाएं
2. Registered admin credentials से login करें
3. Login success पर FCM token update होगा

## Implementation Details

### Registration Process (`src/pages/Register.jsx`)
```javascript
// FCM token generation during registration
const fcmResult = await fcmUtils.requestPermissionAndGetToken();
if (fcmResult.success) {
  fcmToken = fcmResult.token;
  // Token को admin data में include करना
}
```

### Login Process (`src/pages/Login.jsx`)
```javascript
// FCM token update during login
const fcmResult = await fcmUtils.getCurrentToken();
if (fcmResult.success) {
  await adminService.updateFCMToken(admin.id, fcmResult.token);
}
```

### App Level Setup (`src/App.jsx`)
```javascript
// Foreground message listener setup
fcmUtils.setupForegroundMessageListener();
```

## Database Collections

### 1. `admin` Collection
Existing admin documents में FCM related fields add हो गए हैं।

### 2. `notification_logs` Collection (New)
Notification history track करने के लिए:
```javascript
{
  id: "auto-generated",
  notification: { title, body, icon },
  data: { custom data },
  sentAt: "timestamp",
  status: "sent",
  targetAdmins: ["admin_ids"],
  totalSent: number,
  totalFailed: number
}
```

## Usage Examples

### Send Notification to All Admins
```javascript
import { notificationService } from './firebase/services';

await notificationService.sendToAllAdmins(
  {
    title: "New Order Received",
    body: "Order #12345 has been placed",
    icon: "/sadhanacutlogo.jpeg"
  },
  {
    orderId: "12345",
    type: "new_order"
  }
);
```

### Send Notification to Specific Admin
```javascript
await notificationService.sendToAdmin(
  fcmToken,
  {
    title: "Order Status Updated",
    body: "Order #12345 has been shipped"
  }
);
```

## Browser Compatibility
- Chrome 50+
- Firefox 44+
- Safari 16+ (with limitations)
- Edge 17+

## Security Notes
- FCM tokens को securely handle करें
- VAPID keys को environment variables में store करें
- Server-side notification sending implement करें production के लिए

## Troubleshooting

### Common Issues:
1. **Permission Denied**: User ने notification permission deny की है
2. **Token Not Generated**: Browser FCM support नहीं करता
3. **VAPID Key Error**: Invalid या missing VAPID key

### Debug Logs:
Console में detailed logs available हैं FCM operations के लिए।

## Next Steps
1. Backend API implement करें actual notification sending के लिए
2. Notification templates बनाएं different events के लिए
3. Notification preferences add करें admin panel में
4. Push notification analytics implement करें