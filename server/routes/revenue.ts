import { type Express } from "express";
import { db } from "../db";
import * as schema from "@shared/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import { format, startOfDay, endOfDay, startOfMonth, endOfMonth, subDays, subMonths, addDays } from "date-fns";

export function registerRevenueRoutes(app: Express) {
  // GET /api/revenue/today - Get today's revenue
  app.get("/api/revenue/today", async (req, res) => {
    try {
      const today = format(new Date(), "yyyy-MM-dd");
      
      const todayRevenue = await db.query.revenueSummary.findFirst({
        where: eq(schema.revenueSummary.date, today),
      });

      if (todayRevenue) {
        res.json({
          date: today,
          totalRevenue: todayRevenue.totalRevenue,
          breakdown: {
            membership: todayRevenue.membershipRevenue,
            renewal: todayRevenue.renewalRevenue,
            merchandise: todayRevenue.merchandiseRevenue,
            service: todayRevenue.serviceRevenue,
            other: todayRevenue.otherRevenue,
          },
        });
      } else {
        // If no summary exists, calculate from transactions
        const transactions = await db.query.revenueTransactions.findMany({
          where: eq(schema.revenueTransactions.date, today),
        });

        const totalRevenue = transactions.reduce((sum: number, t) => sum + t.amount, 0);
        const breakdown = {
          membership: transactions.filter(t => t.sourceType === 'membership').reduce((sum: number, t) => sum + t.amount, 0),
          renewal: transactions.filter(t => t.sourceType === 'renewal').reduce((sum: number, t) => sum + t.amount, 0),
          merchandise: transactions.filter(t => t.sourceType === 'merchandise').reduce((sum: number, t) => sum + t.amount, 0),
          service: transactions.filter(t => t.sourceType === 'service').reduce((sum: number, t) => sum + t.amount, 0),
          other: transactions.filter(t => t.sourceType === 'other').reduce((sum: number, t) => sum + t.amount, 0),
        };

        res.json({
          date: today,
          totalRevenue,
          breakdown,
        });
      }
    } catch (error) {
      console.error("Error fetching today's revenue:", error);
      res.status(500).json({ error: "Failed to fetch today's revenue" });
    }
  });

  // GET /api/revenue/daily - Get daily revenue trends
  app.get("/api/revenue/daily", async (req, res) => {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const endDate = new Date();
      const startDate = subDays(endDate, days - 1);
      
      const start = format(startOfDay(startDate), "yyyy-MM-dd");
      const end = format(endOfDay(endDate), "yyyy-MM-dd");

      const dailyData = await db.query.revenueSummary.findMany({
        where: and(
          gte(schema.revenueSummary.date, start),
          lte(schema.revenueSummary.date, end)
        ),
        orderBy: schema.revenueSummary.date,
      });

      // Fill in missing dates with zero revenue
      const result = [];
      let currentDate = new Date(start);
      
      while (currentDate <= endDate) {
        const dateStr = format(currentDate, "yyyy-MM-dd");
        const existing = dailyData.find((d: any) => d.date === dateStr);
        
        if (existing) {
          result.push({
            date: dateStr,
            totalRevenue: existing.totalRevenue,
            breakdown: {
              membership: existing.membershipRevenue,
              renewal: existing.renewalRevenue,
              merchandise: existing.merchandiseRevenue,
              service: existing.serviceRevenue,
              other: existing.otherRevenue,
            },
          });
        } else {
          result.push({
            date: dateStr,
            totalRevenue: 0,
            breakdown: {
              membership: 0,
              renewal: 0,
              merchandise: 0,
              service: 0,
              other: 0,
            },
          });
        }
        
        currentDate = addDays(currentDate, 1);
      }

      res.json(result);
    } catch (error) {
      console.error("Error fetching daily revenue:", error);
      res.status(500).json({ error: "Failed to fetch daily revenue" });
    }
  });

  // GET /api/revenue/streams - Get revenue breakdown by source
  app.get("/api/revenue/streams", async (req, res) => {
    try {
      const period = req.query.period as string || 'month';
      let startDate: string;
      let endDate: string;

      if (period === 'month') {
        startDate = format(startOfMonth(new Date()), "yyyy-MM-dd");
        endDate = format(endOfMonth(new Date()), "yyyy-MM-dd");
      } else if (period === 'week') {
        startDate = format(startOfDay(subDays(new Date(), 6)), "yyyy-MM-dd");
        endDate = format(endOfDay(new Date()), "yyyy-MM-dd");
      } else {
        startDate = format(subMonths(new Date(), 1), "yyyy-MM-dd");
        endDate = format(new Date(), "yyyy-MM-dd");
      }

      const streams = await db.query.revenueSummary.findMany({
        where: and(
          gte(schema.revenueSummary.date, startDate),
          lte(schema.revenueSummary.date, endDate)
        ),
      });

      const totals = streams.reduce((acc: any, day: any) => ({
        membership: acc.membership + day.membershipRevenue,
        renewal: acc.renewal + day.renewalRevenue,
        merchandise: acc.merchandise + day.merchandiseRevenue,
        service: acc.service + day.serviceRevenue,
        other: acc.other + day.otherRevenue,
      }), { membership: 0, renewal: 0, merchandise: 0, service: 0, other: 0 });

      const totalRevenue = Object.values(totals).reduce((sum: number, val: number) => sum + val, 0);

      res.json({
        period,
        totalRevenue,
        breakdown: [
          { name: "Membership", value: totals.membership, percentage: totalRevenue > 0 ? (totals.membership / totalRevenue) * 100 : 0 },
          { name: "Renewal", value: totals.renewal, percentage: totalRevenue > 0 ? (totals.renewal / totalRevenue) * 100 : 0 },
          { name: "Merchandise", value: totals.merchandise, percentage: totalRevenue > 0 ? (totals.merchandise / totalRevenue) * 100 : 0 },
          { name: "Service", value: totals.service, percentage: totalRevenue > 0 ? (totals.service / totalRevenue) * 100 : 0 },
          { name: "Other", value: totals.other, percentage: totalRevenue > 0 ? (totals.other / totalRevenue) * 100 : 0 },
        ],
      });
    } catch (error) {
      console.error("Error fetching revenue streams:", error);
      res.status(500).json({ error: "Failed to fetch revenue streams" });
    }
  });

  // GET /api/revenue/monthly - Get monthly revenue trends
  app.get("/api/revenue/monthly", async (req, res) => {
    try {
      const months = parseInt(req.query.months as string) || 12;
      const endDate = new Date();
      const startDate = subMonths(endDate, months - 1);

      const start = format(startOfMonth(startDate), "yyyy-MM-dd");
      const end = format(endOfMonth(endDate), "yyyy-MM-dd");

      const monthlyData = await db.query.revenueSummary.findMany({
        where: and(
          gte(schema.revenueSummary.date, start),
          lte(schema.revenueSummary.date, end)
        ),
      });

      // Group by month
      const monthlyTotals: Record<string, number> = {};
      const monthlyBreakdown: Record<string, any> = {};

      monthlyData.forEach((day: any) => {
        const month = day.date.substring(0, 7); // "YYYY-MM"
        monthlyTotals[month] = (monthlyTotals[month] || 0) + day.totalRevenue;
        
        if (!monthlyBreakdown[month]) {
          monthlyBreakdown[month] = {
            membership: 0,
            renewal: 0,
            merchandise: 0,
            service: 0,
            other: 0,
          };
        }
        
        monthlyBreakdown[month].membership += day.membershipRevenue;
        monthlyBreakdown[month].renewal += day.renewalRevenue;
        monthlyBreakdown[month].merchandise += day.merchandiseRevenue;
        monthlyBreakdown[month].service += day.serviceRevenue;
        monthlyBreakdown[month].other += day.otherRevenue;
      });

      const result = Object.keys(monthlyTotals).map(month => ({
        name: month,
        total: monthlyTotals[month],
        breakdown: monthlyBreakdown[month],
      })).sort((a, b) => a.name.localeCompare(b.name));

      res.json(result);
    } catch (error) {
      console.error("Error fetching monthly revenue:", error);
      res.status(500).json({ error: "Failed to fetch monthly revenue" });
    }
  });

  // POST /api/revenue/record - Manually record revenue (for cash payments, etc.)
  app.post("/api/revenue/record", async (req, res) => {
    try {
      const { amount, sourceType, sourceId, description } = req.body;
      
      if (!amount || !sourceType) {
        return res.status(400).json({ error: "Amount and source type are required" });
      }

      const date = format(new Date(), "yyyy-MM-dd");
      
      const [transaction] = await db.insert(schema.revenueTransactions).values({
        date,
        amount,
        sourceType,
        sourceId,
        description: description || `${sourceType} revenue`,
      }).returning();

      // Update daily summary
      await updateDailyRevenueSummary(date);

      res.status(201).json({
        message: "Revenue recorded successfully",
        transaction,
      });
    } catch (error) {
      console.error("Error recording revenue:", error);
      res.status(500).json({ error: "Failed to record revenue" });
    }
  });

  // Helper function to update daily revenue summary
  async function updateDailyRevenueSummary(date: string) {
    try {
      const transactions = await db.query.revenueTransactions.findMany({
        where: eq(schema.revenueTransactions.date, date),
      });

      const totalRevenue = transactions.reduce((sum: number, t) => sum + t.amount, 0);
      const membershipRevenue = transactions.filter(t => t.sourceType === 'membership').reduce((sum: number, t) => sum + t.amount, 0);
      const renewalRevenue = transactions.filter(t => t.sourceType === 'renewal').reduce((sum: number, t) => sum + t.amount, 0);
      const merchandiseRevenue = transactions.filter(t => t.sourceType === 'merchandise').reduce((sum: number, t) => sum + t.amount, 0);
      const serviceRevenue = transactions.filter(t => t.sourceType === 'service').reduce((sum: number, t) => sum + t.amount, 0);
      const otherRevenue = transactions.filter(t => t.sourceType === 'other').reduce((sum: number, t) => sum + t.amount, 0);

      const [summary] = await db
        .insert(schema.revenueSummary)
        .values({
          date,
          totalRevenue,
          membershipRevenue,
          renewalRevenue,
          merchandiseRevenue,
          serviceRevenue,
          otherRevenue,
        })
        .onConflictDoUpdate({
          target: schema.revenueSummary.date,
          set: {
            totalRevenue,
            membershipRevenue,
            renewalRevenue,
            merchandiseRevenue,
            serviceRevenue,
            otherRevenue,
            updatedAt: new Date(),
          },
        })
        .returning();

      return summary;
    } catch (error) {
      console.error("Error updating daily revenue summary:", error);
      throw error;
    }
  }
}