import { Express } from "express";
import { storage } from "../storage";

export function registerBookingsRoutes(app: Express) {
  // Get all bookings (admin only)
  app.get("/api/bookings", async (req, res) => {
    try {
      const trainers = await storage.getAllTrainers();
      const allBookings = await Promise.all(
        trainers.map(trainer =>
          storage.getTrainerBookings(trainer.id).catch(() => [])
        )
      );
      res.json(allBookings.flat());
    } catch (error) {
      console.error("Failed to fetch all bookings:", error);
      res.status(500).json({ error: "Failed to fetch all bookings" });
    }
  });

  // Auto-complete all past bookings across all trainers
  // Useful for scheduled jobs (cron) to mark sessions complete automatically
  app.post("/api/bookings/auto-complete-all", async (req, res) => {
    try {
      const trainers = await storage.getAllTrainers();
      let totalCompleted = 0;
      const results: { trainerId: string; completed: number }[] = [];

      for (const trainer of trainers) {
        const allBookings = await storage.getTrainerBookings(trainer.id);
        const today = new Date().toISOString().split("T")[0];
        const pastBookings = allBookings.filter(
          b => b.bookingDate <= today && b.status !== "completed"
        );

        await Promise.all(
          pastBookings.map(b => storage.updateTrainerBooking(b.id, { status: "completed" } as any))
        );

        totalCompleted += pastBookings.length;
        results.push({ trainerId: trainer.id, completed: pastBookings.length });
      }

      res.json({
        success: true,
        totalCompleted,
        trainersProcessed: trainers.length,
        details: results,
      });
    } catch (error) {
      console.error("Failed to auto-complete all bookings:", error);
      res.status(500).json({ error: "Failed to auto-complete all bookings" });
    }
  });
}
