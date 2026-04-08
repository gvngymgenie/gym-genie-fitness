import { Express } from "express";
import { storage } from "../storage";

// Validate OneSignal player ID format (UUID)
function isValidOneSignalPlayerId(playerId: string): boolean {
  // OneSignal player IDs are UUIDs like: d8b2a3f4-1234-5678-90ab-cdef12345678
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(playerId);
}

export function registerPushRoutes(app: Express) {
  // Push Notification Subscription Route (OneSignal)
  app.post("/api/push/subscribe", async (req, res) => {
    try {
      const { playerId, externalId, userAgent, userId, memberId } = req.body;

      if (!playerId) {
        return res.status(400).json({ error: "Player ID required" });
      }

      // Validate OneSignal player ID format (reject legacy FCM tokens)
      if (!isValidOneSignalPlayerId(playerId)) {
        console.warn('Push: Invalid OneSignal player ID format (expected UUID):', playerId.substring(0, 30) + '...');
        return res.status(400).json({ 
          error: "Invalid OneSignal player ID format. Expected UUID format like: d8b2a3f4-1234-5678-90ab-cdef12345678" 
        });
      }

      console.log('Push: Received subscription request:', {
        playerId: playerId.substring(0, 20) + '...',
        externalId,
        userId,
        memberId
      });

      // Check if subscription already exists
      const existingSubscriptions = await storage.getPushSubscriptionsByUser(userId, memberId);
      const existingSubscription = existingSubscriptions.find(sub => sub.endpoint === playerId);

      if (existingSubscription) {
        // If subscription already exists and is active, just return success
        if (existingSubscription.isActive) {
          console.log('Push: Subscription already exists and is active');
          return res.json({
            message: "OneSignal player already registered",
            playerIdReceived: true
          });
        } else {
          // Reactivate the existing subscription
          await storage.reactivatePushSubscription(existingSubscription.endpoint);
          return res.json({
            message: "OneSignal player reactivated successfully",
            playerIdReceived: true
          });
        }
      }

      // Store OneSignal player ID in database
      await storage.savePushSubscription({
        userAgent,
        userId: userId || null,
        memberId: memberId || null,
        endpoint: playerId,  // Store playerId as endpoint
        p256dh: '',  // Not needed for OneSignal
        auth: '',    // Not needed for OneSignal
      });

      console.log('Push: Stored OneSignal player ID for user/member:', {
        playerId: playerId.substring(0, 20) + '...',
        externalId,
        userId,
        memberId
      });

      res.json({
        message: "OneSignal player registered successfully",
        playerIdReceived: true
      });
    } catch (error: any) {
      console.error("OneSignal subscription error:", error);
      console.error("Error details:", {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      res.status(500).json({ error: "Failed to register push subscription", details: error.message });
    }
  });

  // Get OneSignal configuration for client
  app.get("/api/push/config", async (req, res) => {
    try {
      const { getOneSignalConfig } = await import('../pushNotifications');
      const config = getOneSignalConfig();

      if (!config.appId) {
        return res.status(500).json({ error: "OneSignal not configured" });
      }

      res.json({ 
        provider: 'onesignal',
        config 
      });
    } catch (error) {
      console.error("OneSignal config error:", error);
      res.status(500).json({ error: "Failed to get push config" });
    }
  });

  // Test notification endpoint
  app.post("/api/push/test", async (req, res) => {
    try {
      const { userId, memberId, title, body } = req.body;

      const { sendGeneralNotification, isPushConfigured } = await import('../pushNotifications');

      if (!isPushConfigured()) {
        return res.status(500).json({ error: "OneSignal not configured on server" });
      }

      const success = await sendGeneralNotification(
        userId,
        memberId,
        title || 'Gym Genie Test',
        body || 'This is a test notification!'
      );

      if (success) {
        res.json({ message: "Test notification sent successfully" });
      } else {
        res.status(500).json({ error: "Failed to send test notification" });
      }
    } catch (error) {
      console.error("Test notification error:", error);
      res.status(500).json({ error: "Failed to send test notification" });
    }
  });

  // Unsubscribe endpoint
  app.post("/api/push/unsubscribe", async (req, res) => {
    try {
      const { playerId, userId, memberId } = req.body;

      if (playerId) {
        await storage.deactivatePushSubscription(playerId);
      }

      res.json({ message: "Unsubscribed from push notifications" });
    } catch (error) {
      console.error("Unsubscribe error:", error);
      res.status(500).json({ error: "Failed to unsubscribe" });
    }
  });

  // Get user's push subscription status from database
  app.get("/api/push/status", async (req, res) => {
    try {
      const { userId, memberId } = req.query;

      if (!userId && !memberId) {
        return res.status(400).json({ error: "userId or memberId required" });
      }

      const subscriptions = await storage.getPushSubscriptionsByUser(
        userId as string,
        memberId as string
      );

      // Filter to only OneSignal player IDs (UUID format)
      const oneSignalSubscriptions = subscriptions.filter(sub => {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        return uuidRegex.test(sub.endpoint);
      });

      if (oneSignalSubscriptions.length > 0) {
        const latest = oneSignalSubscriptions[0];
        res.json({
          isSubscribed: true,
          playerId: latest.endpoint,
          createdAt: latest.createdAt,
          lastUsedAt: latest.lastUsedAt
        });
      } else {
        res.json({
          isSubscribed: false,
          playerId: null
        });
      }
    } catch (error) {
      console.error("Push status error:", error);
      res.status(500).json({ error: "Failed to get push status" });
    }
  });
}
