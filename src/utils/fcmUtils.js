import { getToken, onMessage, deleteToken } from 'firebase/messaging';
import { messaging } from '../firebase/config';

// FCM Utility Functions
export const fcmUtils = {
  // Request notification permission and get FCM token
  async requestPermissionAndGetToken() {
    try {
      console.log('Requesting notification permission...');
      
      // Request permission for notifications
      const permission = await Notification.requestPermission();
      
      if (permission === 'granted') {
       console.log('Notification permission granted.');
        
    
        
        console.log('Attempting to get FCM token...');
        console.log('Browser:', navigator.userAgent);
        console.log('Messaging object:', messaging);
        
        try {
          const token = await getToken(messaging, {
            vapidKey: 'BGY0Eoylfn3ZeHntJRMbXYLlkJUzJyFTe0T7q2bkqE4la6a_GAhKroGstESMkrqsWZhSIYVmONRc86_rvcx9Kbc' // Replace with your Firebase VAPID key
          });
          
          console.log('getToken() result:', token);
        } catch (tokenError) {
          console.error('Error getting FCM token:', tokenError);
          return {
            success: false,
            error: `Token generation failed: ${tokenError.message}`,
            permission: permission,
            details: tokenError
          };
        }
        
        // Try with VAPID key first
        let token;
        try {
          token = await getToken(messaging, {
            vapidKey: 'BGY0Eoylfn3ZeHntJRMbXYLlkJUzJyFTe0T7q2bkqE4la6a_GAhKroGstESMkrqsWZhSIYVmONRc86_rvcx9Kbc' // Replace with your Firebase VAPID key
          });
        } catch (vapidError) {
          console.warn('VAPID key failed, trying without VAPID key:', vapidError);
          // Fallback: try without VAPID key (for testing only)
          try {
            token = await getToken(messaging);
          } catch (fallbackError) {
            console.error('Both VAPID and fallback failed:', fallbackError);
            throw fallbackError;
          }
        }
        
        if (token) {
          console.log('FCM Token generated:', token);
          return {
            success: true,
            token: token,
            permission: permission
          };
        } else {
          console.log('No registration token available.');
          return {
            success: false,
            error: 'No registration token available',
            permission: permission
          };
        }
      } else {
        console.log('Unable to get permission to notify.');
        return {
          success: false,
          error: 'Permission denied',
          permission: permission
        };
      }
    } catch (error) {
      console.error('An error occurred while retrieving token:', error);
      return {
        success: false,
        error: error.message,
        permission: 'default'
      };
    }
  },

  // Get current FCM token (if permission already granted)
  async getCurrentToken() {
    try {
      console.log('Getting current FCM token...');
      
      // Try with VAPID key first
      let token;
      try {
        token = await getToken(messaging, {
          vapidKey: 'BGY0Eoylfn3ZeHntJRMbXYLlkJUzJyFTe0T7q2bkqE4la6a_GAhKroGstESMkrqsWZhSIYVmONRc86_rvcx9Kbc' // Replace with your Firebase VAPID key
        });
      } catch (vapidError) {
        console.warn('VAPID key failed in getCurrentToken, trying without VAPID key:', vapidError);
        // Fallback: try without VAPID key (for testing only)
        try {
          token = await getToken(messaging);
        } catch (fallbackError) {
          console.error('Both VAPID and fallback failed in getCurrentToken:', fallbackError);
          throw fallbackError;
        }
      }
      
      if (token) {
        console.log('Current FCM Token:', token);
        return {
          success: true,
          token: token
        };
      } else {
        console.log('No current token available');
        return {
          success: false,
          error: 'No token available'
        };
      }
    } catch (error) {
      console.error('Error getting current token:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Force generate new FCM token (for login scenarios)
  async forceGenerateNewToken() {
    try {
      console.log('Force generating new FCM token...');
      
      // First try to get current token and delete it
      try {
        const currentToken = await getToken(messaging);
        if (currentToken) {
          console.log('Deleting old token before generating new one...');
          // Delete the current token
          await deleteToken(messaging);
          console.log('Old token deleted successfully');
        }
      } catch (deleteError) {
        console.warn('Could not delete old token (this is okay):', deleteError);
      }
      
      // Now generate new token
      let newToken;
      try {
        newToken = await getToken(messaging, {
          vapidKey: 'BGY0Eoylfn3ZeHntJRMbXYLlkJUzJyFTe0T7q2bkqE4la6a_GAhKroGstESMkrqsWZhSIYVmONRc86_rvcx9Kbc' // Replace with your Firebase VAPID key
        });
      } catch (vapidError) {
        console.warn('VAPID key failed in forceGenerateNewToken, trying without VAPID key:', vapidError);
        try {
          newToken = await getToken(messaging);
        } catch (fallbackError) {
          console.error('Both VAPID and fallback failed in forceGenerateNewToken:', fallbackError);
          throw fallbackError;
        }
      }
      
      if (newToken) {
        console.log('🆕 New FCM Token generated:', newToken);
        return {
          success: true,
          token: newToken,
          isNewToken: true
        };
      } else {
        console.log('Failed to generate new token');
        return {
          success: false,
          error: 'Failed to generate new token'
        };
      }
    } catch (error) {
      console.error('Error in forceGenerateNewToken:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Setup foreground message listener
  setupForegroundMessageListener() {
    onMessage(messaging, (payload) => {
      console.log('Message received in foreground:', payload);
      
      // Show notification manually for foreground messages
      if (payload.notification) {
        const { title, body, icon } = payload.notification;
        
        // Create and show notification
        if (Notification.permission === 'granted') {
          new Notification(title || 'Sadhana Cart Admin', {
            body: body || 'You have a new notification',
            icon: icon || '/sadhanacutlogo.jpeg',
            tag: 'sadhana-cart-notification'
          });
        }
      }
    });
  },

  // Check if browser supports FCM
  isSupported() {
    return 'serviceWorker' in navigator && 'Notification' in window;
  },

  // Get current notification permission status
  getPermissionStatus() {
    if ('Notification' in window) {
      return Notification.permission;
    }
    return 'unsupported';
  }
};

export default fcmUtils;