import { Express } from "express";
import { storage } from "../storage";
import { PayslipStorage } from "../utils/payslipStorage";
import { z } from "zod";

function getDaysInMonth(month: number, year: number): number {
  return new Date(year, month, 0).getDate();
}

function formatCurrency(cents: number): string {
  return (cents / 100).toFixed(2);
}

export function registerSalaryRoutes(app: Express) {
  // Get salary config for a trainer
  app.get("/api/salary/config/:trainerId", async (req, res) => {
    try {
      const config = await storage.getSalaryConfig(req.params.trainerId);
      if (!config) {
        return res.json(null);
      }
      res.json(config);
    } catch (error) {
      console.error("Failed to fetch salary config:", error);
      res.status(500).json({ error: "Failed to fetch salary config" });
    }
  });

  // Create or update salary config (upsert)
  app.post("/api/salary/config/:trainerId", async (req, res) => {
    try {
      const configData = {
        trainerId: req.params.trainerId,
        baseSalary: req.body.baseSalary ?? 0,
        perSessionRate: req.body.perSessionRate ?? 0,
        attendanceBonusPerDay: req.body.attendanceBonusPerDay ?? 0,
        attendanceBonusThreshold: req.body.attendanceBonusThreshold ?? 20,
        reviewBonusMinRating: req.body.reviewBonusMinRating ?? 4,
        reviewBonusAmount: req.body.reviewBonusAmount ?? 0,
      };

      const config = await storage.upsertSalaryConfig(req.params.trainerId, configData as any);
      res.status(201).json(config);
    } catch (error) {
      console.error("Failed to save salary config:", error);
      res.status(500).json({ error: "Failed to save salary config" });
    }
  });

  // Update salary config by id
  app.patch("/api/salary/config/:id", async (req, res) => {
    try {
      const config = await storage.updateSalaryConfig(req.params.id, req.body as any);
      if (!config) {
        return res.status(404).json({ error: "Salary config not found" });
      }
      res.json(config);
    } catch (error) {
      console.error("Failed to update salary config:", error);
      res.status(500).json({ error: "Failed to update salary config" });
    }
  });

  // Calculate payout preview for a trainer + month
  app.get("/api/salary/calculate/:trainerId", async (req, res) => {
    try {
      const month = parseInt(req.query.month as string);
      const year = parseInt(req.query.year as string);

      if (!month || !year || month < 1 || month > 12) {
        return res.status(400).json({ error: "Valid month (1-12) and year are required" });
      }

      const trainerId = req.params.trainerId;

      // Get salary config (use defaults if not set)
      const config = await storage.getSalaryConfig(trainerId);
      const baseSalary = config?.baseSalary ?? 0;
      const perSessionRate = config?.perSessionRate ?? 0;
      const attendanceBonusPerDay = config?.attendanceBonusPerDay ?? 0;
      const attendanceBonusThreshold = config?.attendanceBonusThreshold ?? 20;
      const reviewBonusMinRating = config?.reviewBonusMinRating ?? 4;
      const reviewBonusAmount = config?.reviewBonusAmount ?? 0;

      // Count attendance days for the month
      const daysInMonth = getDaysInMonth(month, year);
      const allAttendance = await storage.getStaffAttendanceByPerson(trainerId);
      const monthAttendance = allAttendance.filter(r => {
        const recordDate = new Date(r.date);
        return recordDate.getMonth() + 1 === month && recordDate.getFullYear() === year;
      });
      const attendanceDays = monthAttendance.length;

      // Count completed coaching sessions for the month
      const bookings = await storage.getTrainerBookingsByMonth(trainerId, month, year);
      const sessionCount = bookings.length;

      // Get feedback ratings for the month
      const feedbacks = await storage.getTrainerFeedbackByMonth(trainerId, month, year);
      const reviewAvgRating = feedbacks.length > 0
        ? Math.round((feedbacks.reduce((sum, f) => sum + f.rating, 0) / feedbacks.length) * 100)
        : 0;

      // Calculate bonuses
      const attendanceBonus = (attendanceDays >= attendanceBonusThreshold && attendanceDays > 0)
        ? attendanceDays * attendanceBonusPerDay
        : 0;

      const sessionBonus = sessionCount * perSessionRate;

      const reviewBonus = (reviewAvgRating > 0 && reviewAvgRating >= reviewBonusMinRating)
        ? reviewBonusAmount
        : 0;

      const grossPay = baseSalary + attendanceBonus + sessionBonus + reviewBonus;
      const deductions = 0;
      const netPay = grossPay - deductions;

      res.json({
        trainerId,
        month,
        year,
        config: {
          baseSalary,
          perSessionRate,
          attendanceBonusPerDay,
          attendanceBonusThreshold,
          reviewBonusMinRating,
          reviewBonusAmount,
        },
        breakdown: {
          baseSalary,
          attendanceDays,
          attendanceBonus,
          sessionCount,
          sessionBonus,
          reviewAvgRating,
          reviewBonus,
          grossPay,
          deductions,
          netPay,
        },
        formatted: {
          baseSalary: formatCurrency(baseSalary),
          attendanceBonus: formatCurrency(attendanceBonus),
          sessionBonus: formatCurrency(sessionBonus),
          reviewBonus: formatCurrency(reviewBonus),
          grossPay: formatCurrency(grossPay),
          netPay: formatCurrency(netPay),
        },
      });
    } catch (error) {
      console.error("Failed to calculate payout:", error);
      res.status(500).json({ error: "Failed to calculate payout" });
    }
  });

   // Create a payout record
   app.post("/api/salary/payout", async (req, res) => {
     try {
       const {
         trainerId,
         month,
         year,
         baseSalary,
         attendanceDays,
         attendanceBonus,
         sessionCount,
         sessionBonus,
         reviewAvgRating,
         reviewBonus,
         grossPay,
         deductions,
         netPay,
         notes,
       } = req.body;

      // Check if payout already exists
      const existing = await storage.getPayoutByMonth(trainerId, month, year);
      if (existing) {
        return res.status(409).json({ error: `Payout already exists for ${month}/${year}` });
      }

      const payout = await storage.createPayout({
        trainerId,
        month,
        year,
        baseSalary: baseSalary ?? 0,
        attendanceDays: attendanceDays ?? 0,
        attendanceBonus: attendanceBonus ?? 0,
        sessionCount: sessionCount ?? 0,
        sessionBonus: sessionBonus ?? 0,
        reviewAvgRating: reviewAvgRating ?? 0,
        reviewBonus: reviewBonus ?? 0,
        grossPay: grossPay ?? 0,
        deductions: deductions ?? 0,
        netPay: netPay ?? 0,
        notes: notes || null,
      } as any);

      // Create line items
      if (baseSalary > 0) {
        await storage.createPayoutLineItem({
          payoutId: payout.id,
          type: "base_salary",
          description: `Base salary for ${month}/${year}`,
          amount: baseSalary,
        } as any);
      }
      if (attendanceBonus > 0) {
        await storage.createPayoutLineItem({
          payoutId: payout.id,
          type: "attendance",
          description: `${attendanceDays} attendance days × attendance bonus`,
          amount: attendanceBonus,
        } as any);
      }
       if (sessionBonus > 0) {
         await storage.createPayoutLineItem({
           payoutId: payout.id,
           type: "session",
           description: `${sessionCount} sessions completed`,
           amount: sessionBonus,
         } as any);
       }
      if (reviewBonus > 0) {
        await storage.createPayoutLineItem({
          payoutId: payout.id,
          type: "review_bonus",
          description: `Review bonus (avg rating: ${(reviewAvgRating / 100).toFixed(2)})`,
          amount: reviewBonus,
        } as any);
      }

      res.status(201).json(payout);
    } catch (error) {
      console.error("Failed to create payout:", error);
      res.status(500).json({ error: "Failed to create payout" });
    }
  });

  // Get payout by ID with line items
  app.get("/api/salary/payout/:id", async (req, res) => {
    try {
      // We need a getPayoutById method in storage
      // For now, use getAllPayouts and filter
      const payouts = await storage.getAllPayouts({});
      const payout = payouts.find(p => p.id === req.params.id);
      if (!payout) {
        return res.status(404).json({ error: "Payout not found" });
      }
      const lineItems = await storage.getPayoutLineItems(payout.id);
      res.json({ ...payout, lineItems });
    } catch (error) {
      console.error("Failed to fetch payout:", error);
      res.status(500).json({ error: "Failed to fetch payout" });
    }
  });

  // List payouts with optional filters
  app.get("/api/salary/payouts", async (req, res) => {
    try {
      const trainerId = req.query.trainerId as string | undefined;
      const month = req.query.month ? parseInt(req.query.month as string) : undefined;
      const year = req.query.year ? parseInt(req.query.year as string) : undefined;

      const payouts = await storage.getAllPayouts({ trainerId, month, year });
      res.json(payouts);
    } catch (error) {
      console.error("Failed to fetch payouts:", error);
      res.status(500).json({ error: "Failed to fetch payouts" });
    }
  });

  // Update payout status (approve / mark paid)
  app.patch("/api/salary/payout/:id/status", async (req, res) => {
    try {
      const { status, payDate, notes, deductions } = req.body;

      if (!["draft", "approved", "paid"].includes(status)) {
        return res.status(400).json({ error: "Status must be draft, approved, or paid" });
      }

      // Get existing payout
      const payouts = await storage.getAllPayouts({});
      const existing = payouts.find(p => p.id === req.params.id);
      if (!existing) {
        return res.status(404).json({ error: "Payout not found" });
      }

      const updateData: any = { status };
      if (payDate) updateData.payDate = payDate;
      if (notes !== undefined) updateData.notes = notes;
      if (deductions !== undefined) updateData.deductions = deductions;

      // Recalculate net pay if deductions changed
      if (deductions !== undefined) {
        updateData.netPay = existing.grossPay - deductions;
      }

      const updated = await storage.updatePayout(req.params.id, updateData);
      if (!updated) {
        return res.status(404).json({ error: "Payout not found" });
      }

      res.json(updated);
    } catch (error) {
      console.error("Failed to update payout status:", error);
      res.status(500).json({ error: "Failed to update payout status" });
    }
  });

  // Delete payout
  app.delete("/api/salary/payout/:id", async (req, res) => {
    try {
      const payout = await storage.getPayout(req.params.id);
      if (!payout) {
        return res.status(404).json({ error: "Payout not found" });
      }

      // Delete line items first
      await storage.deletePayoutLineItems(req.params.id);

      // Delete the payout
      const deleted = await storage.deletePayout(req.params.id);
      if (!deleted) {
        return res.status(500).json({ error: "Failed to delete payout" });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Failed to delete payout:", error);
      res.status(500).json({ error: "Failed to delete payout" });
    }
  });

  // Upload a payslip PDF to Supabase Storage (no payoutId needed — used for preview)
  const payslipUploadSchema = z.object({
    trainerId: z.string(),
    month: z.number(),
    year: z.number(),
    base64Data: z.string().min(1, "PDF data is required"),
    filename: z.string(),
  });

  app.post("/api/payslips/upload", async (req, res) => {
    try {
      const { trainerId, month, year, base64Data, filename } = payslipUploadSchema.parse(req.body);

      // Clean base64 (strip data: URI prefix if present)
      const cleanBase64 = base64Data.includes(",")
        ? base64Data.split(",").pop()!
        : base64Data;

      // Upload to Supabase with trainerId folder
      const downloadUrl = await PayslipStorage.uploadPayslip(
        cleanBase64,
        filename,
        trainerId
      );

      // If a payout record already exists for this month, persist the URL on it
      const existingPayout = await storage.getPayoutByMonth(trainerId, month, year);
      if (existingPayout) {
        await storage.updatePayout(existingPayout.id, { payslipUrl: downloadUrl });
      }

      res.json({ success: true, downloadUrl, payoutId: existingPayout?.id || null });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.issues });
      }
      console.error("Failed to upload payslip:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to upload payslip",
      });
    }
  });

  // List all payslips from Supabase storage
  app.get("/api/payslips/list", async (req, res) => {
    try {
      const trainerId = req.query.trainerId as string | undefined;
      
      const payslips = await PayslipStorage.listAllPayslips(trainerId);
      res.json(payslips);
    } catch (error) {
      console.error("Failed to list payslips:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to list payslips",
      });
    }
  });

  // Delete a payslip from Supabase storage
  app.delete("/api/payslips/:path(*)", async (req, res) => {
    try {
      const objectPath = req.params.path;
      
      if (!objectPath) {
        return res.status(400).json({ error: "Object path is required" });
      }

      await PayslipStorage.deletePayslip(decodeURIComponent(objectPath));
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to delete payslip:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to delete payslip",
      });
    }
  });
}
