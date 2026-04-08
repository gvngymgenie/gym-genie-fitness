import { useState, useEffect } from 'react';
import { Bell, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { requestNotificationPermission } from '@/lib/pwa';

export function NotificationPermissionPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Check if we should show the prompt
    const checkNotificationStatus = () => {
      // Don't show if already granted or denied
      if (Notification.permission === 'granted' || Notification.permission === 'denied') {
        return;
      }

      // Don't show if not supported
      if (!('Notification' in window)) {
        return;
      }

      // Show prompt after a delay
      setTimeout(() => {
        setShowPrompt(true);
      }, 3000); // Show after 3 seconds
    };

    checkNotificationStatus();
  }, []);

  const handleEnableNotifications = async () => {
    setIsLoading(true);
    try {
      const permission = await requestNotificationPermission();

      if (permission === 'granted') {
        toast({
          title: 'Notifications enabled!',
          description: 'You will now receive push notifications from Gym Genie.',
        });
        setShowPrompt(false);
      } else {
        toast({
          title: 'Permission denied',
          description: 'You can enable notifications later in your browser settings.',
          variant: 'destructive',
        });
        setShowPrompt(false);
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      toast({
        title: 'Error',
        description: 'Failed to enable notifications. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
  };

  if (!showPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
      <Card className="bg-background border shadow-lg">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <Bell className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-sm mb-1">
                Enable Notifications
              </h3>
              <p className="text-xs text-muted-foreground mb-3">
                Stay updated with workout reminders, important announcements, and member updates.
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleEnableNotifications}
                  disabled={isLoading}
                  className="h-8 px-3 text-xs"
                >
                  {isLoading ? 'Enabling...' : 'Enable'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleDismiss}
                  className="h-8 px-3 text-xs"
                >
                  <X className="h-3 w-3 mr-1" />
                  Later
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
