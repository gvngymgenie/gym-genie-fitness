import { Express } from "express";
import { storage } from "../storage";
import { insertDietPlanAssignmentSchema } from "@shared/schema";
import { z } from "zod";

export function registerDietRoutes(app: Express) {
  // Get all diet plans
  app.get("/api/diet-plans", async (req, res) => {
    try {
      const memberId = req.query.memberId as string;
      if (memberId) {
        const plans = await storage.getDietPlansByMember(memberId);
        return res.json(plans);
      }
      const plans = await storage.getAllDietPlans();
      res.json(plans);
    } catch (error) {
      console.error("Failed to fetch diet plans:", error);
      res.status(500).json({ error: "Failed to fetch diet plans" });
    }
  });

  // Create diet plan
  app.post("/api/diet-plans", async (req, res) => {
    try {
      const planData = {
        memberId: req.body.memberId,
        meal: req.body.meal,
        foods: req.body.foods || [],
        calories: req.body.calories,
        protein: req.body.protein,
        carbs: req.body.carbs,
        fat: req.body.fat,
        customDiet: req.body.customDiet ?? false,
        notes: req.body.notes,
      };

      const plan = await storage.createDietPlan(planData as any);

      // Auto-assign to the specified member when it's a custom diet
      if (plan.customDiet && plan.memberId) {
        await storage.createDietAssignment({ dietPlanId: plan.id, memberId: plan.memberId });
      }

      res.status(201).json(plan);
    } catch (error) {
      console.error("Failed to create diet plan:", error);
      res.status(500).json({ error: "Failed to create diet plan" });
    }
  });

  // Update diet plan
  app.patch("/api/diet-plans/:id", async (req, res) => {
    try {
      const updates: Record<string, any> = {};
      if (req.body.memberId !== undefined) updates.memberId = req.body.memberId;
      if (req.body.meal !== undefined) updates.meal = req.body.meal;
      if (req.body.foods !== undefined) updates.foods = req.body.foods;
      if (req.body.calories !== undefined) updates.calories = req.body.calories;
      if (req.body.protein !== undefined) updates.protein = req.body.protein;
      if (req.body.carbs !== undefined) updates.carbs = req.body.carbs;
      if (req.body.fat !== undefined) updates.fat = req.body.fat;
      if (req.body.customDiet !== undefined) updates.customDiet = req.body.customDiet;
      if (req.body.notes !== undefined) updates.notes = req.body.notes;

      const plan = await storage.updateDietPlan(req.params.id, updates);
      if (!plan) {
        return res.status(404).json({ error: "Diet plan not found" });
      }
      res.json(plan);
    } catch (error) {
      console.error("Failed to update diet plan:", error);
      res.status(500).json({ error: "Failed to update diet plan" });
    }
  });

  // Delete diet plan
  app.delete("/api/diet-plans/:id", async (req, res) => {
    try {
      const success = await storage.deleteDietPlan(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Diet plan not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Failed to delete diet plan:", error);
      res.status(500).json({ error: "Failed to delete diet plan" });
    }
  });

  // Get diet assignments by plan
  app.get("/api/diet-plans/:dietPlanId/assignments", async (req, res) => {
    try {
      const assignments = await storage.getDietAssignmentsByPlan(req.params.dietPlanId);
      res.json(assignments);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch assignments" });
    }
  });

  // Create diet plan assignment
  app.post("/api/diet-plans/:dietPlanId/assignments", async (req, res) => {
    try {
      const validatedData = insertDietPlanAssignmentSchema.parse({
        dietPlanId: req.params.dietPlanId,
        memberId: req.body.memberId,
      });
      const assignment = await storage.createDietAssignment(validatedData);
      res.status(201).json(assignment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation error", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create assignment" });
    }
  });

  // Delete diet plan assignment
  app.delete("/api/diet-plans/:dietPlanId/assignments/:memberId", async (req, res) => {
    try {
      const deleted = await storage.deleteDietAssignment(req.params.dietPlanId, req.params.memberId);
      if (!deleted) {
        return res.status(404).json({ error: "Assignment not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete assignment" });
    }
  });

  // Get diet assignments by member
  app.get("/api/members/:memberId/diet-assignments", async (req, res) => {
    try {
      const assignments = await storage.getDietAssignmentsByMember(req.params.memberId);
      res.json(assignments);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch diet assignments" });
    }
  });
}
