import { Express } from "express";
import { storage } from "../storage";

export function registerAttendanceRoutes(app: Express) {
  // Get attendance by date
  app.get("/api/attendance", async (req, res) => {
    try {
      const date = req.query.date as string;
      if (!date) {
        return res.status(400).json({ error: "Date query parameter is required" });
      }
      const records = await storage.getAttendanceByDate(date);
      res.json(records);
    } catch (error) {
      console.error("Failed to fetch attendance:", error);
      res.status(500).json({ error: "Failed to fetch attendance" });
    }
  });

  // Create attendance record
  app.post("/api/attendance", async (req, res) => {
    try {
      const recordData = {
        memberId: req.body.memberId,
        memberName: req.body.memberName,
        date: req.body.date,
        checkInTime: req.body.checkInTime,
        method: req.body.method || 'Manual',
      };

      const record = await storage.createAttendance(recordData as any);
      res.status(201).json(record);
    } catch (error) {
      console.error("Failed to create attendance:", error);
      res.status(500).json({ error: "Failed to create attendance record" });
    }
  });

  // Delete attendance record
  app.delete("/api/attendance/:id", async (req, res) => {
    try {
      const success = await storage.deleteAttendance(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Attendance record not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete attendance record" });
    }
  });
}
