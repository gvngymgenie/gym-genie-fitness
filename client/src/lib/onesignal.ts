// OneSignal Push Notifications for Gym Genie
// Replaces Firebase FCM implementation
// Updated for OneSignal SDK v16 API

// OneSignal SDK v16 type declarations
declare global {
  interface Window {
    OneSignalDeferred: any[];
    OneSignal?: {
      init: (options: OneSignalInitOptions) => Promise<void>;
      login: (externalUserId: string) => Promise<void>;
      logout: () => Promise<void>;
      User: {
        PushSubscription: {
          id: string | null;
          optedIn: boolean;
        };
        addEventListener: (event: string, callback: (event: any) => void) => void;
        removeEventListener: (event: string, callback: (event: any) => void) => void;
      };
      Notifications: {
        permission: boolean;
        permissionNative: NotificationPermission;
        addEventListener: (event: string, callback: (event: any) => void) => void;
        removeEventListener: (event: string, callback: (event: any) => void) => void;
      };
      sendTag: (key: string, value: string) => Promise<void>;
      deleteTag: (key: string) => Promise<void>;
      getTags: () => Promise<Record<string, any>>;
      getNotifications: () => Promise<any[]>;
      clearNotifications: () => Promise<void>;
    };
  }
}

interface OneSignalInitOptions {
  appId: string;
  serviceWorkerParam?: { scope: string };
  serviceWorkerPath?: string;
  allowLocalhostAsSecureOrigin?: boolean;
  subdomainName?: string;
}

class OneSignalManager {
  private initialized = false;
  private externalUserId: string | null = null;
  private oneSignalInstance: any = null;

  constructor() {
    this.init();
  }

  private init() {
    // Wait for OneSignal SDK to be ready
    if (window.OneSignalDeferred) {
      window.OneSignalDeferred.push(async (OneSignal: any) => {
        try {
          this.oneSignalInstance = OneSignal;
          
          console.log('OneSignal: Starting initialization...');
          console.log('OneSignal: App ID:', "c21fad7c-6ead-4ceb-9bfa-4c885e7c28a8");
          console.log('OneSignal: Current origin:', window.location.origin);
          console.log('OneSignal: Native notification permission:', Notification.permission);
          
          // Check service worker status
          if ('serviceWorker' in navigator) {
            const registrations = await navigator.serviceWorker.getRegistrations();
            console.log('OneSignal: Service worker registrations:', registrations.length);
            registrations.forEach((reg, i) => {
              console.log(`OneSignal: SW[${i}] scope:`, reg.scope, 'active:', !!reg.active);
            });
          }
          
          await OneSignal.init({
            appId: "c21fad7c-6ead-4ceb-9bfa-4c885e7c28a8",
            serviceWorkerParam: {
              scope: "/",
            },
            serviceWorkerPath: "/OneSignalSDKWorker.js",
            allowLocalhostAsSecureOrigin: true,
          });
          
          this.initialized = true;
          console.log('OneSignal: SDK initialized successfully');
          
          // DEBUG: Log initial state after init
          console.log('OneSignal: Post-init state:', {
            'User.PushSubscription.id': OneSignal.User?.PushSubscription?.id,
            'User.PushSubscription.optedIn': OneSignal.User?.PushSubscription?.optedIn,
            'Notifications.permission': OneSignal.Notifications?.permission,
            'Notifications.permissionNative': OneSignal.Notifications?.permissionNative,
          });
          
          // Set up notification click handler
          OneSignal.Notifications.addEventListener('click', (event: any) => {
            console.log('OneSignal: Notification clicked:', event);
            if (event.data?.url) {
              window.location.href = event.data.url;
            }
          });
          
        } catch (error) {
          console.error('OneSignal: Failed to initialize:', error);
        }
      });
    } else {
      console.error('OneSignal: OneSignalDeferred not found - SDK not loaded properly');
    }
  }

  // Check if notifications are supported
  isSupported(): boolean {
    return 'Notification' in window && 'serviceWorker' in navigator;
  }

  // Get current notification permission
  async getPermission(): Promise<NotificationPermission> {
    if (this.oneSignalInstance) {
      const permission = this.oneSignalInstance.Notifications.permissionNative;
      return permission || Notification.permission;
    }
    return Notification.permission;
  }

  // Request notification permission
  async requestPermission(): Promise<NotificationPermission> {
    try {
      const permission = await Notification.requestPermission();
      console.log('OneSignal: Notification permission:', permission);
      return permission;
    } catch (error) {
      console.error('OneSignal: Error requesting permission:', error);
      return 'denied';
    }
  }

  // Set external user ID (maps OneSignal player to your app user)
  // v16 API: Use login() instead of setExternalUserId()
  async setExternalUserId(userId: string): Promise<void> {
    if (!this.oneSignalInstance) {
      console.warn('OneSignal: SDK not ready - cannot set external user ID');
      return;
    }
    
    try {
      // DEBUG: Log state before login
      console.log('OneSignal: Before login() - state:', {
        'User.PushSubscription.id': this.oneSignalInstance.User?.PushSubscription?.id,
        'User.PushSubscription.optedIn': this.oneSignalInstance.User?.PushSubscription?.optedIn,
        'Notifications.permission': this.oneSignalInstance.Notifications?.permission,
        'Notifications.permissionNative': this.oneSignalInstance.Notifications?.permissionNative,
        'Native Notification.permission': Notification.permission,
      });
      
      await this.oneSignalInstance.login(userId);
      this.externalUserId = userId;
      console.log('OneSignal: External user ID set:', userId);
      
      // DEBUG: Log state after login
      console.log('OneSignal: After login() - state:', {
        'User.PushSubscription.id': this.oneSignalInstance.User?.PushSubscription?.id,
        'User.PushSubscription.optedIn': this.oneSignalInstance.User?.PushSubscription?.optedIn,
      });
      
      // CRITICAL: In v16, login() only sets external ID - it does NOT subscribe to push
      // The user must be subscribed to push for a player ID to be created
      if (!this.oneSignalInstance.User?.PushSubscription?.optedIn) {
        console.warn('OneSignal: User is NOT opted in to push after login()');
        console.warn('OneSignal: Push subscription requires explicit opt-in in v16 API');
      }
    } catch (error) {
      console.error('OneSignal: Error setting external user ID:', error);
    }
  }

  // Remove external user ID (logout)
  // v16 API: Use logout() instead of removeExternalUserId()
  async removeExternalUserId(): Promise<void> {
    if (!this.oneSignalInstance) return;
    
    try {
      await this.oneSignalInstance.logout();
      this.externalUserId = null;
      console.log('OneSignal: External user ID removed');
    } catch (error) {
      console.error('OneSignal: Error removing external user ID:', error);
    }
  }

  // Get player ID (unique OneSignal identifier for this device)
  // v16 API: Use User.PushSubscription.id instead of getDeviceState().userId
  async getPlayerId(): Promise<string | null> {
    if (!this.oneSignalInstance) {
      console.warn('OneSignal: SDK not ready');
      return null;
    }
    return this.oneSignalInstance.User.PushSubscription.id;
  }

  // Wait for player ID to be available (v16 API: ID is assigned asynchronously)
  // This is needed because User.PushSubscription.id is not immediately available after login()
  async waitForPlayerId(timeout = 15000): Promise<string | null> {
    if (!this.oneSignalInstance) {
      console.warn('OneSignal: SDK not ready - cannot wait for player ID');
      return null;
    }

    // DEBUG: Log current subscription state
    console.log('OneSignal: waitForPlayerId() - current state:', {
      'User.PushSubscription.id': this.oneSignalInstance.User?.PushSubscription?.id,
      'User.PushSubscription.optedIn': this.oneSignalInstance.User?.PushSubscription?.optedIn,
      'Notifications.permission': this.oneSignalInstance.Notifications?.permission,
      'Notifications.permissionNative': this.oneSignalInstance.Notifications?.permissionNative,
    });

    // Check if already available
    const existingId = this.oneSignalInstance.User.PushSubscription.id;
    if (existingId) {
      console.log('OneSignal: Player ID already available:', existingId.substring(0, 20) + '...');
      return existingId;
    }

    // CRITICAL CHECK: If user is not opted in, player ID will never be created
    if (!this.oneSignalInstance.User?.PushSubscription?.optedIn) {
      console.error('OneSignal: User is NOT opted in to push notifications');
      console.error('OneSignal: Player ID cannot be created without push subscription');
      console.error('OneSignal: You must use OneSignal.Slidedown.promptPush() or similar to subscribe');
      return null;
    }

    console.log('OneSignal: Waiting for player ID to be assigned...');
    
    // Wait for the change event
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        console.warn('OneSignal: Timeout waiting for player ID after', timeout, 'ms');
        // DEBUG: Log final state
        console.log('OneSignal: Final state on timeout:', {
          'User.PushSubscription.id': this.oneSignalInstance?.User?.PushSubscription?.id,
          'User.PushSubscription.optedIn': this.oneSignalInstance?.User?.PushSubscription?.optedIn,
        });
        // Try to get the ID one more time
        const finalId = this.oneSignalInstance?.User?.PushSubscription?.id;
        if (finalId) {
          console.log('OneSignal: Player ID available on timeout check:', finalId.substring(0, 20) + '...');
          resolve(finalId);
        } else {
          resolve(null);
        }
      }, timeout);

      try {
        // v16 API: Listen for PushSubscription change event
        this.oneSignalInstance.User.PushSubscription.addEventListener('change', (event: any) => {
          console.log('OneSignal: PushSubscription change event:', {
            id: event?.current?.id ? event.current.id.substring(0, 20) + '...' : null,
            optedIn: event?.current?.optedIn
          });
          
          if (event?.current?.id) {
            clearTimeout(timer);
            console.log('OneSignal: Player ID received via change event:', event.current.id.substring(0, 20) + '...');
            resolve(event.current.id);
          }
        });
      } catch (error) {
        console.error('OneSignal: Error setting up change listener:', error);
        clearTimeout(timer);
        resolve(null);
      }
    });
  }

  // Check if user is subscribed
  // v16 API: Use User.PushSubscription.optedIn instead of getDeviceState().isPushNotificationsEnabled()
  async isSubscribed(): Promise<boolean> {
    if (!this.oneSignalInstance) return false;
    return this.oneSignalInstance.User.PushSubscription.optedIn === true;
  }

  // Add event listener for notifications
  addNotificationListener(callback: (event: any) => void): void {
    if (!this.oneSignalInstance) {
      console.warn('OneSignal: SDK not ready for notification listener');
      return;
    }
    
    this.oneSignalInstance.Notifications.addEventListener('click', callback);
  }

  // Listen for permission changes
  onPermissionChange(callback: (permission: string) => void): void {
    if (!this.oneSignalInstance) return;
    
    this.oneSignalInstance.Notifications.addEventListener('permissionChange', (permission: any) => {
      console.log('OneSignal: Permission changed:', permission.to);
      callback(permission.to);
    });
  }

  // Listen for subscription changes
  onSubscriptionChange(callback: (subscribed: boolean) => void): void {
    if (!this.oneSignalInstance) return;
    
    this.oneSignalInstance.User.addEventListener('changeSubscription', (event: any) => {
      console.log('OneSignal: Subscription changed:', event);
      callback(event.to?.enabled === true);
    });
  }

  // Set tag for this user (for segmentation)
  async setTag(key: string, value: string): Promise<void> {
    if (!this.oneSignalInstance) return;
    
    try {
      await this.oneSignalInstance.sendTag(key, value);
    } catch (error) {
      console.error('OneSignal: Error setting tag:', error);
    }
  }

  // Delete a tag
  async deleteTag(key: string): Promise<void> {
    if (!this.oneSignalInstance) return;
    
    try {
      await this.oneSignalInstance.deleteTag(key);
    } catch (error) {
      console.error('OneSignal: Error deleting tag:', error);
    }
  }

  // Get tags for this user
  async getTags(): Promise<Record<string, any>> {
    if (!this.oneSignalInstance) return {};
    
    try {
      return await this.oneSignalInstance.getTags();
    } catch (error) {
      console.error('OneSignal: Error getting tags:', error);
      return {};
    }
  }

  // Clear all notifications
  async clearNotifications(): Promise<void> {
    if (!this.oneSignalInstance) return;
    
    try {
      await this.oneSignalInstance.clearNotifications();
    } catch (error) {
      console.error('OneSignal: Error clearing notifications:', error);
    }
  }
}

// Create singleton instance
export const oneSignalManager = new OneSignalManager();

// Export helper functions
export const isOneSignalSupported = () => oneSignalManager.isSupported();
export const getOneSignalPermission = () => oneSignalManager.getPermission();
export const requestOneSignalPermission = () => oneSignalManager.requestPermission();
export const setOneSignalExternalUserId = (userId: string) => oneSignalManager.setExternalUserId(userId);
export const removeOneSignalExternalUserId = () => oneSignalManager.removeExternalUserId();
export const getOneSignalPlayerId = () => oneSignalManager.getPlayerId();
export const waitForOneSignalPlayerId = (timeout?: number) => oneSignalManager.waitForPlayerId(timeout);
export const isOneSignalSubscribed = () => oneSignalManager.isSubscribed();
export const onOneSignalNotification = (callback: (event: any) => void) => 
  oneSignalManager.addNotificationListener(callback);
export const setOneSignalTag = (key: string, value: string) => oneSignalManager.setTag(key, value);
export const clearOneSignalNotifications = () => oneSignalManager.clearNotifications?.();

export default oneSignalManager;
