import { type Express } from "express";
import { z } from "zod";
import { db } from "../db";
import * as schema from "@shared/schema";
import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { format } from "date-fns";

const createPaymentSchema = z.object({
  memberId: z.string().min(1),
  originalAmount: z.number().int().positive(),
  amount: z.number().int().positive(),
  discountPercentage: z.number().int().min(0).max(100).optional().default(0),
  method: z.enum(schema.paymentMethodEnum),
  // default: paid
  status: z.enum(schema.paymentStatusEnum).optional(),
  notes: z.string().optional(),
  receivedByUserId: z.string().optional().nullable(),
  // allow explicit paymentDate (e.g. backdated entry)
  paymentDate: z.string().optional(), // ISO string
  // Helps revenue categorization
  sourceType: z.enum(["membership", "renewal", "merchandise", "service", "other"]).optional(),
  description: z.string().optional(),
});

const listPaymentsQuerySchema = z.object({
  memberId: z.string().optional(),
  from: z.string().optional(), // yyyy-mm-dd
  to: z.string().optional(), // yyyy-mm-dd
  limit: z.coerce.number().int().min(1).max(500).optional().default(50),
});

/**
 * Payments routes
 *
 * Notes on current auth model:
 * - This app uses client-side localStorage auth for UI gating.
 * - There is no server-side session/role middleware for API routes yet.
 *
 * So these endpoints are "open" at the API layer, consistent with the current codebase.
 */
export function registerPaymentRoutes(app: Express) {
  // NOTE: Specific routes must come BEFORE parameterized routes like /:id
  // Otherwise /subscription-status and /member/:id will be matched as payment IDs

  // GET /api/payments/subscription-status
  // Returns all members with their subscription payment status
  app.get("/api/payments/subscription-status", async (req, res) => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const allMembers = await db.query.members.findMany({
        orderBy: [schema.members.createdAt],
      });

      // Get all payments for calculation
      const allPayments = await db.select().from(schema.payments);

      const subscriptionStatus = allMembers.map((member) => {
        const endDate = member.endDate ? new Date(member.endDate) : null;
        
        // Get payments for this member
        const memberPayments = allPayments.filter(p => p.memberId === member.id);
        const paidPayments = memberPayments.filter(p => p.status === 'paid');
        
        // Sort by payment date to get the most recent payment first
        const sortedPayments = [...paidPayments].sort((a, b) => 
          new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime()
        );
        
        // Calculate total paid from payments table
        const totalPaid = paidPayments.reduce((sum, p) => sum + p.amount, 0);
        
        // Use the most recent payment's original_amount as the base (current subscription price)
        // If no payments exist, fall back to member's totalDue
        const currentSubscriptionPrice = sortedPayments.length > 0 
          ? sortedPayments[0].originalAmount 
          : (member.totalDue || 0);
        
        // Get the most recent discount percentage
        const paymentDiscount = sortedPayments.length > 0 ? sortedPayments[0].discountPercentage : undefined;
        const discountPercentage = (paymentDiscount !== undefined && paymentDiscount >= 0)
          ? paymentDiscount
          : (member.discount || 0);
        
        // Calculate actual amount due after discount
        const totalDue = Math.round(currentSubscriptionPrice * (1 - discountPercentage / 100));
        const amountPaid = totalPaid > 0 ? totalPaid : (member.amountPaid || 0);
        const remaining = totalDue - amountPaid;
        
        const isOverdue = endDate && endDate < today && remaining > 0;

        let paymentStatus: "paid" | "pending" | "overdue";
        if (remaining <= 0) {
          paymentStatus = "paid";
        } else if (isOverdue) {
          paymentStatus = "overdue";
        } else {
          paymentStatus = "pending";
        }

        return {
          id: member.id,
          firstName: member.firstName,
          lastName: member.lastName,
          phone: member.phone,
          email: member.email,
          plan: member.plan,
          startDate: member.startDate,
          endDate: member.endDate,
          totalDue,
          originalTotalDue: currentSubscriptionPrice,
          discountPercentage,
          amountPaid,
          remaining: Math.max(0, remaining),
          paymentStatus,
          isActive: member.status === "Active",
        };
      });

      // Calculate totals
      const paid = subscriptionStatus.filter(s => s.paymentStatus === "paid").length;
      const pending = subscriptionStatus.filter(s => s.paymentStatus === "pending").length;
      const overdue = subscriptionStatus.filter(s => s.paymentStatus === "overdue").length;
      const totalRevenue = subscriptionStatus.reduce((sum, s) => sum + s.amountPaid, 0);

      res.json({
        members: subscriptionStatus,
        summary: {
          paid,
          pending,
          overdue,
          totalRevenue,
          totalMembers: subscriptionStatus.length,
        },
      });
    } catch (error) {
      console.error("Failed to get subscription status:", error);
      res.status(500).json({ error: "Failed to get subscription status" });
    }
  });

  // GET /api/payments/member/:memberId/history
  // Returns all payments for a specific member
  app.get("/api/payments/member/:memberId/history", async (req, res) => {
    try {
      const memberId = req.params.memberId;
      
      const member = await db.query.members.findFirst({
        where: eq(schema.members.id, memberId),
      });
      
      if (!member) {
        return res.status(404).json({ error: "Member not found" });
      }

      const payments = await db
        .select()
        .from(schema.payments)
        .where(eq(schema.payments.memberId, memberId))
        .orderBy(desc(schema.payments.paymentDate));

      res.json({
        member: {
          id: member.id,
          firstName: member.firstName,
          lastName: member.lastName,
          phone: member.phone,
          email: member.email,
          plan: member.plan,
        },
        payments,
      });
    } catch (error) {
      console.error("Failed to get member payment history:", error);
      res.status(500).json({ error: "Failed to get member payment history" });
    }
  });

  // GET /api/payments?memberId=&from=&to=&limit=
  app.get("/api/payments", async (req, res) => {
    try {
      const query = listPaymentsQuerySchema.parse(req.query);
      const conditions = [];

      if (query.memberId) {
        conditions.push(eq(schema.payments.memberId, query.memberId));
      }

      if (query.from) {
        // Treat from/to as day boundaries.
        conditions.push(gte(schema.payments.paymentDate, new Date(`${query.from}T00:00:00.000Z`)));
      }

      if (query.to) {
        conditions.push(lte(schema.payments.paymentDate, new Date(`${query.to}T23:59:59.999Z`)));
      }

      const payments = await db
        .select()
        .from(schema.payments)
        .where(conditions.length ? and(...conditions) : undefined)
        .orderBy(desc(schema.payments.paymentDate))
        .limit(query.limit);

      res.json(payments);
    } catch (error) {
      console.error("Failed to list payments:", error);
      res.status(500).json({ error: "Failed to list payments" });
    }
  });

  // GET /api/payments/:id
  app.get("/api/payments/:id", async (req, res) => {
    try {
      const id = req.params.id;
      const payment = await db.query.payments.findFirst({
        where: eq(schema.payments.id, id),
      });

      if (!payment) return res.status(404).json({ error: "Payment not found" });
      res.json(payment);
    } catch (error) {
      console.error("Failed to fetch payment:", error);
      res.status(500).json({ error: "Failed to fetch payment" });
    }
  });

  // POST /api/payments
  // Records a payment + updates member amountPaid + records revenue transaction
  app.post("/api/payments", async (req, res) => {
    try {
      const data = createPaymentSchema.parse(req.body);
      const status = data.status ?? "paid";
      const paymentDate = data.paymentDate ? new Date(data.paymentDate) : new Date();

      // Validate member exists
      const member = await db.query.members.findFirst({
        where: eq(schema.members.id, data.memberId),
      });
      if (!member) return res.status(404).json({ error: "Member not found" });

      const [createdPayment] = await db
        .insert(schema.payments)
        .values({
          memberId: data.memberId,
          originalAmount: data.originalAmount,
          amount: data.amount,
          discountPercentage: data.discountPercentage ?? 0,
          method: data.method,
          status,
          notes: data.notes,
          receivedByUserId: data.receivedByUserId ?? null,
          paymentDate,
        })
        .returning();

      // Only count paid payments toward member.amountPaid and revenue.
      if (status === "paid") {
        // Update member.amountPaid (backward compatible)
        // NOTE: This is simplistic. If you later allow edits/refunds, you should compute from payments.
        const newAmountPaid = (member.amountPaid || 0) + data.amount;
        await db
          .update(schema.members)
          .set({
            amountPaid: newAmountPaid,
            paymentMethod: data.method,
          })
          .where(eq(schema.members.id, data.memberId));

        // Record revenue (reuses existing revenue tables)
        const date = format(paymentDate, "yyyy-MM-dd");
        const sourceType = data.sourceType ?? "membership";
        const description =
          data.description ??
          `Payment received (${data.method}) for member ${member.firstName}${member.lastName ? " " + member.lastName : ""}`;

        await db.insert(schema.revenueTransactions).values({
          date,
          amount: data.amount,
          sourceType,
          sourceId: data.memberId,
          description,
        });

        // Update daily revenue summary (same logic as revenue routes, but inline to avoid circular imports)
        const transactions = await db.query.revenueTransactions.findMany({
          where: eq(schema.revenueTransactions.date, date),
        });

        const totalRevenue = transactions.reduce((sum: number, t) => sum + t.amount, 0);
        const membershipRevenue = transactions.filter(t => t.sourceType === 'membership').reduce((sum: number, t) => sum + t.amount, 0);
        const renewalRevenue = transactions.filter(t => t.sourceType === 'renewal').reduce((sum: number, t) => sum + t.amount, 0);
        const merchandiseRevenue = transactions.filter(t => t.sourceType === 'merchandise').reduce((sum: number, t) => sum + t.amount, 0);
        const serviceRevenue = transactions.filter(t => t.sourceType === 'service').reduce((sum: number, t) => sum + t.amount, 0);
        const otherRevenue = transactions.filter(t => t.sourceType === 'other').reduce((sum: number, t) => sum + t.amount, 0);

        await db
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
              updatedAt: sql`now()`,
            },
          });
      }

      res.status(201).json(createdPayment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.issues.map(i => i.message).join(", ") });
      }
      console.error("Failed to create payment:", error);
      res.status(500).json({ error: "Failed to create payment" });
    }
  });
}
