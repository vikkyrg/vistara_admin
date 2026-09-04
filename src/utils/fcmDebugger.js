// FCM Debugging Utility
import { getToken, isSupported } from 'firebase/messaging';
import { messaging } from '../firebase/config';

export const fcmDebugger = {
  // Comprehensive FCM environment check
  async diagnoseEnvironment() {
    console.log('🔍 FCM Environment Diagnosis');
    console.log('='.repeat(50));
    
    const diagnosis = {
      browser: this.getBrowserInfo(),
      permissions: await this.checkPermissions(),
      firebaseSupport: await this.checkFirebaseSupport(),
      serviceWorker: await this.checkServiceWorker(),
      vapidKey: this.checkVapidKey(),
      messaging: this.checkMessagingObject()
    };
    
    console.log('📊 Diagnosis Results:', diagnosis);
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(diagnosis);
    console.log('💡 Recommendations:', recommendations);
    
    return { diagnosis, recommendations };
  },
  
  // Browser information
  getBrowserInfo() {
    const userAgent = navigator.userAgent;
    let browserName = 'Unknown';
    let version = 'Unknown';
    
    if (userAgent.includes('Chrome')) {
      browserName = 'Chrome';
      version = userAgent.match(/Chrome\/(\d+)/)?.[1] || 'Unknown';
    } else if (userAgent.includes('Firefox')) {
      browserName = 'Firefox';
      version = userAgent.match(/Firefox\/(\d+)/)?.[1] || 'Unknown';
    } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
      browserName = 'Safari';
      version = userAgent.match(/Version\/(\d+)/)?.[1] || 'Unknown';
    } else if (userAgent.includes('Edge')) {
      browserName = 'Edge';
      version = userAgent.match(/Edg\/(\d+)/)?.[1] || 'Unknown';
    }
    
    const info = {
      name: browserName,
      version: version,
      userAgent: userAgent,
      isSupported: this.isBrowserSupported(browserName, version)
    };
    
    console.log('🌐 Browser Info:', info);
    return info;
  },
  
  // Check browser support
  isBrowserSupported(browser, version) {
    const supportedBrowsers = {
      'Chrome': 50,
      'Firefox': 44,
      'Safari': 16,
      'Edge': 17
    };
    
    const minVersion = supportedBrowsers[browser];
    if (!minVersion) return false;
    
    return parseInt(version) >= minVersion;
  },
  
  // Check notification permissions
  async checkPermissions() {
    const permission = Notification.permission;
    
    const permissionInfo = {
      current: permission,
      canRequest: permission === 'default',
      isGranted: permission === 'granted',
      isDenied: permission === 'denied'
    };
    
    console.log('🔐 Permission Info:', permissionInfo);
    
    if (permission === 'default') {
      console.log('⚠️ Permission not requested yet');
    } else if (permission === 'denied') {
      console.log('❌ Permission denied - user needs to manually enable');
    } else if (permission === 'granted') {
      console.log('✅ Permission granted');
    }
    
    return permissionInfo;
  },
  
  // Check Firebase messaging support
  async checkFirebaseSupport() {
    try {
      const supported = await isSupported();
      console.log('🔥 Firebase Messaging Support:', supported);
      
      if (!supported) {
        console.log('❌ Firebase Messaging not supported in this environment');
      }
      
      return {
        isSupported: supported,
        error: null
      };
    } catch (error) {
      console.error('❌ Error checking Firebase support:', error);
      return {
        isSupported: false,
        error: error.message
      };
    }
  },
  
  // Check service worker
  async checkServiceWorker() {
    if (!('serviceWorker' in navigator)) {
      console.log('❌ Service Worker not supported');
      return {
        supported: false,
        registered: false,
        error: 'Service Worker not supported'
      };
    }
    
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      const info = {
        supported: true,
        registered: !!registration,
        scope: registration?.scope || null,
        scriptURL: registration?.active?.scriptURL || null
      };
      
      console.log('⚙️ Service Worker Info:', info);
      
      if (!registration) {
        console.log('⚠️ No service worker registered');
      }
      
      return info;
    } catch (error) {
      console.error('❌ Service Worker check error:', error);
      return {
        supported: true,
        registered: false,
        error: error.message
      };
    }
  },
  
  // Check VAPID key
  checkVapidKey() {
    const defaultKey = 'BGY0Eoylfn3ZeHntJRMbXYLlkJUzJyFTe0T7q2bkqE4la6a_GAhKroGstESMkrqsWZhSIYVmONRc86_rvcx9Kbc';
    
    const info = {
      isDefault: true, // We know this is the default key
      length: defaultKey.length,
      format: defaultKey.startsWith('B') ? 'Valid format' : 'Invalid format'
    };
    
    console.log('🔑 VAPID Key Info:', info);
    
    if (info.isDefault) {
      console.log('⚠️ Using default VAPID key - this may cause issues');
      console.log('💡 Generate your own VAPID key from Firebase Console');
    }
    
    return info;
  },
  
  // Check messaging object
  checkMessagingObject() {
    const info = {
      exists: !!messaging,
      type: typeof messaging,
      app: messaging?.app?.name || null
    };
    
    console.log('📱 Messaging Object Info:', info);
    
    if (!messaging) {
      console.log('❌ Messaging object not initialized');
    }
    
    return info;
  },
  
  // Generate recommendations
  generateRecommendations(diagnosis) {
    const recommendations = [];
    
    // Browser support
    if (!diagnosis.browser.isSupported) {
      recommendations.push({
        type: 'critical',
        message: `Browser ${diagnosis.browser.name} ${diagnosis.browser.version} is not supported. Upgrade to a newer version.`
      });
    }
    
    // Permission issues
    if (diagnosis.permissions.isDenied) {
      recommendations.push({
        type: 'critical',
        message: 'Notification permission denied. User must manually enable notifications in browser settings.'
      });
    }
    
    if (!diagnosis.permissions.isGranted) {
      recommendations.push({
        type: 'warning',
        message: 'Request notification permission before generating FCM token.'
      });
    }
    
    // Firebase support
    if (!diagnosis.firebaseSupport.isSupported) {
      recommendations.push({
        type: 'critical',
        message: 'Firebase Messaging not supported in this environment.'
      });
    }
    
    // Service worker
    if (!diagnosis.serviceWorker.supported) {
      recommendations.push({
        type: 'critical',
        message: 'Service Worker not supported. FCM requires Service Worker support.'
      });
    }
    
    if (!diagnosis.serviceWorker.registered) {
      recommendations.push({
        type: 'warning',
        message: 'Service Worker not registered. Register firebase-messaging-sw.js'
      });
    }
    
    // VAPID key
    if (diagnosis.vapidKey.isDefault) {
      recommendations.push({
        type: 'critical',
        message: 'Using default VAPID key. Generate your own key from Firebase Console > Project Settings > Cloud Messaging > Web Push certificates'
      });
    }
    
    // Messaging object
    if (!diagnosis.messaging.exists) {
      recommendations.push({
        type: 'critical',
        message: 'Firebase Messaging object not initialized. Check Firebase configuration.'
      });
    }
    
    return recommendations;
  },
  
  // Test token generation with detailed logging
  async testTokenGeneration() {
    console.log('🧪 Testing FCM Token Generation');
    console.log('='.repeat(50));
    
    try {
      // First run diagnosis
      const { diagnosis, recommendations } = await this.diagnoseEnvironment();
      
      // Check if we can proceed
      const criticalIssues = recommendations.filter(r => r.type === 'critical');
      if (criticalIssues.length > 0) {
        console.log('❌ Critical issues found. Cannot proceed with token generation:');
        criticalIssues.forEach(issue => console.log(`  - ${issue.message}`));
        return {
          success: false,
          error: 'Critical issues prevent token generation',
          issues: criticalIssues
        };
      }
      
      // Request permission if needed
      if (!diagnosis.permissions.isGranted) {
        console.log('🔐 Requesting notification permission...');
        const permission = await Notification.requestPermission();
        console.log('Permission result:', permission);
        
        if (permission !== 'granted') {
          return {
            success: false,
            error: 'Permission not granted',
            permission: permission
          };
        }
      }
      
      // Attempt token generation
      console.log('🎯 Attempting token generation...');
      const token = await getToken(messaging, {
        vapidKey: 'BGY0Eoylfn3ZeHntJRMbXYLlkJUzJyFTe0T7q2bkqE4la6a_GAhKroGstESMkrqsWZhSIYVmONRc86_rvcx9Kbc'
      });
      
      if (token) {
        console.log('✅ Token generated successfully!');
        console.log('Token preview:', `${token.substring(0, 30)}...`);
        return {
          success: true,
          token: token,
          tokenLength: token.length
        };
      } else {
        console.log('❌ Token generation returned null/undefined');
        return {
          success: false,
          error: 'Token generation returned null'
        };
      }
      
    } catch (error) {
      console.error('❌ Token generation failed:', error);
      return {
        success: false,
        error: error.message,
        details: error
      };
    }
  }
};

// Make it available globally for console testing
window.fcmDebugger = fcmDebugger;

export default fcmDebugger;