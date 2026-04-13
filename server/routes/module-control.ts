import { Express } from "express";
import { storage } from "../storage";

export function registerModuleControlRoutes(app: Express) {
  // Get all module controls
  app.get("/api/module-control", async (req, res) => {
    try {
      const modules = await storage.getAllModuleControls();
      res.json({ modules });
    } catch (error) {
      console.error("Failed to fetch module controls:", error);
      res.status(500).json({ error: "Failed to fetch module controls" });
    }
  });

  // Get enabled modules (for filtering permissions and sidebar)
  app.get("/api/module-control/enabled", async (req, res) => {
    try {
      const enabledModules = await storage.getEnabledModules();
      res.json({ enabledModules });
    } catch (error) {
      console.error("Failed to fetch enabled modules:", error);
      res.status(500).json({ error: "Failed to fetch enabled modules" });
    }
  });

  // Update a module (enable/disable)
  app.put("/api/module-control/:moduleName", async (req, res) => {
    try {
      const moduleName = req.params.moduleName;
      const { enabled, description } = req.body;

      if (typeof enabled !== "boolean") {
        return res.status(400).json({ error: "enabled must be a boolean" });
      }

      const existing = await storage.getModuleControl(moduleName);
      if (!existing) {
        return res.status(404).json({ error: `Module '${moduleName}' not found` });
      }

      const updated = await storage.updateModuleControl(moduleName, {
        enabled,
        ...(description !== undefined && { description }),
      });

      if (!updated) {
        return res.status(500).json({ error: "Failed to update module" });
      }

      res.json({
        message: `Module '${moduleName}' ${enabled ? 'enabled' : 'disabled'} successfully`,
        module: updated,
      });
    } catch (error) {
      console.error("Failed to update module control:", error);
      res.status(500).json({ error: "Failed to update module control" });
    }
  });

  // Upsert a module (create or update)
  app.post("/api/module-control", async (req, res) => {
    try {
      const { moduleName, moduleLabel, enabled, description } = req.body;

      if (!moduleName || !moduleLabel) {
        return res.status(400).json({ error: "moduleName and moduleLabel are required" });
      }

      const created = await storage.upsertModuleControl({
        moduleName,
        moduleLabel,
        enabled: enabled ?? true,
        description,
      });

      res.json({
        message: `Module '${moduleName}' created successfully`,
        module: created,
      });
    } catch (error) {
      console.error("Failed to create module control:", error);
      res.status(500).json({ error: "Failed to create module control" });
    }
  });

  // Seed default modules
  app.post("/api/module-control/seed", async (req, res) => {
    try {
      console.log("[Module Control] Attempting to seed modules...");
      await storage.seedModuleControls();
      console.log("[Module Control] Modules seeded successfully");
      res.json({ message: "Module controls seeded successfully" });
    } catch (error) {
      console.error("[Module Control] Failed to seed module controls:", error);
      res.status(500).json({ error: `Failed to seed module controls: ${error}` });
    }
  });
}
