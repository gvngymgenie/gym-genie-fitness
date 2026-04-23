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

  // Update check-out time
  app.patch("/api/attendance/:id", async (req, res) => {
    try {
      const { checkOutTime } = req.body;
      if (!checkOutTime) {
        return res.status(400).json({ error: "checkOutTime is required" });
      }
      const updated = await storage.updateAttendanceCheckOut(req.params.id, checkOutTime);
      if (!updated) {
        return res.status(404).json({ error: "Attendance record not found" });
      }
      res.json(updated);
    } catch (error) {
      console.error("Failed to update check-out time:", error);
      res.status(500).json({ error: "Failed to update check-out time" });
    }
  });

  // Get open (unchecked-out) entries
  app.get("/api/attendance/open", async (req, res) => {
    try {
      const memberId = req.query.memberId as string;
      const date = req.query.date as string;
      if (!memberId || !date) {
        return res.status(400).json({ error: "memberId and date query parameters are required" });
      }
      const record = await storage.getOpenAttendance(memberId, date);
      res.json(record || null);
    } catch (error) {
      console.error("Failed to check open attendance:", error);
      res.status(500).json({ error: "Failed to check open attendance" });
    }
  });
}
