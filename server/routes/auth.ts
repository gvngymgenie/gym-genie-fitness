import { Express } from "express";
import { storage } from "../storage";
import { db } from "../db";
import { z } from "zod";
import { sendWhatsAppOTP, isWhatsAppConfigured } from "../services/whatsapp";

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

const sendOtpSchema = z.object({
  phone: z.string().min(10).max(15),
});

const verifyOtpSchema = z.object({
  phone: z.string().min(10).max(15),
  otp: z.string().length(6),
});

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: User authentication
 *     description: Authenticate user with username and password
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, password]
 *             properties:
 *               username:
 *                 type: string
 *                 description: User's username
 *                 example: "admin"
 *               password:
 *                 type: string
 *                 description: User's password
 *                 example: "password123"
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Account is disabled
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       400:
 *         description: Invalid credentials format
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
export function registerAuthRoutes(app: Express) {
  // Login route
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = loginSchema.parse(req.body);
      const user = await storage.validatePassword(username, password);

      if (!user) {
        return res.status(401).json({ error: "Invalid username or password" });
      }

      if (!user.isActive) {
        return res.status(403).json({ error: "Account is disabled" });
      }

      res.json({ user });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid credentials format" });
      }
      res.status(500).json({ error: "Login failed" });
    }
  });

  /**
   * @swagger
   * /api/auth/member/send-otp:
   *   post:
   *     summary: Send OTP for member phone authentication
   *     description: Send OTP to member's phone number for authentication
   *     tags: [Authentication]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [phone]
   *             properties:
   *               phone:
   *                 type: string
   *                 description: Member's phone number
   *                 example: "+1234567890"
   *               fcmToken:
   *                 type: string
   *                 description: Firebase Cloud Messaging token for push notifications (optional)
   *                 example: "fcm_token_here"
   *     responses:
   *       200:
   *         description: OTP sent successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: "OTP sent successfully"
   *                 demoOtp:
   *                   type: string
   *                   description: OTP code (only for demo purposes)
   *                   example: "123456"
   *                 expiresIn:
   *                   type: integer
   *                   description: OTP expiration time in seconds
   *                   example: 300
   *       404:
   *         description: Member not found
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       403:
   *         description: Membership not active
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       400:
   *         description: Invalid phone number format
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  // Member Phone OTP Login - Send OTP
  app.post("/api/auth/member/send-otp", async (req, res) => {
    try {
      const { phone } = req.body;

      // Validate phone number
      const validatedData = sendOtpSchema.parse({ phone });

      // Check if member exists with this phone number
      const member = await storage.getMemberByPhone(phone);
      if (!member) {
        return res.status(404).json({ error: "No member found with this phone number" });
      }

      // Check if member is active
      if (member.status !== "Active") {
        return res.status(403).json({ error: "Your membership is not active. Please contact the gym." });
      }

      // Clean up expired OTPs periodically
      await storage.cleanExpiredOtps();

      // Generate OTP
      const otp = generateOtp();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

      // Store OTP in database
      const otpRecord = await storage.createOtp({ phone, otp, expiresAt });

      // Send OTP via WhatsApp
      console.log(`[OTP] Sending OTP via WhatsApp to ${phone}...`);
      const whatsappResult = await sendWhatsAppOTP(phone, otp);
      
      if (whatsappResult.success) {
        console.log(`[OTP] ✅ WhatsApp OTP sent successfully, messageId: ${whatsappResult.messageId}`);
      } else {
        console.warn(`[OTP] ⚠️ WhatsApp failed: ${whatsappResult.error}`);
      }

      // Also send push notification via OneSignal as backup
      console.log(`[OTP] Processing OTP for member ${member.id}`);
      
      try {
        const { sendOTPNotification } = await import('../pushNotifications');
        console.log(`[OTP] Sending OneSignal push notification...`);

        // Send OTP via OneSignal using memberId
        const pushResult = await sendOTPNotification(member.id, otp, otpRecord.id);

        if (pushResult) {
          console.log(`[OTP] ✅ OneSignal push notification sent for OTP to member ${member.id}`);
        } else {
          console.log(`[OTP] ⚠️ OneSignal notification not sent (member may not have subscribed to push)`);
        }
      } catch (pushError) {
        console.warn(`[OTP] ⚠️ Failed to send OneSignal push notification:`, pushError);
        // Don't fail the request if push notification fails
      }

      // In production, this would send SMS via Twilio or similar
      // For demo, we return the OTP (in production, never do this!)
      console.log(`OTP for ${phone}: ${otp}`);

      res.json({
        message: "OTP sent successfully",
        // Only for demo - remove in production
        demoOtp: otp,
        expiresIn: 300 // seconds
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid phone number format" });
      }
      console.error("Send OTP error:", error);
      res.status(500).json({ error: "Failed to send OTP" });
    }
  });

  /**
   * @swagger
   * /api/auth/member/verify-otp:
   *   post:
   *     summary: Verify OTP for member phone authentication
   *     description: Verify OTP sent to member's phone number
   *     tags: [Authentication]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [phone, otp]
   *             properties:
   *               phone:
   *                 type: string
   *                 description: Member's phone number
   *                 example: "+1234567890"
   *               otp:
   *                 type: string
   *                 description: 6-digit OTP code
   *                 example: "123456"
   *     responses:
   *       200:
   *         description: Login successful
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: "Login successful"
   *                 member:
   *                   $ref: '#/components/schemas/Member'
   *       401:
   *         description: Invalid or expired OTP
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       404:
   *         description: Member not found
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       403:
   *         description: Membership not active
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       400:
   *         description: Invalid OTP format
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  // Member Phone OTP Login - Verify OTP
  app.post("/api/auth/member/verify-otp", async (req, res) => {
    try {
      const { phone, otp } = verifyOtpSchema.parse(req.body);

      // Verify OTP
      const validOtp = await storage.getValidOtp(phone, otp);
      if (!validOtp) {
        return res.status(401).json({ error: "Invalid or expired OTP" });
      }

      // Mark OTP as verified (single-use)
      await storage.markOtpVerified(validOtp.id);

      // Get member and verify active status
      const member = await storage.getMemberByPhone(phone);
      if (!member) {
        return res.status(404).json({ error: "Member not found" });
      }

      if (member.status !== "Active") {
        return res.status(403).json({ error: "Your membership is not active" });
      }

      res.json({
        message: "Login successful",
        member
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid OTP format" });
      }
      console.error("Verify OTP error:", error);
      res.status(500).json({ error: "Failed to verify OTP" });
    }
  });

  /**
   * @swagger
   * /api/auth/seed-demo:
   *   post:
   *     summary: Create demo users (for development only)
   *     description: Creates demo admin and manager users for testing purposes
   *     tags: [Authentication]
   *     responses:
   *       200:
   *         description: Demo users created successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: "Demo users created successfully"
   *                 users:
   *                   type: array
   *                   items:
   *                     type: object
   *                     properties:
   *                       username:
   *                         type: string
   *                       email:
   *                         type: string
   *                       role:
   *                         type: string
   *       400:
   *         description: Demo users already exist
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  // Demo user creation route (for development/testing)
  app.post("/api/auth/seed-demo", async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      
      if (users.length > 0) {
        return res.status(400).json({ error: "Demo users already exist" });
      }

      // Create admin user
      const admin = await storage.createUser({
        username: 'admin',
        email: 'admin@gymgenie.com',
        password: 'admin123',
        firstName: 'Admin',
        role: 'admin',
        isActive: true
      });

      // Create manager user
      const manager = await storage.createUser({
        username: 'manager',
        email: 'manager@gymgenie.com',
        password: 'manager123',
        firstName: 'Manager',
        role: 'manager',
        isActive: true
      });

      res.json({
        message: "Demo users created successfully",
        users: [
          { username: admin.username, email: admin.email, role: admin.role },
          { username: manager.username, email: manager.email, role: manager.role }
        ]
      });
    } catch (error) {
      console.error("Seed demo users error:", error);
      res.status(500).json({ error: "Failed to create demo users" });
    }
  });
}
