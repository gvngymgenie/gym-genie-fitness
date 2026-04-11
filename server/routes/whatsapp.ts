import { Express } from "express";
import { z } from "zod";
import { db } from "../db";
import { members } from "@shared/schema";
import {
  sendWhatsAppTestMessage,
  sendWhatsAppDocument,
  sendWhatsAppPayslipLink,
  checkWhatsAppHealth,
  WhatsAppTestRequest,
  WhatsAppHealthResponse,
  isWhatsAppConfigured
} from "../services/whatsapp";
import { PayslipStorage } from "../utils/payslipStorage";

function normalizePhoneNumber(phone: string): string {
  // Remove any non-digit characters
  const digits = phone.replace(/\D/g, '');
  
  // If it's exactly 10 digits, add +91 prefix
  if (digits.length === 10) {
    return '+91' + digits;
  }
  
  // If it already has country code, ensure it has +
  if (digits.length > 10 && !phone.startsWith('+')) {
    return '+' + digits;
  }
  
  // Return as-is if it already has + or is not 10 digits
  return phone.startsWith('+') ? phone : '+' + digits;
}
const whatsappTestSchema = z.object({
  to: z.string().min(8, "Phone number must be at least 8 characters"),
  message: z.string().min(1, "Message cannot be empty").max(1000, "Message too long")
});

const whatsappSendSchema = z.object({
  message: z.string().min(1, "Message cannot be empty").max(1000, "Message too long"),
  recipientType: z.enum(["individual", "all"]),
  memberIds: z.array(z.string()).optional(),
  memberId: z.string().optional(),
  phone: z.string().optional(),
  recipientName: z.string().optional(),
});

const whatsappDocumentSchema = z.object({
  phone: z.string().min(8, "Phone number must be at least 8 characters"),
  base64Data: z.string().optional(),
  downloadUrl: z.string().optional(), // Pre-existing Supabase URL (skip upload)
  filename: z.string().default("payslip.pdf"),
  caption: z.string().default("Your payslip is attached."),
});

// In-memory message log (replace with DB table later)
export interface WhatsAppMessageLog {
  id: string;
  recipientType: "individual" | "all";
  memberId?: string;
  recipientName: string;
  phone: string;
  message: string;
  status: "sent" | "failed";
  errorMessage?: string;
  messageId?: string;
  createdAt: string;
}

const messageLog: WhatsAppMessageLog[] = [];

function generateId(): string {
  return `wa_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Register WhatsApp routes
 */
export function registerWhatsAppRoutes(app: Express): void {
  // Health check endpoint
  app.get("/api/whatsapp/health", async (_req, res) => {
    try {
      const healthResponse: WhatsAppHealthResponse = await checkWhatsAppHealth();
      if (healthResponse.success) {
        res.json({
          success: true,
          message: healthResponse.message,
          phoneNumberId: healthResponse.phoneNumberId,
          configured: isWhatsAppConfigured()
        });
      } else {
        res.status(400).json({
          success: false,
          message: healthResponse.message,
          error: healthResponse.error,
          configured: isWhatsAppConfigured()
        });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Internal server error during health check",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Test message endpoint (legacy)
  app.post("/api/whatsapp/test", async (req, res) => {
    try {
      const validatedData = whatsappTestSchema.parse(req.body);
      const request: WhatsAppTestRequest = { to: validatedData.to, message: validatedData.message };
      const response = await sendWhatsAppTestMessage(request);

      if ('error' in response) {
        return res.status(400).json({
          success: false,
          message: "Failed to send WhatsApp message",
          error: response.error.message,
          details: response.error
        });
      }

      res.json({
        success: true,
        message: "WhatsApp message sent successfully",
        messageId: response.messages?.[0]?.id,
        phoneNumber: response.contacts?.[0]?.wa_id,
        response
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ success: false, message: "Invalid request data", error: error.issues });
      }
      res.status(500).json({ success: false, message: "Failed to send WhatsApp message", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // Send message endpoint (with logging)
  app.post("/api/whatsapp/send", async (req, res) => {
    try {
      const data = whatsappSendSchema.parse(req.body);

      if (data.recipientType === "individual") {
        // Support both single memberId and array of memberIds
        const memberIds = data.memberIds || (data.memberId ? [data.memberId] : []);
        console.log("[WhatsApp] Received request:", JSON.stringify({ memberIds: memberIds, phone: data.phone, memberId: data.memberId }));
        const hasSelectedMembers = memberIds.length > 0;
        const hasPhone = !!data.phone;
        
        // Allow if: has selected members OR has phone number
        if (!hasSelectedMembers && !hasPhone) {
          return res.status(400).json({ success: false, message: "Please select members or enter a phone number" });
        }

        // If members are selected, send to all of them
        if (hasSelectedMembers) {
          // Get all members and filter to selected ones
          const allMembers = await db.select().from(members);
          console.log("[WhatsApp] Total members in DB:", allMembers.length);
          console.log("[WhatsApp] Looking for memberIds:", memberIds);
          
          const selectedMembers = allMembers.filter((m: any) => memberIds.includes(m.id));
          console.log("[WhatsApp] Filtered members count:", selectedMembers.length);
          
          if (selectedMembers.length === 0) {
            console.log("[WhatsApp] ERROR: No matching members found in database!");
            console.log("[WhatsApp] Available member IDs:", allMembers.slice(0, 5).map((m: any) => m.id));
            return res.status(400).json({ 
              success: false, 
              message: `No matching members found. Received ${memberIds.length} member IDs but none matched in database.`, 
              debug: { requestedIds: memberIds, availableCount: allMembers.length }
            });
          }
          
          console.log("[WhatsApp] Found members:", selectedMembers.map((m: any) => ({ id: m.id, firstName: m.firstName, phone: m.phone })));
          
          const results: WhatsAppMessageLog[] = [];
          let sentCount = 0;
          let failedCount = 0;
          let skippedCount = 0;

          for (const member of selectedMembers) {
            console.log("[WhatsApp] Processing member:", member.id, member.firstName, "phone:", member.phone);
            
            if (!member.phone) {
              console.log("[WhatsApp] Skipping member - no phone number:", member.id);
              skippedCount++;
              continue;
            }

            const request: WhatsAppTestRequest = { to: normalizePhoneNumber(member.phone), message: data.message };
            let response: any;
            try {
              response = await sendWhatsAppTestMessage(request);
            } catch (e) {
              response = { error: { message: e instanceof Error ? e.message : "Unknown error" } };
            }

            const logEntry: WhatsAppMessageLog = {
              id: generateId(),
              recipientType: "individual",
              memberId: member.id,
              recipientName: `${member.firstName} ${member.lastName || ""}`.trim(),
              phone: member.phone,
              message: data.message,
              status: "error" in response ? "failed" : "sent",
              errorMessage: "error" in response ? response.error.message : undefined,
              messageId: "error" in response ? undefined : response.messages?.[0]?.id,
              createdAt: new Date().toISOString(),
            };

            results.push(logEntry);
            messageLog.unshift(logEntry);
            if (logEntry.status === "sent") sentCount++; else failedCount++;
          }

          return res.json({ 
            success: true, 
            message: `Sent to ${sentCount} member${sentCount !== 1 ? "s" : ""}${failedCount > 0 ? `, ${failedCount} failed` : ""}${skippedCount > 0 ? `, ${skippedCount} skipped (no phone)` : ""}`, 
            sentCount, 
            failedCount, 
            skippedCount,
            results 
          });
        }

        // Fallback: send to provided phone number
        const request: WhatsAppTestRequest = { to: normalizePhoneNumber(data.phone!), message: data.message };
        const response = await sendWhatsAppTestMessage(request);

        const logEntry: WhatsAppMessageLog = {
          id: generateId(),
          recipientType: "individual",
          memberId: data.memberId,
          recipientName: data.recipientName || data.phone!,
          phone: data.phone!,
          message: data.message,
          status: "error" in response ? "failed" : "sent",
          errorMessage: "error" in response ? response.error.message : undefined,
          messageId: "error" in response ? undefined : response.messages?.[0]?.id,
          createdAt: new Date().toISOString(),
        };
        messageLog.unshift(logEntry);

        if ("error" in response) {
          return res.status(400).json({ success: false, message: "Failed to send WhatsApp message", error: response.error.message, log: logEntry });
        }

        return res.json({ success: true, message: "WhatsApp message sent successfully", log: logEntry });

      } else {
        // Broadcast to all members
        const allMembers = await db.select().from(members);
        const results: WhatsAppMessageLog[] = [];
        let sentCount = 0;
        let failedCount = 0;

        for (const member of allMembers) {
          if (!member.phone) continue;

          const request: WhatsAppTestRequest = { to: normalizePhoneNumber(member.phone), message: data.message };
          let response: any;
          try {
            response = await sendWhatsAppTestMessage(request);
          } catch (e) {
            response = { error: { message: e instanceof Error ? e.message : "Unknown error" } };
          }

          const logEntry: WhatsAppMessageLog = {
            id: generateId(),
            recipientType: "all",
            memberId: member.id,
            recipientName: `${member.firstName} ${member.lastName || ""}`.trim(),
            phone: member.phone,
            message: data.message,
            status: "error" in response ? "failed" : "sent",
            errorMessage: "error" in response ? response.error.message : undefined,
            messageId: "error" in response ? undefined : response.messages?.[0]?.id,
            createdAt: new Date().toISOString(),
          };

          results.push(logEntry);
          messageLog.unshift(logEntry);
          if (logEntry.status === "sent") sentCount++; else failedCount++;
        }

        return res.json({ success: true, message: `Broadcast complete: ${sentCount} sent, ${failedCount} failed`, sentCount, failedCount, results });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ success: false, message: "Invalid request data", error: error.issues });
      }
      res.status(500).json({ success: false, message: "Failed to send WhatsApp message", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // Get message history
  app.get("/api/whatsapp/messages", (_req, res) => {
    const limit = 100;
    res.json(messageLog.slice(0, limit));
  });

  // Delete message from history
  app.delete("/api/whatsapp/messages/:id", (req, res) => {
    const { id } = req.params;
    const index = messageLog.findIndex(m => m.id === id);
    
    if (index === -1) {
      return res.status(404).json({ success: false, message: "Message not found" });
    }
    
    messageLog.splice(index, 1);
    res.json({ success: true, message: "Message deleted" });
  });

  // Get stats
  app.get("/api/whatsapp/stats", (_req, res) => {
    const total = messageLog.length;
    const sent = messageLog.filter(m => m.status === "sent").length;
    const failed = messageLog.filter(m => m.status === "failed").length;
    res.json({ total, sent, failed });
  });

  // Status endpoint
  app.get("/api/whatsapp/status", async (_req, res) => {
    try {
      const configured = isWhatsAppConfigured();
      if (!configured) {
        return res.json({
          configured: false,
          message: "WhatsApp API is not configured",
          details: { hasToken: !!process.env.WHATSAPP_API_TOKEN, hasPhoneNumberId: !!process.env.PHONENUMBER_ID }
        });
      }
      const healthResponse = await checkWhatsAppHealth();
      res.json({
        configured: true,
        message: "WhatsApp API is configured",
        health: healthResponse,
        details: { hasToken: !!process.env.WHATSAPP_API_TOKEN, hasPhoneNumberId: !!process.env.PHONENUMBER_ID }
      });
    } catch (error) {
      res.status(500).json({ success: false, message: "Error checking WhatsApp status", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // Send document (PDF payslip) via WhatsApp
  // If downloadUrl is provided, sends a text with that URL directly.
  // Otherwise uploads PDF to Supabase first, then sends a text with the link.
  app.post("/api/whatsapp/send-document", async (req, res) => {
    try {
      const validatedData = whatsappDocumentSchema.parse(req.body);

      let downloadUrl: string;

      if (validatedData.downloadUrl) {
        // Use pre-existing URL (from payout record)
        downloadUrl = validatedData.downloadUrl;
      } else if (validatedData.base64Data) {
        // Upload to Supabase first
        const cleanBase64 = validatedData.base64Data.includes(",")
          ? validatedData.base64Data.split(",").pop()!
          : validatedData.base64Data;

        downloadUrl = await PayslipStorage.uploadPayslip(
          cleanBase64,
          validatedData.filename
        );
      } else {
        return res.status(400).json({
          success: false,
          message: "Either base64Data or downloadUrl is required",
        });
      }

      // Extract info from caption for personalization
      const trainerName = validatedData.caption.match(/Hi (\w+)/)?.[1] || "Trainer";
      const monthYearMatch = validatedData.caption.match(/payslip for (.+?) (?:is|attached)/);
      const monthYear = monthYearMatch?.[1] || "";
      const payoutMatch = validatedData.caption.match(/Net payout: ₹([\d,.]+)/);
      const netPayout = payoutMatch?.[1] || "";

      // Send text message with download link
      const result = await sendWhatsAppPayslipLink(
        validatedData.phone,
        trainerName,
        monthYear,
        netPayout,
        downloadUrl
      );

      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: "Failed to send WhatsApp payslip link",
          error: result.error,
        });
      }

      // Log the message send
      const logEntry: WhatsAppMessageLog = {
        id: generateId(),
        recipientType: "individual",
        recipientName: validatedData.phone,
        phone: validatedData.phone,
        message: `[Payslip Link] ${validatedData.filename} — Download: ${downloadUrl}`,
        status: "sent",
        messageId: result.messageId,
        createdAt: new Date().toISOString(),
      };
      messageLog.unshift(logEntry);

      res.json({
        success: true,
        message: "Payslip link sent via WhatsApp",
        downloadUrl,
        messageId: result.messageId,
        log: logEntry,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ success: false, message: "Invalid request data", error: error.issues });
      }
      res.status(500).json({
        success: false,
        message: "Failed to send WhatsApp payslip link",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });
}
