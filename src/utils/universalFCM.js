import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { messaging } from '../firebase/config';

/**
 * Universal FCM Token Manager
 * Automatically generates FCM tokens for all users on login
 */
export class UniversalFCMManager {
  constructor() {
    this.auth = getAuth();
    this.db = getFirestore();
    this.isInitialized = false;
  }

  /**
   * Initialize FCM manager and setup automatic token generation
   */
  async initialize() {
    if (this.isInitialized) return;

    try {
      // Listen for auth state changes
      onAuthStateChanged(this.auth, async (user) => {
        if (user) {
          console.log('User logged in:', user.uid);
          await this.generateTokenForUser(user.uid, user.email);
        } else {
          console.log('User logged out');
        }
      });

      this.isInitialized = true;
      console.log('Universal FCM Manager initialized');
    } catch (error) {
      console.error('Error initializing FCM Manager:', error);
    }
  }

  /**
   * Generate FCM token for user
   */
  async generateTokenForUser(userId, email) {
    try {
      console.log('Generating FCM token for user:', userId);

      // Check if token already exists
      const existingToken = await this.getExistingToken(userId);
      if (existingToken) {
        console.log('FCM token already exists for user');
        return existingToken;
      }

      // Request notification permission
      const permission = await Notification.requestPermission();
      console.log('Notification permission:', permission);

      if (permission !== 'granted') {
        console.log('Notification permission denied');
        return null;
      }

      // Generate FCM token
      const token = await getToken(messaging, {
        vapidKey: 'BGY0Eoylfn3ZeHntJRMbXYLlkJUzJyFTe0T7q2bkqE4la6a_GAhKroGstESMkrqsWZhSIYVmONRc86_rvcx9Kbc'
      });

      if (token) {
        console.log('FCM token generated:', token);
        await this.saveTokenToDatabase(userId, email, token);
        return token;
      } else {
        console.log('No FCM token available');
        return null;
      }

    } catch (error) {
      console.error('Error generating FCM token:', error);
      return null;
    }
  }

  /**
   * Get existing token from database
   */
  async getExistingToken(userId) {
    try {
      const userDoc = await getDoc(doc(this.db, 'users', userId));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        return userData.fcmToken || null;
      }
      return null;
    } catch (error) {
      console.error('Error getting existing token:', error);
      return null;
    }
  }

  /**
   * Save token to database
   */
  async saveTokenToDatabase(userId, email, token) {
    try {
      const userData = {
        fcmToken: token,
        fcmTokenGeneratedAt: new Date(),
        fcmTokenUpdatedAt: new Date(),
        notificationPermission: 'granted',
        lastLoginAt: new Date()
      };

      // If email is provided, save it too
      if (email) {
        userData.email = email;
      }

      // Save to users collection
      await setDoc(doc(this.db, 'users', userId), userData, { merge: true });

      // Also save to user_tokens collection for tracking
      await setDoc(doc(this.db, 'user_tokens', userId), {
        userId: userId,
        tokens: [{
          token: token,
          platform: this.detectPlatform(),
          createdAt: new Date(),
          lastUsedAt: new Date(),
          active: true
        }],
        totalTokens: 1
      }, { merge: true });

      console.log('FCM token saved to database for user:', userId);
    } catch (error) {
      console.error('Error saving token to database:', error);
    }
  }

  /**
   * Detect current platform
   */
  detectPlatform() {
    const userAgent = navigator.userAgent.toLowerCase();
    if (userAgent.includes('android')) return 'android';
    if (userAgent.includes('iphone') || userAgent.includes('ipad')) return 'ios';
    if (userAgent.includes('windows')) return 'windows';
    if (userAgent.includes('mac')) return 'macos';
    return 'web';
  }

  /**
   * Setup foreground message listener
   */
  setupMessageListener() {
    onMessage(messaging, (payload) => {
      console.log('Message received in foreground:', payload);
      
      if (payload.notification) {
        const { title, body, icon } = payload.notification;
        
        if (Notification.permission === 'granted') {
          new Notification(title || 'Sadhana Cart', {
            body: body || 'You have a new notification',
            icon: icon || '/sadhanacutlogo.jpeg',
            tag: 'sadhana-cart-notification'
          });
        }
      }
    });
  }

  /**
   * Get current FCM token
   */
  async getCurrentToken() {
    try {
      const token = await getToken(messaging, {
        vapidKey: 'BGY0Eoylfn3ZeHntJRMbXYLlkJUzJyFTe0T7q2bkqE4la6a_GAhKroGstESMkrqsWZhSIYVmONRc86_rvcx9Kbc'
      });
      return token;
    } catch (error) {
      console.error('Error getting current token:', error);
      return null;
    }
  }

  /**
   * Force regenerate token
   */
  async regenerateToken(userId, email) {
    try {
      console.log('Force regenerating token for user:', userId);
      
      // Delete existing token
      const messaging = getMessaging();
      await messaging.deleteToken();
      
      // Generate new token
      return await this.generateTokenForUser(userId, email);
    } catch (error) {
      console.error('Error regenerating token:', error);
      return null;
    }
  }
}

// Create singleton instance
export const universalFCMManager = new UniversalFCMManager();

/**
 * Quick setup function for any application
 */
export const setupUniversalFCM = async () => {
  await universalFCMManager.initialize();
  universalFCMManager.setupMessageListener();
  console.log('🔔 Universal FCM setup complete');
};

/**
 * Manual token generation for specific user
 */
export const generateTokenForUser = async (userId, email) => {
  return await universalFCMManager.generateTokenForUser(userId, email);
};