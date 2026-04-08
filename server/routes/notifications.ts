import { Express } from "express";
import { storage } from "../storage";
import { db } from "../db";
import * as schema from "@shared/schema";
import { sendPushNotification, sendOTPNotification, sendWorkoutReminder, sendGeneralNotification, sendBulkNotification } from "../pushNotifications";

export function registerNotificationRoutes(app: Express) {
  // Get notification preferences
  app.get("/api/notifications/preferences", async (req, res) => {
    try {
      const userId = req.query.userId as string;
      const memberId = req.query.memberId as string;

      // Try to get existing preferences
      let preferences = await storage.getNotificationPreferences(userId, memberId);

      // If no preferences exist, create default ones
      if (!preferences) {
        preferences = await storage.createNotificationPreferences({
          userId,
          memberId,
          categoryWorkouts: true,
          categoryDiet: true,
          categoryOtp: true,
          categoryAnnouncements: true,
          categoryPromotions: false,
          quietHoursStart: '21:00',
          quietHoursEnd: '07:00',
          frequencyDigest: false,
        });
      }

      res.json(preferences);
    } catch (error) {
      console.error("Error fetching notification preferences:", error);
      res.status(500).json({ error: "Failed to fetch notification preferences" });
    }
  });

  // Save notification preferences
  app.post("/api/notifications/preferences", async (req, res) => {
    try {
      const { userId, memberId, ...preferences } = req.body;

      if (!userId && !memberId) {
        return res.status(400).json({ error: "Either userId or memberId is required" });
      }

      // Check if preferences already exist
      const existing = await storage.getNotificationPreferences(userId, memberId);

      let savedPreferences;
      if (existing) {
        // Update existing preferences
        savedPreferences = await storage.updateNotificationPreferences(existing.id, preferences);
      } else {
        // Create new preferences
        savedPreferences = await storage.createNotificationPreferences({
          userId,
          memberId,
          ...preferences,
        });
      }

      res.json(savedPreferences);
    } catch (error) {
      console.error("Error saving notification preferences:", error);
      res.status(500).json({ error: "Failed to save notification preferences" });
    }
  });

  // Send OTP notification
  app.post("/api/notifications/otp", async (req, res) => {
    try {
      const { memberId, otpCode, otpId } = req.body;

      if (!memberId) {
        return res.status(400).json({ error: "memberId is required" });
      }

      // Check if user has OTP notifications enabled
      const preferences = await storage.getNotificationPreferences(undefined, memberId);
      if (preferences && !preferences.categoryOtp) {
        return res.status(200).json({ 
          message: "OTP notification skipped - user has disabled OTP notifications",
          skipped: true 
        });
      }

      const success = await sendOTPNotification(memberId, otpCode, otpId);

      if (success) {
        res.json({ message: "OTP notification sent successfully" });
      } else {
        res.status(500).json({ error: "Failed to send OTP notification" });
      }
    } catch (error) {
      console.error("Error sending OTP notification:", error);
      res.status(500).json({ error: "Failed to send OTP notification" });
    }
  });

  // Send workout reminder
  app.post("/api/notifications/workout-reminder", async (req, res) => {
    try {
      const { memberId, workoutName, url } = req.body;

      if (!memberId) {
        return res.status(400).json({ error: "memberId is required" });
      }

      // Check if user has workout notifications enabled
      const preferences = await storage.getNotificationPreferences(undefined, memberId);
      if (preferences && !preferences.categoryWorkouts) {
        return res.status(200).json({ 
          message: "Workout reminder skipped - user has disabled workout notifications",
          skipped: true 
        });
      }

      // Check quiet hours
      if (preferences && preferences.quietHoursStart && preferences.quietHoursEnd) {
        const now = new Date();
        const currentTime = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
        
        if (currentTime >= preferences.quietHoursStart || currentTime <= preferences.quietHoursEnd) {
          return res.status(200).json({ 
            message: "Workout reminder skipped - currently in quiet hours",
            skipped: true 
          });
        }
      }

      const success = await sendWorkoutReminder(memberId, workoutName, url);

      if (success) {
        res.json({ message: "Workout reminder sent successfully" });
      } else {
        res.status(500).json({ error: "Failed to send workout reminder" });
      }
    } catch (error) {
      console.error("Error sending workout reminder:", error);
      res.status(500).json({ error: "Failed to send workout reminder" });
    }
  });

  // Send general notification
  app.post("/api/notifications/general", async (req, res) => {
    try {
      const { userId, memberId, title, body, url, category } = req.body;

      if (!title || !body) {
        return res.status(400).json({ error: "Title and body are required" });
      }

      // Check preferences based on category
      const preferences = await storage.getNotificationPreferences(userId, memberId);
      if (preferences) {
        let categoryEnabled = true;
        
        switch (category) {
          case 'workout':
            categoryEnabled = preferences.categoryWorkouts;
            break;
          case 'diet':
            categoryEnabled = preferences.categoryDiet;
            break;
          case 'announcement':
            categoryEnabled = preferences.categoryAnnouncements;
            break;
          case 'promotion':
            categoryEnabled = preferences.categoryPromotions;
            break;
        }

        if (!categoryEnabled) {
          return res.status(200).json({ 
            message: "Notification skipped - user has disabled this category",
            skipped: true 
          });
        }

        // Check quiet hours
        if (preferences.quietHoursStart && preferences.quietHoursEnd) {
          const now = new Date();
          const currentTime = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
          
          if (currentTime >= preferences.quietHoursStart || currentTime <= preferences.quietHoursEnd) {
            return res.status(200).json({ 
              message: "Notification skipped - currently in quiet hours",
              skipped: true 
            });
          }
        }
      }

      const success = await sendGeneralNotification(userId, memberId, title, body, url);

      if (success) {
        res.json({ message: "Notification sent successfully" });
      } else {
        res.status(500).json({ error: "Failed to send notification" });
      }
    } catch (error) {
      console.error("Error sending general notification:", error);
      res.status(500).json({ error: "Failed to send notification" });
    }
  });

  // Get notification history for user/member
  app.get("/api/notifications/history", async (req, res) => {
    try {
      const userId = req.query.userId as string;
      const memberId = req.query.memberId as string;
      const limit = parseInt(req.query.limit as string) || 50;

      const history = await storage.getNotificationHistory(userId, memberId, limit);

      res.json(history);
    } catch (error) {
      console.error("Error fetching notification history:", error);
      res.status(500).json({ error: "Failed to fetch notification history" });
    }
  });

  // Mark notification as read
  app.post("/api/notifications/:id/read", async (req, res) => {
    try {
      const { id } = req.params;

      await storage.markNotificationAsRead(id);

      res.json({ message: "Notification marked as read" });
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ error: "Failed to mark notification as read" });
    }
  });

  // Delete notification
  app.delete("/api/notifications/:id", async (req, res) => {
    try {
      const { id } = req.params;

      const deleted = await storage.deleteNotification(id);

      if (deleted) {
        res.json({ message: "Notification deleted successfully" });
      } else {
        res.status(404).json({ error: "Notification not found" });
      }
    } catch (error) {
      console.error("Error deleting notification:", error);
      res.status(500).json({ error: "Failed to delete notification" });
    }
  });

  // Get notification statistics
  app.get("/api/notifications/stats", async (req, res) => {
    try {
      const userId = req.query.userId as string;
      const memberId = req.query.memberId as string;

      const stats = await storage.getNotificationStats(userId, memberId);

      res.json(stats);
    } catch (error) {
      console.error("Error fetching notification stats:", error);
      res.status(500).json({ error: "Failed to fetch notification statistics" });
    }
  });


  // Legacy notification endpoints for backward compatibility
  app.get("/api/notifications", async (req, res) => {
    try {
      const notifications = await storage.getAllNotifications();
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  });

  app.post("/api/notifications", async (req, res) => {
    try {
      const { message, date, sentTo, sentToType, title } = req.body;

      // Validate required fields: sentTo is only required for individual notifications
      // Support both single string and array of strings for sentTo
      const sentToArray = Array.isArray(sentTo) ? sentTo : (sentTo ? [sentTo] : []);
      const hasRecipients = sentToArray.length > 0;
      
      if (!message || !date || !sentToType || (sentToType === 'individual' && !hasRecipients)) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      // For broadcast notifications (all/leads), set sentTo to a descriptive value if not provided
      let finalSentTo = sentToType === 'individual' ? (Array.isArray(sentTo) ? sentTo.join(', ') : sentTo) : '';
      if ((sentToType === 'all' || sentToType === 'leads') && !sentTo) {
        finalSentTo = sentToType === 'all' ? 'All Members' : 'All Leads';
      }

      // Create notification in database
      const notification = await storage.createNotification({
        message,
        date,
        sentTo: finalSentTo,
        sentToType,
        status: "sent",
        deliveryStatus: "delivered",
      });

      // Send push notifications via OneSignal
      let pushSent = false;
      const notificationTitle = title || "Gym Genie Announcement";

      if (sentToType === "individual" && hasRecipients) {
        // For individual notifications, sentTo can be a single member ID or array of member IDs
        console.log("OneSignal: Sending to individual members:", sentToArray);
        
        if (sentToArray.length === 1) {
          // Single recipient - use sendGeneralNotification
          pushSent = await sendGeneralNotification(
            undefined,
            sentToArray[0],
            notificationTitle,
            message,
            "/notifications"
          );
        } else {
          // Multiple recipients - use sendBulkNotification
          const result = await sendBulkNotification(sentToArray, notificationTitle, message, "/notifications", "announcement");
          pushSent = result.success > 0;
          console.log("OneSignal: Bulk notification result:", result);
        }
      } else if (sentToType === "all") {
        // Get all members with push subscriptions and send bulk notification
        console.log("OneSignal: Sending to all members");
        const allMembers = await db.select({ id: schema.members.id }).from(schema.members);
        const memberIds = allMembers.map((m: { id: string }) => m.id);
        
        if (memberIds.length > 0) {
          const result = await sendBulkNotification(memberIds, notificationTitle, message, "/notifications", "announcement");
          pushSent = result.success > 0;
          console.log("OneSignal: Bulk notification result:", result);
        }
      }

      res.json({
        ...notification,
        pushSent,
        message: "Notification created successfully"
      });
    } catch (error) {
      console.error("Error creating notification:", error);
      res.status(500).json({ error: "Failed to create notification" });
    }
  });
}
