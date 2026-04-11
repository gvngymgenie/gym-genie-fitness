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
}
