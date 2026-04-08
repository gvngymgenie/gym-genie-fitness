import { Express } from "express";
import { storage } from "../storage";
import { insertWorkoutProgramAssignmentSchema } from "@shared/schema";
import { z } from "zod";

export function registerWorkoutRoutes(app: Express) {
  // Get all workout programs
  app.get("/api/workout-programs", async (req, res) => {
    try {
      const memberId = req.query.memberId as string;
      if (memberId) {
        const programs = await storage.getWorkoutProgramsByMember(memberId);
        return res.json(programs);
      }
      const programs = await storage.getAllWorkoutPrograms();
      res.json(programs);
    } catch (error) {
      console.error("Failed to fetch workout programs:", error);
      res.status(500).json({ error: "Failed to fetch workout programs" });
    }
  });

  // Create workout program
  app.post("/api/workout-programs", async (req, res) => {
    try {
      const programData = {
        memberId: req.body.memberId,
        customWorkoutPlan: req.body.customWorkoutPlan || false,
        day: req.body.day,
        name: req.body.name,
        difficulty: req.body.difficulty || 'Intermediate',
        exercises: req.body.exercises || [],
        duration: req.body.duration,
        equipment: req.body.equipment,
        intensity: req.body.intensity || 5,
        goal: req.body.goal || 'Hypertrophy',
        collectionIds: req.body.collectionIds || [],
      };

      const program = await storage.createWorkoutProgram(programData as any);
      res.status(201).json(program);
    } catch (error) {
      console.error("Failed to create workout program:", error);
      res.status(500).json({ error: "Failed to create workout program" });
    }
  });

  // Update workout program
  app.patch("/api/workout-programs/:id", async (req, res) => {
    try {
      const updates: Record<string, any> = {};
      if (req.body.memberId !== undefined) updates.memberId = req.body.memberId;
      if (req.body.customWorkoutPlan !== undefined) updates.customWorkoutPlan = req.body.customWorkoutPlan;
      if (req.body.day !== undefined) updates.day = req.body.day;
      if (req.body.name !== undefined) updates.name = req.body.name;
      if (req.body.difficulty !== undefined) updates.difficulty = req.body.difficulty;
      if (req.body.exercises !== undefined) updates.exercises = req.body.exercises;
      if (req.body.duration !== undefined) updates.duration = req.body.duration;
      if (req.body.equipment !== undefined) updates.equipment = req.body.equipment;
      if (req.body.intensity !== undefined) updates.intensity = req.body.intensity;
      if (req.body.goal !== undefined) updates.goal = req.body.goal;
      if (req.body.collectionIds !== undefined) updates.collectionIds = req.body.collectionIds;

      const program = await storage.updateWorkoutProgram(req.params.id, updates);
      if (!program) {
        return res.status(404).json({ error: "Workout program not found" });
      }
      res.json(program);
    } catch (error) {
      console.error("Failed to update workout program:", error);
      res.status(500).json({ error: "Failed to update workout program" });
    }
  });

  // Delete workout program
  app.delete("/api/workout-programs/:id", async (req, res) => {
    try {
      const success = await storage.deleteWorkoutProgram(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Workout program not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Failed to delete workout program:", error);
      res.status(500).json({ error: "Failed to delete workout program" });
    }
  });

  // Get assignments by program
  app.get("/api/workout-programs/:programId/assignments", async (req, res) => {
    try {
      const assignments = await storage.getAssignmentsByProgram(req.params.programId);
      res.json(assignments);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch assignments" });
    }
  });

  // Create workout program assignment
  app.post("/api/workout-programs/:programId/assignments", async (req, res) => {
    try {
      const validatedData = insertWorkoutProgramAssignmentSchema.parse({
        programId: req.params.programId,
        memberId: req.body.memberId,
      });
      const assignment = await storage.createAssignment(validatedData);
      res.status(201).json(assignment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation error", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create assignment" });
    }
  });

  // Delete workout program assignment
  app.delete("/api/workout-programs/:programId/assignments/:memberId", async (req, res) => {
    try {
      const deleted = await storage.deleteAssignment(req.params.programId, req.params.memberId);
      if (!deleted) {
        return res.status(404).json({ error: "Assignment not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete assignment" });
    }
  });

  // Get workout assignments by member
  app.get("/api/members/:memberId/workout-assignments", async (req, res) => {
    try {
      const assignments = await storage.getWorkoutAssignmentsByMember(req.params.memberId);
      res.json(assignments);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch workout assignments" });
    }
  });
}
