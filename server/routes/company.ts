import { Express } from "express";
import { storage } from "../storage";
import { updateCompanySettingsSchema } from "@shared/schema";
import { z } from "zod";

export function registerCompanyRoutes(app: Express) {
  // Get company settings
  app.route("/api/company-settings")
    .get(async (req, res) => {
      try {
        console.log("API: /api/company-settings GET request received");
        const settings = await storage.getCompanySettings();
        console.log("API: company settings fetched:", settings);
        res.json(settings || { companyName: "Lime Fitness" });
      } catch (error) {
        console.error("Failed to fetch company settings:", error);
        res.status(500).json({ error: "Failed to fetch company settings" });
      }
    })
    .put(async (req, res) => {
      try {
        console.log("API: /api/company-settings PUT request received");
        const validatedData = updateCompanySettingsSchema.parse(req.body);
        console.log("API: updating company settings with:", validatedData);
        const settings = await storage.createOrUpdateCompanySettings(validatedData);
        console.log("API: company settings updated:", settings);
        res.json(settings);
      } catch (error) {
        if (error instanceof z.ZodError) {
          console.error("API: validation error:", error.errors);
          return res.status(400).json({ error: "Validation error", details: error.errors });
        }
        console.error("Failed to update company settings:", error);
        res.status(500).json({ error: "Failed to update company settings" });
      }
    });
}
