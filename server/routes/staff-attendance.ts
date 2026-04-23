import { Express } from "express";
import { storage } from "../storage";

export function registerStaffAttendanceRoutes(app: Express) {
  // Get staff attendance by date
  app.get("/api/staff-attendance", async (req, res) => {
    try {
      const date = req.query.date as string;
      if (!date) {
        return res.status(400).json({ error: "Date query parameter is required" });
      }
      const records = await storage.getStaffAttendanceByDate(date);
      res.json(records);
    } catch (error) {
      console.error("Failed to fetch staff attendance:", error);
      res.status(500).json({ error: "Failed to fetch staff attendance" });
    }
  });

  // Create staff attendance record
  app.post("/api/staff-attendance", async (req, res) => {
    try {
      const recordData = {
        personType: req.body.personType,
        personId: req.body.personId,
        personName: req.body.personName,
        date: req.body.date,
        checkInTime: req.body.checkInTime,
        checkOutTime: req.body.checkOutTime || null,
        method: req.body.method || "Manual",
        notes: req.body.notes || null,
      };

      const record = await storage.createStaffAttendance(recordData as any);
      res.status(201).json(record);
    } catch (error) {
      console.error("Failed to create staff attendance:", error);
      res.status(500).json({ error: "Failed to create staff attendance record" });
    }
  });

  // Delete staff attendance record
  app.delete("/api/staff-attendance/:id", async (req, res) => {
    try {
      const success = await storage.deleteStaffAttendance(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Staff attendance record not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete staff attendance record" });
    }
  });

  // Update check-out time
  app.patch("/api/staff-attendance/:id", async (req, res) => {
    try {
      const { checkOutTime } = req.body;
      if (!checkOutTime) {
        return res.status(400).json({ error: "checkOutTime is required" });
      }
      const updated = await storage.updateStaffAttendanceCheckOut(req.params.id, checkOutTime);
      if (!updated) {
        return res.status(404).json({ error: "Staff attendance record not found" });
      }
      res.json(updated);
    } catch (error) {
      console.error("Failed to update check-out time:", error);
      res.status(500).json({ error: "Failed to update check-out time" });
    }
  });

  // Get open (unchecked-out) entries
  app.get("/api/staff-attendance/open", async (req, res) => {
    try {
      const personId = req.query.personId as string;
      const date = req.query.date as string;
      if (!personId || !date) {
        return res.status(400).json({ error: "personId and date query parameters are required" });
      }
      const record = await storage.getOpenStaffAttendance(personId, date);
      res.json(record || null);
    } catch (error) {
      console.error("Failed to check open staff attendance:", error);
      res.status(500).json({ error: "Failed to check open staff attendance" });
    }
  });
}
