import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { pushManager } from '@/lib/pwa';
import { useToast } from '@/hooks/use-toast';

export function NotificationInitializer() {
  const { user, member, isAuthenticated, isMemberAuthenticated } = useAuth();
  const { toast } = useToast();
  
  // Use refs to prevent re-renders from state changes
  const initializedRef = useRef(false);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Memoize the initialization function to prevent re-renders
  const initializeNotifications = useCallback(async () => {
    try {
      console.log('NotificationInitializer: Checking notification support...');

      // Check if notifications are supported
      if (!('Notification' in window)) {
        console.error('NotificationInitializer: Notifications not supported in this browser');
        return;
      }

      if (!('serviceWorker' in navigator)) {
        console.error('NotificationInitializer: Service workers not supported in this browser');
        return;
      }

      // Check current permission status
      console.log('NotificationInitializer: Current notification permission:', Notification.permission);

      // Request notification permission and subscribe to OneSignal
      console.log('NotificationInitializer: Calling pushManager.subscribe...');
      const playerId = await pushManager.subscribe(
        user?.id,
        member?.id
      );

      if (playerId) {
        console.log('NotificationInitializer: Successfully registered for push notifications, playerId:', playerId.substring(0, 20) + '...');
      } else {
        console.error('NotificationInitializer: Failed to register for push notifications - no playerId returned');
      }
    } catch (error) {
      console.error('NotificationInitializer: Error initializing notifications:', error);
      toast({
        title: 'Notification Setup Failed',
        description: 'Unable to set up push notifications. Please check your browser settings.',
        variant: 'destructive',
      });
    }
  }, [user?.id, member?.id, toast]);

  useEffect(() => {
    // Prevent multiple initializations
    if (initializedRef.current) {
      console.log('NotificationInitializer: Already initialized, skipping');
      return;
    }

    // Only initialize notifications if user is authenticated
    if (!isAuthenticated && !isMemberAuthenticated) {
      console.log('NotificationInitializer: User not authenticated, skipping initialization');
      return;
    }

    // Mark as initialized to prevent re-renders
    initializedRef.current = true;

    console.log('NotificationInitializer: Starting notification initialization for user/member:', {
      userId: user?.id,
      memberId: member?.id,
      isAuthenticated,
      isMemberAuthenticated
    });

    // Small delay to ensure service worker is ready
    const timer = setTimeout(initializeNotifications, 1000);

    return () => {
      clearTimeout(timer);
      // Cleanup is handled by pushManager
    };
  }, [isAuthenticated, isMemberAuthenticated, initializeNotifications]);

  // This component doesn't render anything visible
  return null;
}
