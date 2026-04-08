import { Express } from "express";
import { storage } from "../storage";

export function registerBranchRoutes(app: Express) {
  // Get all branches
  app.get("/api/branches", async (req, res) => {
    try {
      const branches = await storage.getAllBranches();
      res.json(branches);
    } catch (error) {
      console.error("Failed to fetch branches:", error);
      res.status(500).json({ error: "Failed to fetch branches" });
    }
  });

  // Get branch by ID
  app.get("/api/branches/:id", async (req, res) => {
    try {
      const branch = await storage.getBranch(req.params.id);
      if (!branch) {
        return res.status(404).json({ error: "Branch not found" });
      }
      res.json(branch);
    } catch (error) {
      console.error("Failed to fetch branch:", error);
      res.status(500).json({ error: "Failed to fetch branch" });
    }
  });

  // Create branch
  app.post("/api/branches", async (req, res) => {
    try {
      const branchData = {
        name: req.body.name,
        address: req.body.address,
        phone: req.body.phone,
        contactPerson: req.body.contactPerson,
        isActive: true,
      };

      const branch = await storage.createBranch(branchData as any);
      res.status(201).json(branch);
    } catch (error) {
      console.error("Failed to create branch:", error);
      res.status(500).json({ error: "Failed to create branch" });
    }
  });

  // Update branch
  app.patch("/api/branches/:id", async (req, res) => {
    try {
      const updates: Record<string, any> = {};
      if (req.body.name !== undefined) updates.name = req.body.name;
      if (req.body.address !== undefined) updates.address = req.body.address;
      if (req.body.phone !== undefined) updates.phone = req.body.phone;
      if (req.body.contactPerson !== undefined) updates.contactPerson = req.body.contactPerson;
      if (req.body.isActive !== undefined) updates.isActive = req.body.isActive;

      const branch = await storage.updateBranch(req.params.id, updates);
      if (!branch) {
        return res.status(404).json({ error: "Branch not found" });
      }
      res.json(branch);
    } catch (error) {
      console.error("Failed to update branch:", error);
      res.status(500).json({ error: "Failed to update branch" });
    }
  });

  // Delete branch
  app.delete("/api/branches/:id", async (req, res) => {
    try {
      const success = await storage.deleteBranch(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Branch not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Failed to delete branch:", error);
      res.status(500).json({ error: "Failed to delete branch" });
    }
  });
}
