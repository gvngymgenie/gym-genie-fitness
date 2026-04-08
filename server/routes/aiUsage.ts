import express, { Express } from "express";
import { db } from "../db";
import * as schema from "@shared/schema";
import { eq, desc, sql } from "drizzle-orm";

export function registerAiUsageRoutes(app: Express) {
  // Get all members with AI usage summary (for the table)
  app.get("/api/ai-usage/members", async (req, res) => {
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));
      const offset = (page - 1) * limit;

      // Get total count for pagination
      const [countResult] = await db
        .select({ count: sql`count(*)` })
        .from(schema.members);
      const total = Number(countResult?.count || 0);

      // Get paginated members with their credit balance
      const members = await db.query.members.findMany({
        orderBy: [desc(schema.members.createdAt)],
        limit,
        offset,
      });

      // Get credit balances for all members
      const creditRecords = await db.query.memberCredits.findMany();
      const creditMap = new Map(creditRecords.map(c => [c.memberId, c.balance]));

      // Combine member data with credit balance
      const result = members.map(member => {
        const balance = creditMap.get(member.id) ?? 5;
        return {
          id: member.id,
          memberId: member.id,
          memberName: `${member.firstName} ${member.lastName || ''}`.trim(),
          memberEmail: member.email || '',
          memberAvatar: member.avatar || member.avatarStaticUrl,
          totalWorkoutGenerations: 0,
          totalDietGenerations: 0,
          totalCreditsUsed: 0,
          creditBalance: balance,
          lastUsageAt: member.createdAt?.toISOString().split('T')[0] || '',
        };
      });

      res.json({
        data: result,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error("Failed to fetch member AI usage:", error);
      res.status(500).json({ error: "Failed to fetch member AI usage" });
    }
  });

  // Get member AI usage history (for modal)
  app.get("/api/ai-usage/members/:memberId/history", async (req, res) => {
    try {
      const memberId = req.params.memberId;
      
      const member = await db.query.members.findFirst({
        where: eq(schema.members.id, memberId),
      });

      if (!member) {
        return res.status(404).json({ error: "Member not found" });
      }

      const credits = await db.query.memberCredits.findFirst({
        where: eq(schema.memberCredits.memberId, memberId),
      });

      res.json({
        member: {
          id: member.id,
          name: `${member.firstName} ${member.lastName || ''}`.trim(),
          email: member.email,
        },
        balance: credits?.balance ?? 5,
        requests: [],
      });
    } catch (error) {
      console.error("Failed to fetch member AI history:", error);
      res.status(500).json({ error: "Failed to fetch member AI history" });
    }
  });

  // Get all staff/admin AI usage
  app.get("/api/ai-usage/admins", async (req, res) => {
    try {
      const users = await db.query.users.findMany({
        where: sql`${schema.users.role} IN ('admin', 'manager', 'trainer')`,
        orderBy: [desc(schema.users.createdAt)],
      });

      const result = users.map(user => ({
        id: user.id,
        adminId: user.id,
        adminName: `${user.firstName} ${user.lastName || ''}`.trim(),
        adminEmail: user.email || '',
        featureType: 'workout_generation',
        actionDescription: 'Sample action',
        creditsUsed: 0,
        success: true,
        createdAt: new Date().toISOString(),
      }));

      res.json(result);
    } catch (error) {
      console.error("Failed to fetch admin AI usage:", error);
      res.status(500).json({ error: "Failed to fetch admin AI usage" });
    }
  });

  // Record admin AI usage
  app.post("/api/ai-usage/admins", async (req, res) => {
    try {
      const { adminId, adminName, adminEmail, featureType, actionDescription, creditsUsed, success, errorMessage } = req.body;

      const [record] = await db.insert(schema.adminAiUsage).values({
        adminId,
        adminName,
        adminEmail,
        featureType,
        actionDescription,
        creditsUsed: creditsUsed || 0,
        success: success ?? true,
        errorMessage,
      }).returning();

      res.json(record);
    } catch (error) {
      console.error("Failed to record admin AI usage:", error);
      res.status(500).json({ error: "Failed to record admin AI usage" });
    }
  });

  // Get AI usage dashboard stats (optimized with COUNT queries)
  app.get("/api/ai-usage/stats", async (req, res) => {
    try {
      // Use SQL COUNT for efficient counting instead of fetching all records
      const [totalCreditsResult] = await db
        .select({ sum: sql`COALESCE(SUM(${schema.memberCredits.balance}), 0)` })
        .from(schema.memberCredits);

      const [memberCountResult] = await db
        .select({ count: sql`count(*)` })
        .from(schema.members);

      const [staffCountResult] = await db
        .select({ count: sql`count(*)` })
        .from(schema.users)
        .where(sql`${schema.users.role} IN ('admin', 'manager', 'trainer')`);

      const [activeUsersResult] = await db
        .select({ count: sql`count(*)` })
        .from(schema.memberCredits)
        .where(sql`${schema.memberCredits.balance} > 0`);

      res.json({
        totalCredits: Number(totalCreditsResult?.sum || 0),
        memberCount: Number(memberCountResult?.count || 0),
        staffCount: Number(staffCountResult?.count || 0),
        activeUsers: Number(activeUsersResult?.count || 0),
      });
    } catch (error) {
      console.error("Failed to fetch AI usage stats:", error);
      res.status(500).json({ error: "Failed to fetch AI usage stats" });
    }
  });
}