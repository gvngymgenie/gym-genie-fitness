// OneSignal Push Notifications for Gym Genie
// Replaces Firebase Admin SDK implementation

import { storage } from './storage';

// OneSignal configuration
const ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID || '';
const ONESIGNAL_REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY;

// Types
export interface OneSignalSubscriptionData {
  playerId: string;
  externalId: string;  // Maps to userId or memberId in your app
  userAgent?: string;
}

export interface PushNotificationPayload {
  type: 'otp' | 'workout_reminder' | 'general';
  title?: string;
  body?: string;
  icon?: string;
  badge?: string;
  url?: string;
  otpId?: string;
  data?: Record<string, any>;
}

export interface OneSignalNotificationRequest {
  app_id: string;
  external_user_ids?: string[];
  include_player_ids?: string[];
  contents: { en: string };
  headings?: { en: string };
  url?: string;
  data?: Record<string, any>;
  buttons?: Array<{
    id: string;
    text: string;
    icon?: string;
  }>;
  web_buttons?: Array<{
    id: string;
    text: string;
    icon?: string;
    url?: string;
  }>;
}

// Helper to make OneSignal API requests
async function makeOneSignalRequest(endpoint: string, body: any): Promise<any> {
  console.log('OneSignal: Making request to', endpoint);
  console.log('OneSignal: Request body:', JSON.stringify(body, null, 2));
  console.log('OneSignal: API Key configured:', !!ONESIGNAL_REST_API_KEY);
  
  const response = await fetch(`https://api.onesignal.com/${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('OneSignal: API error response:', errorText);
    throw new Error(`OneSignal API error: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  console.log('OneSignal: API success response:', JSON.stringify(result, null, 2));
  return result;
}

// Save a push subscription
export async function saveSubscription(
  subscription: OneSignalSubscriptionData,
  userId?: string,
  memberId?: string
): Promise<boolean> {
  try {
    // The subscription is stored by mapping externalId to userId/memberId
    // PlayerId is stored for reference
    console.log('OneSignal: Saving subscription for externalId:', subscription.externalId);
    
    // Update storage with OneSignal player ID
    await storage.savePushSubscription({
      userId: userId || null,
      memberId: memberId || null,
      endpoint: subscription.playerId,  // Store playerId as endpoint
      p256dh: '',  // Not needed for OneSignal
      auth: '',    // Not needed for OneSignal
      userAgent: subscription.userAgent,
    });
    
    return true;
  } catch (error) {
    console.error('Error saving push subscription:', error);
    return false;
  }
}

// Send push notification to specific users via external IDs
export async function sendPushNotification(
  payload: PushNotificationPayload,
  userId?: string,
  memberId?: string,
  playerIds?: string[]
): Promise<boolean> {
  try {
    console.log('OneSignal: Sending push notification...');
    console.log('OneSignal: Type:', payload.type, '| userId:', userId, '| memberId:', memberId);

    // Build notification request
    const notification: OneSignalNotificationRequest = {
      app_id: ONESIGNAL_APP_ID,
      contents: {
        en: payload.body || 'You have a notification',
      },
      headings: {
        en: payload.title || (payload.type === 'otp' ? 'Gym Genie - OTP' : 'Gym Genie'),
      },
      url: payload.url || '/',
      data: {
        type: payload.type,
        ...payload.data,
      },
    };

    // Add buttons for OTP notifications
    if (payload.type === 'otp') {
      notification.buttons = [
        { id: 'verify', text: 'Verify' },
      ];
    }

    // Target by external user IDs (preferred method)
    const targetIds: string[] = [];
    
    if (memberId) {
      targetIds.push(memberId);
    }
    if (userId) {
      targetIds.push(userId);
    }

    if (targetIds.length > 0) {
      notification.external_user_ids = targetIds;
      console.log('OneSignal: Targeting external_user_ids:', targetIds);
    }

    // Fallback to player IDs if provided
    if (playerIds && playerIds.length > 0) {
      notification.include_player_ids = playerIds;
      console.log('OneSignal: Targeting player_ids:', playerIds);
    }

    // If no targets, try to find subscriptions in database
    if (!notification.external_user_ids && !notification.include_player_ids) {
      console.log('OneSignal: No targets provided, searching database...');
      
      const subscriptions = await storage.getPushSubscriptionsByUser(userId, memberId);
      
      if (subscriptions.length > 0) {
        // Use player IDs from database
        notification.include_player_ids = subscriptions
          .filter(sub => sub.endpoint && sub.isActive)
          .map(sub => sub.endpoint);
        
        console.log('OneSignal: Found', notification.include_player_ids.length, 'subscriptions in database');
      }
    }

    if (!notification.external_user_ids && !notification.include_player_ids) {
      console.log('OneSignal: No valid targets found for notification');
      return false;
    }

    // Send notification
    console.log('OneSignal: Sending notification...');
    const result = await makeOneSignalRequest('notifications', notification);
    
    console.log('OneSignal: ✅ Notification sent successfully');
    console.log('OneSignal: Response id:', result.id);
    console.log('OneSignal: Recipients:', result.recipients);
    
    return true;

  } catch (error) {
    console.error('Error sending OneSignal push notification:', error);
    if (error instanceof Error) {
      console.error('OneSignal: Error message:', error.message);
    }
    return false;
  }
}

// Send OTP notification specifically
export async function sendOTPNotification(
  memberId: string,
  otpCode?: string,
  otpId?: string
): Promise<boolean> {
  const body = otpCode
    ? `Your verification code is: ${otpCode}`
    : 'Your verification code has been sent to your device';

  return await sendPushNotification({
    type: 'otp',
    body,
    url: '/member/login',
    otpId,
    data: { otpId },
  }, undefined, memberId);
}

// Send workout reminder notification
export async function sendWorkoutReminder(
  memberId: string,
  workoutName?: string,
  url?: string
): Promise<boolean> {
  return await sendPushNotification({
    type: 'workout_reminder',
    title: 'Gym Genie - Workout Time',
    body: workoutName ? `Time for your ${workoutName} workout!` : 'Time for your workout!',
    url: url || '/member/workouts',
  }, undefined, memberId);
}

// Send general notification
export async function sendGeneralNotification(
  userId: string | undefined,
  memberId: string | undefined,
  title: string,
  body: string,
  url?: string
): Promise<boolean> {
  return await sendPushNotification({
    type: 'general',
    title,
    body,
    url,
  }, userId, memberId);
}

// Send notification to multiple members
export async function sendBulkNotification(
  memberIds: string[],
  title: string,
  body: string,
  url?: string,
  type: string = 'general'
): Promise<{ success: number; failed: number }> {
  try {
    console.log(`OneSignal: Sending bulk notification to ${memberIds.length} members`);

    const notification: OneSignalNotificationRequest = {
      app_id: ONESIGNAL_APP_ID,
      external_user_ids: memberIds,
      contents: { en: body },
      headings: { en: title },
      url: url || '/',
      data: { type },
    };

    const result = await makeOneSignalRequest('notifications', notification);
    
    console.log('OneSignal: Bulk notification sent:', result.id);
    
    return {
      success: result.recipients || 0,
      failed: memberIds.length - (result.recipients || 0),
    };
  } catch (error) {
    console.error('Error sending bulk notification:', error);
    return { success: 0, failed: memberIds.length };
  }
}

// Cancel a notification (by id)
export async function cancelNotification(notificationId: string): Promise<boolean> {
  try {
    const response = await fetch(`https://api.onesignal.com/notifications/${notificationId}?app_id=${ONESIGNAL_APP_ID}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to cancel notification: ${response.status}`);
    }

    console.log('OneSignal: Notification cancelled:', notificationId);
    return true;
  } catch (error) {
    console.error('Error cancelling notification:', error);
    return false;
  }
}

// Get notification outcomes
export async function getNotificationOutcomes(notificationId: string): Promise<any> {
  try {
    const response = await fetch(
      `https://api.onesignal.com/notifications/${notificationId}/outcomes?app_id=${ONESIGNAL_APP_ID}`,
      {
        headers: {
          'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to get outcomes: ${response.status}`);
    }

    return response.json();
  } catch (error) {
    console.error('Error getting notification outcomes:', error);
    return null;
  }
}

// Check if push notifications are configured
export function isPushConfigured(): boolean {
  return !!ONESIGNAL_REST_API_KEY;
}

// Get OneSignal config for client
export function getOneSignalConfig() {
  return {
    appId: ONESIGNAL_APP_ID,
  };
}
