import { Express } from "express";
import { storage } from "../storage";

export function registerPlanRoutes(app: Express) {
  // Get all membership plans
  app.get("/api/plans", async (req, res) => {
    try {
      const plans = await storage.getAllPlans();
      res.json(plans);
    } catch (error) {
      console.error("Failed to fetch plans:", error);
      res.status(500).json({ error: "Failed to fetch plans" });
    }
  });

  // Get plan by ID
  app.get("/api/plans/:id", async (req, res) => {
    try {
      const plan = await storage.getPlan(req.params.id);
      if (!plan) {
        return res.status(404).json({ error: "Plan not found" });
      }
      res.json(plan);
    } catch (error) {
      console.error("Failed to fetch plan:", error);
      res.status(500).json({ error: "Failed to fetch plan" });
    }
  });

  // Create plan
  app.post("/api/plans", async (req, res) => {
    try {
      const planData = {
        name: req.body.name,
        duration: req.body.duration,
        durationMonths: req.body.durationMonths,
        price: req.body.price,
        features: req.body.features,
      };

      const created = await storage.createPlan(planData);
      res.status(201).json({
        ...created,
        isActive: true,
        createdAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Failed to create plan:", error);
      res.status(500).json({ error: "Failed to create plan" });
    }
  });

  // Update plan
  app.patch("/api/plans/:id", async (req, res) => {
    try {
      const updates: Record<string, any> = {};

      if (req.body.name !== undefined) updates.name = req.body.name;
      if (req.body.duration !== undefined) updates.duration = req.body.duration;
      if (req.body.durationMonths !== undefined) updates.durationMonths = req.body.durationMonths;
      if (req.body.price !== undefined) updates.price = req.body.price;
      if (req.body.features !== undefined) updates.features = req.body.features;

      const plan = await storage.updatePlan(req.params.id, updates);
      if (!plan) {
        return res.status(404).json({ error: "Plan not found" });
      }
      res.json(plan);
    } catch (error) {
      console.error("Failed to update plan:", error);
      res.status(500).json({ error: "Failed to update plan" });
    }
  });

  // Delete plan
  app.delete("/api/plans/:id", async (req, res) => {
    try {
      const success = await storage.deletePlan(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Plan not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Failed to delete plan:", error);
      res.status(500).json({ error: "Failed to delete plan" });
    }
  });
}
