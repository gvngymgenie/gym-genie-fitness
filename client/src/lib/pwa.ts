// PWA utilities for Gym Genie
export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

class PWAInstall {
  private deferredPrompt: BeforeInstallPromptEvent | null = null;
  private installPromptShown = false;
  private serviceWorkerRegistration: ServiceWorkerRegistration | null = null;

  constructor() {
    this.init();
  }

  private init() {
    // Listen for the beforeinstallprompt event
    window.addEventListener('beforeinstallprompt', (e) => {
      console.log('PWA: Install prompt available');
      e.preventDefault();
      this.deferredPrompt = e;
      this.showInstallPrompt();
    });

    // Listen for successful installation
    window.addEventListener('appinstalled', () => {
      console.log('PWA: App installed successfully');
      this.deferredPrompt = null;
      this.installPromptShown = false;
    });

    // Register service worker
    this.registerServiceWorker();
  }

  private async registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        console.log('PWA: Checking for existing service workers...');
        const existingRegistrations = await navigator.serviceWorker.getRegistrations();
        console.log('PWA: Found', existingRegistrations.length, 'existing registrations');

        // Check if main service worker is already registered
        const mainSW = existingRegistrations.find(reg => reg.scope === location.origin + '/');
        if (mainSW) {
          console.log('PWA: Main service worker already registered:', mainSW.scope);
          this.serviceWorkerRegistration = mainSW;
        } else {
          // Register main service worker first
          console.log('PWA: Registering main service worker...');
          const registration = await navigator.serviceWorker.register('/sw.js', {
            scope: '/'
          });

          console.log('PWA: Main service worker registered successfully:', registration.scope);
          this.serviceWorkerRegistration = registration;

          // Handle updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // New version available
                  this.showUpdateNotification();
                }
              });
            }
          });

          // Check for updates periodically
          setInterval(() => {
            registration.update();
          }, 60 * 60 * 1000); // Check every hour
        }

        // Wait for the main service worker to be ready
        await navigator.serviceWorker.ready;
        console.log('PWA: Main service worker ready');

        // OneSignal handles its own service worker automatically
        console.log('PWA: OneSignal will manage its own service worker');

      } catch (error) {
        console.error('PWA: Service worker registration failed:', error);
        if (error instanceof Error) {
          console.error('PWA: Error details:', error.message);
        }
      }
    } else {
      console.warn('PWA: Service workers not supported');
    }
  }

  private showInstallPrompt() {
    // Auto-show install prompt after a delay (optional)
    // You can trigger this manually from your UI components
    console.log('PWA: Install prompt ready to show');
  }

  public async showInstallDialog(): Promise<boolean> {
    if (!this.deferredPrompt) {
      console.log('PWA: No install prompt available');
      return false;
    }

    if (this.installPromptShown) {
      console.log('PWA: Install prompt already shown');
      return false;
    }

    try {
      this.deferredPrompt.prompt();
      this.installPromptShown = true;

      const { outcome } = await this.deferredPrompt.userChoice;

      if (outcome === 'accepted') {
        console.log('PWA: User accepted install prompt');
        this.deferredPrompt = null;
        return true;
      } else {
        console.log('PWA: User dismissed install prompt');
        return false;
      }
    } catch (error) {
      console.error('PWA: Error showing install prompt:', error);
      return false;
    }
  }

  public isInstallable(): boolean {
    return this.deferredPrompt !== null && !this.installPromptShown;
  }

  private showUpdateNotification() {
    // Create a custom update notification
    const updateEvent = new CustomEvent('pwa-update-available', {
      detail: {
        message: 'A new version is available. Refresh to update.',
        action: () => window.location.reload()
      }
    });
    window.dispatchEvent(updateEvent);
  }

  public updateApp() {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
    }
  }

  public async getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | null> {
    if ('serviceWorker' in navigator) {
      try {
        // Wait for service worker to be ready
        const registration = await navigator.serviceWorker.ready;
        console.log('PWA: Service worker registration retrieved:', registration.scope);
        return registration;
      } catch (error) {
        console.error('PWA: Error getting service worker registration:', error);
        return null;
      }
    }
    console.warn('PWA: Service workers not supported');
    return null;
  }
}

// Create singleton instance
export const pwaInstall = new PWAInstall();

// Utility functions
export const isPWAInstalled = (): boolean => {
  return window.matchMedia('(display-mode: standalone)').matches ||
         (window.navigator as any).standalone === true;
};

export const isIOS = (): boolean => {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
};

export const isAndroid = (): boolean => {
  return /Android/.test(navigator.userAgent);
};

export const isMobile = (): boolean => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

export const getPWADisplayMode = (): string => {
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
  const isFullscreen = window.matchMedia('(display-mode: fullscreen)').matches;
  const isMinimalUI = window.matchMedia('(display-mode: minimal-ui)').matches;

  if (isStandalone) return 'standalone';
  if (isFullscreen) return 'fullscreen';
  if (isMinimalUI) return 'minimal-ui';
  return 'browser';
};

// Offline detection
export const isOnline = (): boolean => {
  return navigator.onLine;
};

export const addOnlineOfflineListeners = (
  onOnline: () => void,
  onOffline: () => void
) => {
  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOffline);

  // Return cleanup function
  return () => {
    window.removeEventListener('online', onOnline);
    window.removeEventListener('offline', onOffline);
  };
};

// Cache management
export const clearCache = async (): Promise<void> => {
  if ('caches' in window) {
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames.map(cacheName => caches.delete(cacheName))
    );
    console.log('PWA: Cache cleared');
  }
};

// Background sync registration
export const registerBackgroundSync = async (tag: string): Promise<boolean> => {
  if ('serviceWorker' in navigator && 'sync' in (navigator.serviceWorker as any)) {
    try {
      const registration = await navigator.serviceWorker.ready;
      await (registration as any).sync.register(tag);
      console.log('PWA: Background sync registered:', tag);
      return true;
    } catch (error) {
      console.error('PWA: Background sync registration failed:', error);
      return false;
    }
  }
  return false;
};

// Push notification permission (uses OneSignal)
export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
  if (!('Notification' in window)) {
    throw new Error('Notifications not supported');
  }

  if (Notification.permission === 'default') {
    const permission = await Notification.requestPermission();
    return permission;
  }

  return Notification.permission;
};

// Send push notification (for testing)
export const sendTestNotification = async (title: string, body: string): Promise<void> => {
  if (Notification.permission === 'granted') {
    new Notification(title, {
      body,
      icon: '/icon-192.svg',
      badge: '/icon-192.svg'
    });
  } else {
    console.warn('PWA: Notification permission not granted');
  }
};

// Push Notification Subscription Management (OneSignal)
export class PushNotificationManager {
  private externalUserId: string | null = null;

  constructor() {
    this.init();
  }

  private async init() {
    try {
      // Set up OneSignal notification click listener
      const { onOneSignalNotification } = await import('./onesignal');
      
      onOneSignalNotification((event) => {
        console.log('PWA: OneSignal notification clicked:', event);
        // Handle notification click - navigate to URL if provided
        if (event?.data?.url) {
          window.location.href = event.data.url;
        }
      });

      console.log('PWA: Push notification manager initialized with OneSignal');

    } catch (error) {
      console.warn('PWA: Failed to initialize OneSignal notifications:', error);
    }
  }

  // Request notification permission via OneSignal
  async requestPermission(): Promise<NotificationPermission> {
    try {
      const { requestOneSignalPermission } = await import('./onesignal');
      return await requestOneSignalPermission();
    } catch (error) {
      console.error('PWA: Failed to request notification permission:', error);
      return 'denied';
    }
  }

  // Subscribe to push notifications (set external user ID)
  async subscribe(userId?: string, memberId?: string): Promise<string | null> {
    try {
      console.log('PushManager: Starting OneSignal subscription process...');

      // Determine which ID to use (prefer memberId for gym members, userId for staff)
      const externalId = memberId || userId;
      
      if (!externalId) {
        console.error('PushManager: No user ID or member ID provided');
        return null;
      }

      // Request permission first
      console.log('PushManager: Requesting notification permission...');
      const permission = await this.requestPermission();
      
      if (permission !== 'granted') {
        console.error('PushManager: Notification permission denied');
        return null;
      }

      // Set external user ID to associate this device with the gym member/user
      console.log('PushManager: Setting external user ID:', externalId);
      const { setOneSignalExternalUserId, waitForOneSignalPlayerId } = await import('./onesignal');
      await setOneSignalExternalUserId(externalId);

      // Wait for the OneSignal player ID (v16 API: ID is assigned asynchronously)
      console.log('PushManager: Waiting for OneSignal player ID...');
      const playerId = await waitForOneSignalPlayerId(15000); // 15 second timeout
      
      if (!playerId) {
        console.error('PushManager: Failed to get OneSignal player ID after waiting');
        return null;
      }
      console.log('PushManager: Got OneSignal player ID:', playerId.substring(0, 20) + '...');

      // Send player ID to server for storage
      console.log('PushManager: Sending OneSignal player ID to server...');
      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          playerId,
          externalId,
          userAgent: navigator.userAgent,
          userId,
          memberId,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('PushManager: Server response error:', response.status, errorText);
        throw new Error(`Failed to save OneSignal subscription: ${response.status} ${errorText}`);
      }

      const responseData = await response.json();
      console.log('PushManager: Successfully subscribed to OneSignal push notifications:', responseData);
      
      this.externalUserId = externalId;
      return playerId;
    } catch (error) {
      console.error('PushManager: Failed to subscribe to OneSignal push notifications:', error);
      return null;
    }
  }

  // Get current external user ID
  async getExternalId(): Promise<string | null> {
    return this.externalUserId;
  }

  // Unsubscribe from push notifications
  async unsubscribe(): Promise<boolean> {
    try {
      const { removeOneSignalExternalUserId } = await import('./onesignal');
      await removeOneSignalExternalUserId();
      this.externalUserId = null;
      console.log('PWA: Unsubscribed from OneSignal push notifications');
      return true;
    } catch (error) {
      console.error('PWA: Failed to unsubscribe:', error);
      return false;
    }
  }

  // Check if user is subscribed
  async isSubscribed(): Promise<boolean> {
    try {
      const { isOneSignalSubscribed } = await import('./onesignal');
      return await isOneSignalSubscribed();
    } catch (error) {
      console.error('PWA: Failed to check subscription status:', error);
      return false;
    }
  }

  // Send test notification
  async sendTestNotification(userId?: string, memberId?: string): Promise<boolean> {
    try {
      const response = await fetch('/api/push/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          memberId,
          title: 'Test Notification',
          body: 'This is a test OneSignal push notification!',
        }),
      });

      return response.ok;
    } catch (error) {
      console.error('PWA: Failed to send test notification:', error);
      return false;
    }
  }

  // Set user tag for segmentation
  async setTag(key: string, value: string): Promise<void> {
    try {
      const { setOneSignalTag } = await import('./onesignal');
      await setOneSignalTag(key, value);
    } catch (error) {
      console.error('PWA: Failed to set tag:', error);
    }
  }
}

// Create singleton instance
export const pushManager = new PushNotificationManager();
