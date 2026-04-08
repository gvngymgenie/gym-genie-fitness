import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from './auth';
import { useToast } from '@/hooks/use-toast';

interface WebSocketMessage {
  type: 'auth_success' | 'notification' | 'error';
  data?: any;
}

export function useWebSocket() {
  const { user, member, isAuthenticated, isMemberAuthenticated } = useAuth();
  const { toast } = useToast();
  const [isConnected, setIsConnected] = useState(false);
  const [lastNotification, setLastNotification] = useState<any>(null);
  const [isVercelDeployment, setIsVercelDeployment] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  // Check if running on Vercel (where WebSocket isn't supported)
  useEffect(() => {
    const hostname = window.location.hostname;
    const isVercel = hostname.includes('vercel.app') ||
                    hostname.includes('vercel-preview') ||
                    process.env.NODE_ENV === 'production' && hostname !== 'localhost';
    setIsVercelDeployment(isVercel);

    if (isVercel) {
      console.log('WebSocket: Running on Vercel - WebSocket connections not supported, using push notifications only');
      setIsConnected(false);
    }
  }, []);

  const connect = useCallback(() => {
    // Skip WebSocket connection on Vercel deployments
    if (isVercelDeployment) {
      console.log('WebSocket: Skipping connection - not supported on Vercel');
      return;
    }
    if (!isAuthenticated && !isMemberAuthenticated) {
      console.log('WebSocket: Not connecting - user not authenticated');
      return;
    }

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      console.log('WebSocket: Already connected');
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/member/notifications`;

    console.log('WebSocket: Connecting to', wsUrl);
    wsRef.current = new WebSocket(wsUrl);

    wsRef.current.onopen = () => {
      console.log('WebSocket: Connected');
      setIsConnected(true);
      reconnectAttempts.current = 0;

      // Authenticate the WebSocket connection
      const authMessage = user
        ? { type: 'auth', userId: user.id }
        : { type: 'auth', memberId: member?.id };

      wsRef.current?.send(JSON.stringify(authMessage));
    };

    wsRef.current.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);

        switch (message.type) {
          case 'auth_success':
            console.log('WebSocket: Authentication successful');
            break;

          case 'notification':
            console.log('WebSocket: New notification received', message.data);
            setLastNotification(message.data);

            // Show toast notification for real-time updates
            toast({
              title: 'New Notification',
              description: message.data?.message || 'You have a new notification',
              duration: 5000,
            });

            // Also show browser notification if permission is granted
            if (Notification.permission === 'granted') {
              new Notification('Gym Genie', {
                body: message.data?.message || 'You have a new notification',
                icon: '/icon-192.svg',
                badge: '/icon-192.svg',
                tag: 'gym-genie-notification',
                requireInteraction: false,
              });
            }
            break;

          case 'error':
            console.error('WebSocket: Error message received', message.data);
            break;

          default:
            console.log('WebSocket: Unknown message type', message.type);
        }
      } catch (error) {
        console.error('WebSocket: Error parsing message', error);
      }
    };

    wsRef.current.onclose = (event) => {
      console.log('WebSocket: Disconnected', event.code, event.reason);
      setIsConnected(false);

      // Attempt to reconnect if not a deliberate close
      if (event.code !== 1000 && reconnectAttempts.current < maxReconnectAttempts) {
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
        console.log(`WebSocket: Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current + 1}/${maxReconnectAttempts})`);

        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectAttempts.current++;
          connect();
        }, delay);
      }
    };

    wsRef.current.onerror = (error) => {
      console.error('WebSocket: Error', error);
    };
  }, [isAuthenticated, isMemberAuthenticated, user, member, toast, isVercelDeployment]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      console.log('WebSocket: Disconnecting');
      wsRef.current.close(1000, 'Client disconnect');
      wsRef.current = null;
    }

    setIsConnected(false);
    reconnectAttempts.current = 0;
  }, []);

  // Connect when component mounts and user is authenticated
  useEffect(() => {
    if (isAuthenticated || isMemberAuthenticated) {
      connect();
    } else {
      disconnect();
    }

    // Cleanup on unmount
    return () => {
      disconnect();
    };
  }, [isAuthenticated, isMemberAuthenticated, connect, disconnect]);

  // Handle page visibility changes for reconnection
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && (isAuthenticated || isMemberAuthenticated)) {
        // Reconnect when page becomes visible
        if (!isConnected) {
          console.log('WebSocket: Page became visible, reconnecting...');
          connect();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isAuthenticated, isMemberAuthenticated, isConnected, connect]);

  return {
    isConnected,
    lastNotification,
    connect,
    disconnect,
  };
}
