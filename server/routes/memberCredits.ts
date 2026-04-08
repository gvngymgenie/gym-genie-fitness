import express, { Express } from "express";
import { db } from "../db";
import * as schema from "@shared/schema";
import { eq, desc } from "drizzle-orm";

export function registerMemberCreditsRoutes(app: Express) {
  // Seed credit packages on startup (run once)
  const seedCreditPackages = async () => {
    try {
      const existing = await db.query.creditPackages.findMany();
      if (existing.length === 0) {
        await db.insert(schema.creditPackages).values([
          { id: "cp-5credits", name: "Starter Pack", credits: 5, price: 99, description: "5 AI credits for workout and diet plans", isActive: true, sortOrder: 1 },
          { id: "cp-10credits", name: "Standard Pack", credits: 10, price: 179, description: "10 AI credits - save 10%", isActive: true, sortOrder: 2 },
          { id: "cp-25credits", name: "Premium Pack", credits: 25, price: 399, description: "25 AI credits - save 20%", isActive: true, sortOrder: 3 },
        ]);
        console.log("Credit packages seeded successfully");
      }
    } catch (error) {
      console.error("Failed to seed credit packages:", error);
    }
  };
  seedCreditPackages();

  // Get member credits by member ID
  app.get("/api/member-credits/:memberId", async (req, res) => {
    try {
      const memberId = req.params.memberId;
      
      const credits = await db.query.memberCredits.findFirst({
        where: eq(schema.memberCredits.memberId, memberId),
      });
      
      if (!credits) {
        // Return a default structure if no credits record exists
        return res.json({
          memberId,
          balance: 5,
          totalCreditsUsed: 0,
          lastResetAt: new Date().toISOString(),
        });
      }
      
      res.json(credits);
    } catch (error) {
      console.error("Failed to fetch member credits:", error);
      res.status(500).json({ error: "Failed to fetch member credits" });
    }
  });

  // Update member credits (add or reset)
  app.patch("/api/member-credits/:memberId", async (req, res) => {
    try {
      const memberId = req.params.memberId;
      const { balance, addCredits } = req.body;
      
      // Check if credits record exists
      const existing = await db.query.memberCredits.findFirst({
        where: eq(schema.memberCredits.memberId, memberId),
      });
      
      if (existing) {
        // Update existing record
        const newBalance = addCredits !== undefined 
          ? existing.balance + addCredits 
          : (balance !== undefined ? balance : existing.balance);
        
        const [updated] = await db
          .update(schema.memberCredits)
          .set({
            balance: newBalance,
            totalCreditsUsed: addCredits 
              ? existing.totalCreditsUsed + addCredits 
              : existing.totalCreditsUsed,
            updatedAt: new Date(),
          })
          .where(eq(schema.memberCredits.memberId, memberId))
          .returning();
        
        return res.json(updated);
      } else {
        // Create new record
        const newBalance = balance !== undefined ? balance : 5;
        
        const [created] = await db
          .insert(schema.memberCredits)
          .values({
            memberId,
            balance: newBalance,
            totalCreditsUsed: 0,
            lastResetAt: new Date(),
          })
          .returning();
        
        return res.json(created);
      }
    } catch (error) {
      console.error("Failed to update member credits:", error);
      res.status(500).json({ error: "Failed to update member credits" });
    }
  });

  // Deduct credits (called when member uses AI feature)
  app.post("/api/member-credits/:memberId/deduct", async (req, res) => {
    try {
      const memberId = req.params.memberId;
      const { credits } = req.body;
      
      if (!credits || credits <= 0) {
        return res.status(400).json({ error: "Invalid credits amount" });
      }
      
      const existing = await db.query.memberCredits.findFirst({
        where: eq(schema.memberCredits.memberId, memberId),
      });
      
      if (!existing) {
        return res.status(404).json({ error: "Member credits not found" });
      }
      
      if (existing.balance < credits) {
        return res.status(400).json({ 
          error: "Insufficient credits",
          balance: existing.balance,
          requested: credits 
        });
      }
      
      const [updated] = await db
        .update(schema.memberCredits)
        .set({
          balance: existing.balance - credits,
          totalCreditsUsed: existing.totalCreditsUsed + credits,
          updatedAt: new Date(),
        })
        .where(eq(schema.memberCredits.memberId, memberId))
        .returning();
      
      res.json(updated);
    } catch (error) {
      console.error("Failed to deduct member credits:", error);
      res.status(500).json({ error: "Failed to deduct credits" });
    }
  });

  // Reset member credits
  app.post("/api/member-credits/:memberId/reset", async (req, res) => {
    try {
      const memberId = req.params.memberId;
      const { newBalance = 5 } = req.body;
      
      const existing = await db.query.memberCredits.findFirst({
        where: eq(schema.memberCredits.memberId, memberId),
      });
      
      if (existing) {
        const [updated] = await db
          .update(schema.memberCredits)
          .set({
            balance: newBalance,
            lastResetAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(schema.memberCredits.memberId, memberId))
          .returning();
        
        return res.json(updated);
      } else {
        const [created] = await db
          .insert(schema.memberCredits)
          .values({
            memberId,
            balance: newBalance,
            totalCreditsUsed: 0,
            lastResetAt: new Date(),
          })
          .returning();
        
        return res.json(created);
      }
    } catch (error) {
      console.error("Failed to reset member credits:", error);
      res.status(500).json({ error: "Failed to reset credits" });
    }
  });

  // Get available credit packages
  app.get("/api/credit-packages", async (req, res) => {
    try {
      const packages = await db.query.creditPackages.findMany({
        where: eq(schema.creditPackages.isActive, true),
        orderBy: [schema.creditPackages.sortOrder],
      });
      res.json(packages);
    } catch (error) {
      console.error("Failed to fetch credit packages:", error);
      res.status(500).json({ error: "Failed to fetch credit packages" });
    }
  });

  // Get member credit transactions (history)
  app.get("/api/member-credits/:memberId/transactions", async (req, res) => {
    try {
      const memberId = req.params.memberId;
      const transactions = await db.query.creditTransactions.findMany({
        where: eq(schema.creditTransactions.memberId, memberId),
        orderBy: [desc(schema.creditTransactions.createdAt)],
        limit: 50,
      });
      res.json(transactions);
    } catch (error) {
      console.error("Failed to fetch credit transactions:", error);
      res.status(500).json({ error: "Failed to fetch credit transactions" });
    }
  });

  // Topup credits (add credits to member balance)
  app.post("/api/member-credits/:memberId/topup", async (req, res) => {
    try {
      const memberId = req.params.memberId;
      const { credits, packageId, amount } = req.body;

      if (!credits || credits <= 0) {
        return res.status(400).json({ error: "Invalid credits amount" });
      }

      // Get existing credits or create new record
      let existing = await db.query.memberCredits.findFirst({
        where: eq(schema.memberCredits.memberId, memberId),
      });

      let newBalance: number;
      let updated: any;

      if (existing) {
        newBalance = existing.balance + credits;
        [updated] = await db
          .update(schema.memberCredits)
          .set({
            balance: newBalance,
            totalCreditsUsed: Math.max(0, existing.totalCreditsUsed - credits), // Reduce used when adding credits
            updatedAt: new Date(),
          })
          .where(eq(schema.memberCredits.memberId, memberId))
          .returning();
      } else {
        newBalance = credits;
        [updated] = await db
          .insert(schema.memberCredits)
          .values({
            memberId,
            balance: newBalance,
            totalCreditsUsed: 0,
            lastResetAt: new Date(),
          })
          .returning();
      }

      // Log transaction
      await db.insert(schema.creditTransactions).values({
        memberId,
        type: "topup",
        amount: credits,
        balanceAfter: newBalance,
        description: `Topup: ${credits} credits${packageId ? ` (Package: ${packageId})` : ''}${amount ? ` - Paid: ₹${amount}` : ''}`,
        referenceId: packageId,
      });

      res.json(updated);
    } catch (error) {
      console.error("Failed to topup credits:", error);
      res.status(500).json({ error: "Failed to topup credits" });
    }
  });

  // Reset credits to 0
  app.post("/api/member-credits/:memberId/reset-balance", async (req, res) => {
    try {
      const memberId = req.params.memberId;
      const { reason } = req.body;

      const existing = await db.query.memberCredits.findFirst({
        where: eq(schema.memberCredits.memberId, memberId),
      });

      if (!existing) {
        return res.status(404).json({ error: "Member credits not found" });
      }

      const currentBalance = existing.balance;

      // Reset to 0
      const [updated] = await db
        .update(schema.memberCredits)
        .set({
          balance: 0,
          lastResetAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(schema.memberCredits.memberId, memberId))
        .returning();

      // Log transaction
      await db.insert(schema.creditTransactions).values({
        memberId,
        type: "reset",
        amount: -currentBalance,
        balanceAfter: 0,
        description: reason || `Reset: ${currentBalance} credits removed`,
      });

      res.json(updated);
    } catch (error) {
      console.error("Failed to reset credits:", error);
      res.status(500).json({ error: "Failed to reset credits" });
    }
  });

  // Get credits for all members (for list display)
  app.get("/api/members/credits", async (req, res) => {
    try {
      console.log("[DEBUG] /api/members/credits called");
      const allCredits = await db.query.memberCredits.findMany();
      console.log("[DEBUG] Found credit records:", allCredits);
      res.json(allCredits);
    } catch (error) {
      console.error("[DEBUG] Failed to fetch member credits:", error);
      res.status(500).json({ error: "Failed to fetch member credits" });
    }
  });
}