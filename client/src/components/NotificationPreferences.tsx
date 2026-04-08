import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth';
import { Bell, Moon, Sun, Calendar, Zap, Shield, Megaphone, Tag } from 'lucide-react';

interface NotificationPreferencesData {
  categoryWorkouts: boolean;
  categoryDiet: boolean;
  categoryOtp: boolean;
  categoryAnnouncements: boolean;
  categoryPromotions: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  frequencyDigest: boolean;
}

export function NotificationPreferences() {
  const { user, member, isAuthenticated, isMemberAuthenticated } = useAuth();
  const { toast } = useToast();
  
  console.log('NotificationPreferences - member:', member);
  console.log('NotificationPreferences - member?.id:', member?.id);
  console.log('NotificationPreferences - isMemberAuthenticated:', isMemberAuthenticated);
  
  const [preferences, setPreferences] = useState<NotificationPreferencesData>({
    categoryWorkouts: true,
    categoryDiet: true,
    categoryOtp: true,
    categoryAnnouncements: true,
    categoryPromotions: false,
    quietHoursStart: '21:00',
    quietHoursEnd: '07:00',
    frequencyDigest: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isAuthenticated || isMemberAuthenticated) {
      fetchPreferences();
    }
  }, [isAuthenticated, isMemberAuthenticated]);

  const fetchPreferences = async () => {
    try {
      setLoading(true);
      const url = member?.id 
        ? `/api/notifications/preferences?memberId=${member.id}`
        : '/api/notifications/preferences';
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setPreferences(data);
      }
    } catch (error) {
      console.error('Error fetching notification preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async () => {
    // Check if member is authenticated
    if (!member?.id) {
      toast({
        title: 'Not Logged In',
        description: 'Please log in to save notification preferences.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSaving(true);
      console.log('Saving preferences for member:', member?.id);
      console.log('Preferences data:', { memberId: member?.id, ...preferences });
      
      const response = await fetch('/api/notifications/preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          memberId: member?.id,
          ...preferences,
        }),
      });

      console.log('Response status:', response.status);
      const responseData = await response.json();
      console.log('Response data:', responseData);

      if (response.ok) {
        toast({
          title: 'Preferences Saved',
          description: 'Your notification preferences have been updated.',
        });
      } else {
        throw new Error(responseData.error || 'Failed to save preferences');
      }
    } catch (error) {
      console.error('Error saving notification preferences:', error);
      toast({
        title: 'Save Failed',
        description: error instanceof Error ? error.message : 'Failed to save notification preferences. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = (key: keyof NotificationPreferencesData) => {
    setPreferences(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleTimeChange = (key: 'quietHoursStart' | 'quietHoursEnd', value: string) => {
    setPreferences(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Notification Preferences</CardTitle>
          <CardDescription>Loading your preferences...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center gap-3">
          <Bell className="h-6 w-6 text-primary" />
          <div>
            <CardTitle>Notification Preferences</CardTitle>
            <CardDescription>
              Control how and when you receive notifications from Gym Genie
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Notification Categories */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Notification Categories
          </h3>
          <p className="text-sm text-muted-foreground">
            Choose which types of notifications you want to receive
          </p>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                  <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <Label htmlFor="workouts" className="font-medium">Workout Reminders</Label>
                  <p className="text-sm text-muted-foreground">Scheduled workouts and exercise tips</p>
                </div>
              </div>
              <Switch
                id="workouts"
                checked={preferences.categoryWorkouts}
                onCheckedChange={() => handleToggle('categoryWorkouts')}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                  <Calendar className="h-4 w-4 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <Label htmlFor="diet" className="font-medium">Diet & Nutrition</Label>
                  <p className="text-sm text-muted-foreground">Meal plans and nutrition advice</p>
                </div>
              </div>
              <Switch
                id="diet"
                checked={preferences.categoryDiet}
                onCheckedChange={() => handleToggle('categoryDiet')}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 dark:bg-red-900 rounded-lg">
                  <Shield className="h-4 w-4 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <Label htmlFor="otp" className="font-medium">Security & OTP</Label>
                  <p className="text-sm text-muted-foreground">Login verification and security alerts</p>
                </div>
              </div>
              <Switch
                id="otp"
                checked={preferences.categoryOtp}
                onCheckedChange={() => handleToggle('categoryOtp')}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                  <Megaphone className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <Label htmlFor="announcements" className="font-medium">Announcements</Label>
                  <p className="text-sm text-muted-foreground">Important gym updates and events</p>
                </div>
              </div>
              <Switch
                id="announcements"
                checked={preferences.categoryAnnouncements}
                onCheckedChange={() => handleToggle('categoryAnnouncements')}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
                  <Tag className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div>
                  <Label htmlFor="promotions" className="font-medium">Promotions & Offers</Label>
                  <p className="text-sm text-muted-foreground">Special deals and membership offers</p>
                </div>
              </div>
              <Switch
                id="promotions"
                checked={preferences.categoryPromotions}
                onCheckedChange={() => handleToggle('categoryPromotions')}
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Quiet Hours */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Moon className="h-5 w-5" />
            Quiet Hours
          </h3>
          <p className="text-sm text-muted-foreground">
            Set times when you don't want to receive notifications
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quietStart">Start Time</Label>
              <div className="flex items-center gap-2">
                <Moon className="h-4 w-4 text-muted-foreground" />
                <input
                  id="quietStart"
                  type="time"
                  value={preferences.quietHoursStart}
                  onChange={(e) => handleTimeChange('quietHoursStart', e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="quietEnd">End Time</Label>
              <div className="flex items-center gap-2">
                <Sun className="h-4 w-4 text-muted-foreground" />
                <input
                  id="quietEnd"
                  type="time"
                  value={preferences.quietHoursEnd}
                  onChange={(e) => handleTimeChange('quietHoursEnd', e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
            </div>
          </div>
        </div>

        <Separator />

        {/* Frequency Settings */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Frequency Settings</h3>
          
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="digest" className="font-medium">Daily Digest</Label>
              <p className="text-sm text-muted-foreground">
                Receive a single daily summary instead of individual notifications
              </p>
            </div>
            <Switch
              id="digest"
              checked={preferences.frequencyDigest}
              onCheckedChange={() => handleToggle('frequencyDigest')}
            />
          </div>
        </div>

        <Separator />

        {/* Save Button */}
        <div className="flex justify-end">
          <Button onClick={savePreferences} disabled={saving}>
            {saving ? 'Saving...' : 'Save Preferences'}
          </Button>
        </div>

        {/* Current Status */}
        <div className="rounded-lg bg-muted p-4">
          <h4 className="font-medium mb-2">Current Notification Status</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Push Notifications:</span>
              <span className="font-medium">
                {Notification.permission === 'granted' ? 'Enabled' : 
                 Notification.permission === 'denied' ? 'Disabled' : 'Not Requested'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Active Categories:</span>
              <span className="font-medium">
                {Object.entries(preferences)
                  .filter(([key, value]) => key.startsWith('category') && value)
                  .length} of 5
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Quiet Hours:</span>
              <span className="font-medium">
                {preferences.quietHoursStart} - {preferences.quietHoursEnd}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
