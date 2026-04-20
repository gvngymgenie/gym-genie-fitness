import { Express } from "express";
import { storage } from "../storage";
import { insertTrainerProfileSchema, updateTrainerProfileSchema, insertTrainerBookingSchema, updateTrainerBookingSchema, insertTrainerFeedbackSchema, insertTrainerAvailabilitySchema } from "@shared/schema";
import { z } from "zod";

export function registerTrainerRoutes(app: Express) {
  // Trainer Profile Routes
  app.get("/api/trainers/:trainerId/profile", async (req, res) => {
    try {
      const profile = await storage.getTrainerProfile(req.params.trainerId);
      res.json(profile || null);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch trainer profile" });
    }
  });

  app.post("/api/trainers/:trainerId/profile", async (req, res) => {
    try {
      const validatedData = insertTrainerProfileSchema.parse({
        trainerId: req.params.trainerId,
        ...req.body,
      });
      const profile = await storage.createTrainerProfile(validatedData);
      res.status(201).json(profile);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation error", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create trainer profile" });
    }
  });

  app.patch("/api/trainers/:trainerId/profile", async (req, res) => {
    try {
      const validatedData = updateTrainerProfileSchema.parse(req.body);
      let profile = await storage.updateTrainerProfile(req.params.trainerId, validatedData);
      if (!profile) {
        const createData = insertTrainerProfileSchema.parse({
          trainerId: req.params.trainerId,
          specializations: validatedData.specializations || [],
          weeklySlotCapacity: validatedData.weeklySlotCapacity || 20,
        });
        profile = await storage.createTrainerProfile(createData);
      }
      res.json(profile);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation error", details: error.errors });
      }
      res.status(500).json({ error: "Failed to update trainer profile" });
    }
  });

  // Trainer Bookings Routes
  app.get("/api/trainers/:trainerId/bookings", async (req, res) => {
    try {
      const bookings = await storage.getTrainerBookings(req.params.trainerId);
      res.json(bookings);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch trainer bookings" });
    }
  });

  app.post("/api/trainers/:trainerId/bookings", async (req, res) => {
    try {
      const validatedData = insertTrainerBookingSchema.parse({
        trainerId: req.params.trainerId,
        ...req.body,
      });
      const booking = await storage.createTrainerBooking(validatedData);
      res.status(201).json(booking);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation error", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create booking" });
    }
  });

  app.patch("/api/trainers/:trainerId/bookings/:bookingId", async (req, res) => {
    try {
      const validatedData = updateTrainerBookingSchema.parse(req.body);
      const booking = await storage.updateTrainerBooking(req.params.bookingId, validatedData);
      if (!booking) {
        return res.status(404).json({ error: "Booking not found" });
      }
      res.json(booking);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation error", details: error.errors });
      }
      res.status(500).json({ error: "Failed to update booking" });
    }
  });

  app.delete("/api/trainers/:trainerId/bookings/:bookingId", async (req, res) => {
    try {
      const deleted = await storage.deleteTrainerBooking(req.params.bookingId);
      if (!deleted) {
        return res.status(404).json({ error: "Booking not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete booking" });
    }
  });

  // Trainer Feedback Routes
  app.get("/api/trainers/:trainerId/feedback", async (req, res) => {
    try {
      const feedback = await storage.getTrainerFeedback(req.params.trainerId);
      res.json(feedback);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch trainer feedback" });
    }
  });

  app.post("/api/trainers/:trainerId/feedback", async (req, res) => {
    try {
      const validatedData = insertTrainerFeedbackSchema.parse({
        trainerId: req.params.trainerId,
        ...req.body,
      });
      const feedback = await storage.createTrainerFeedback(validatedData);
      res.status(201).json(feedback);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation error", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create feedback" });
    }
  });

  // Trainer Availability Routes
  app.get("/api/trainers/:trainerId/availability", async (req, res) => {
    try {
      const weekDates = (req.query.weekDates as string)?.split(",") || [];
      if (weekDates.length === 0) {
        return res.status(400).json({ error: "weekDates query parameter is required" });
      }
      const availability = await storage.getTrainerAvailabilityByWeek(req.params.trainerId, weekDates);
      const bookings = await storage.getTrainerBookingsByWeek(req.params.trainerId, weekDates);
      res.json({ availability, bookings });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch trainer availability" });
    }
  });

  app.post("/api/trainers/:trainerId/availability", async (req, res) => {
    try {
      const validatedData = insertTrainerAvailabilitySchema.parse({
        trainerId: req.params.trainerId,
        ...req.body,
      });
      const availability = await storage.upsertTrainerAvailability(validatedData);
      res.status(201).json(availability);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation error", details: error.errors });
      }
      res.status(500).json({ error: "Failed to save availability" });
    }
  });

  app.put("/api/trainers/:trainerId/availability/batch", async (req, res) => {
    try {
      const { slots } = req.body;
      if (!Array.isArray(slots)) {
        return res.status(400).json({ error: "slots array is required" });
      }
      const results = await Promise.all(slots.map((slot: any) =>
        storage.upsertTrainerAvailability({
          trainerId: req.params.trainerId,
          slotDate: slot.slotDate,
          period: slot.period,
          slotCapacity: slot.slotCapacity,
        })
      ));
      res.json(results);
    } catch (error) {
      res.status(500).json({ error: "Failed to save availability" });
    }
  });

   // Member Bookings Route
   app.get("/api/member/:memberId/bookings", async (req, res) => {
     try {
       const bookings = await storage.getMemberBookings(req.params.memberId);
       res.json(bookings);
     } catch (error) {
       res.status(500).json({ error: "Failed to fetch member bookings" });
     }
   });

   // Mark a booking as completed
   app.post("/api/trainers/:trainerId/bookings/:bookingId/complete", async (req, res) => {
     try {
       const booking = await storage.updateTrainerBooking(req.params.bookingId, {
         status: "completed",
       } as any);
       if (!booking) {
         return res.status(404).json({ error: "Booking not found" });
       }
       res.json(booking);
     } catch (error) {
       console.error("Failed to complete booking:", error);
       res.status(500).json({ error: "Failed to complete booking" });
     }
   });

   // Revert a booking to scheduled (undo completion)
   app.post("/api/trainers/:trainerId/bookings/:bookingId/revert", async (req, res) => {
     try {
       const booking = await storage.updateTrainerBooking(req.params.bookingId, {
         status: "scheduled",
       } as any);
       if (!booking) {
         return res.status(404).json({ error: "Booking not found" });
       }
       res.json(booking);
     } catch (error) {
       console.error("Failed to revert booking:", error);
       res.status(500).json({ error: "Failed to revert booking" });
     }
   });

   // Auto-complete past bookings for a trainer (bookings with date <= today)
   app.post("/api/trainers/:trainerId/auto-complete", async (req, res) => {
     try {
       const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
       const allBookings = await storage.getTrainerBookings(req.params.trainerId);
       const pastBookings = allBookings.filter(
         (b) => b.bookingDate <= today && b.status !== "completed"
       );
       
       const updated = await Promise.all(
         pastBookings.map((b) =>
           storage.updateTrainerBooking(b.id, { status: "completed" } as any)
         )
       );
       
       res.json({
         success: true,
         completedCount: updated.length,
         completedIds: updated.map((b) => b.id),
       });
     } catch (error) {
       console.error("Failed to auto-complete bookings:", error);
       res.status(500).json({ error: "Failed to auto-complete bookings" });
     }
   });
 }
