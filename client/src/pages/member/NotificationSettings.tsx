import React, { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { NotificationPreferences } from '@/components/NotificationPreferences';
import { NotificationHistory } from '@/components/NotificationHistory';
import { NotificationStats } from '@/components/NotificationStats';
import { Bell, History, BarChart3, Settings } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useLocation } from 'wouter';

export default function NotificationSettings() {
  const { member, isMemberAuthenticated, isLoading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!isLoading && !isMemberAuthenticated) {
      navigate("/member/login");
    }
  }, [isLoading, isMemberAuthenticated, navigate]);

  if (isLoading || !isMemberAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Notification Settings</h1>
          <p className="text-muted-foreground">
            Manage how and when you receive notifications from Gym Genie
          </p>
        </div>
        <div className="p-3 bg-primary/10 rounded-lg">
          <Bell className="h-6 w-6 text-primary" />
        </div>
      </div>

      <Tabs defaultValue="preferences" className="space-y-6">
        <TabsList className="grid grid-cols-3 lg:grid-cols-4">
          <TabsTrigger value="preferences" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Preferences</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            <span className="hidden sm:inline">History</span>
          </TabsTrigger>
          <TabsTrigger value="stats" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Statistics</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="preferences" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>
                Customize your notification experience by category, timing, and frequency
              </CardDescription>
            </CardHeader>
            <CardContent>
              <NotificationPreferences />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Tips</CardTitle>
              <CardDescription>
                Get the most out of your notification settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium">Workout Reminders</h4>
                  <p className="text-sm text-muted-foreground">
                    Enable to get reminders 30 minutes before your scheduled workouts
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium">Quiet Hours</h4>
                  <p className="text-sm text-muted-foreground">
                    Set quiet hours to avoid notifications during sleep or work hours
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium">Daily Digest</h4>
                  <p className="text-sm text-muted-foreground">
                    Get a single summary instead of multiple notifications throughout the day
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium">Browser Permissions</h4>
                  <p className="text-sm text-muted-foreground">
                    Make sure to allow notifications in your browser settings for the best experience
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Notification History</CardTitle>
              <CardDescription>
                View your recent notifications and their delivery status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <NotificationHistory />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stats">
          <Card>
            <CardHeader>
              <CardTitle>Notification Statistics</CardTitle>
              <CardDescription>
                Insights into your notification engagement and preferences
              </CardDescription>
            </CardHeader>
            <CardContent>
              <NotificationStats />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="text-lg">Need Help?</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Bell className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h4 className="font-medium">Not Receiving Notifications?</h4>
                <p className="text-sm text-muted-foreground">
                  Make sure you've granted notification permissions in your browser settings.
                  Check if notifications are enabled for this website.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Settings className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h4 className="font-medium">Too Many Notifications?</h4>
                <p className="text-sm text-muted-foreground">
                  Use the "Daily Digest" option to receive a single summary instead of individual notifications.
                  Adjust quiet hours to avoid notifications during specific times.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
