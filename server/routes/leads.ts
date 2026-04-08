import { Express } from "express";
import { storage } from "../storage";

export function registerLeadRoutes(app: Express) {
  // Get all leads
  app.get("/api/leads", async (req, res) => {
    try {
      const leads = await storage.getAllLeads();
      res.json(leads);
    } catch (error) {
      console.error("Failed to fetch leads:", error);
      res.status(500).json({ error: "Failed to fetch leads" });
    }
  });

  // Get lead by ID
  app.get("/api/leads/:id", async (req, res) => {
    try {
      const lead = await storage.getLead(req.params.id);
      if (!lead) {
        return res.status(404).json({ error: "Lead not found" });
      }
      res.json(lead);
    } catch (error) {
      console.error("Failed to fetch lead:", error);
      res.status(500).json({ error: "Failed to fetch lead" });
    }
  });

  // Create lead
  app.post("/api/leads", async (req, res) => {
    try {
      const leadData = {
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        email: req.body.email,
        phone: req.body.phone,
        address: req.body.address,
        gender: req.body.gender || 'male',
        interestAreas: req.body.interestAreas || (req.body.interestArea ? [req.body.interestArea] : []),
        healthBackground: req.body.healthBackground,
        source: req.body.source,
        priority: req.body.priority || 'medium',
        assignedStaff: req.body.assignedStaff,
        followUpDate: req.body.followUpDate,
        dob: req.body.dob,
        height: req.body.height,
        notes: req.body.notes,
        followUpCompleted: req.body.followUpCompleted || false,
        status: req.body.status || 'new',
        branch: req.body.branch,
      };

      const createdLead = await storage.createLead(leadData);
      res.status(201).json(createdLead);
    } catch (error) {
      console.error("Failed to create lead:", error);
      res.status(500).json({ error: "Failed to create lead" });
    }
  });

  // Update lead
  app.patch("/api/leads/:id", async (req, res) => {
    try {
      const updates: Record<string, any> = {};
      if (req.body.firstName !== undefined) updates.firstName = req.body.firstName;
      if (req.body.lastName !== undefined) updates.lastName = req.body.lastName;
      if (req.body.email !== undefined) updates.email = req.body.email;
      if (req.body.phone !== undefined) updates.phone = req.body.phone;
      if (req.body.address !== undefined) updates.address = req.body.address;
      if (req.body.gender !== undefined) updates.gender = req.body.gender;
      if (req.body.interestAreas !== undefined) updates.interestAreas = req.body.interestAreas;
      if (req.body.interestArea !== undefined) updates.interestAreas = [req.body.interestArea];
      if (req.body.healthBackground !== undefined) updates.healthBackground = req.body.healthBackground;
      if (req.body.source !== undefined) updates.source = req.body.source;
      if (req.body.priority !== undefined) updates.priority = req.body.priority;
      if (req.body.assignedStaff !== undefined) updates.assignedStaff = req.body.assignedStaff;
      if (req.body.followUpDate !== undefined) updates.followUpDate = req.body.followUpDate;
      if (req.body.dob !== undefined) updates.dob = req.body.dob;
      if (req.body.height !== undefined) updates.height = req.body.height;
      if (req.body.notes !== undefined) updates.notes = req.body.notes;
      if (req.body.status !== undefined) updates.status = req.body.status;
      if (req.body.branch !== undefined) updates.branch = req.body.branch;

      const lead = await storage.updateLead(req.params.id, updates);
      if (!lead) {
        return res.status(404).json({ error: "Lead not found" });
      }
      res.json(lead);
    } catch (error) {
      console.error("Failed to update lead:", error);
      res.status(500).json({ error: "Failed to update lead" });
    }
  });

  // Delete lead
  app.delete("/api/leads/:id", async (req, res) => {
    try {
      const success = await storage.deleteLead(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Lead not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Failed to delete lead:", error);
      res.status(500).json({ error: "Failed to delete lead" });
    }
  });
}
