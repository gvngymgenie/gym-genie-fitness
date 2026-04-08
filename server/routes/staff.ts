import { Express } from "express";
import { storage } from "../storage";

export function registerStaffRoutes(app: Express) {
  // Get all staff members
  app.get("/api/staff", async (req, res) => {
    try {
      const staff = await storage.getStaffMembers();
      res.json(staff);
    } catch (error) {
      console.error("Failed to fetch staff:", error);
      res.status(500).json({ error: "Failed to fetch staff members" });
    }
  });

  // Get staff member by ID
  app.get("/api/staff/:id", async (req, res) => {
    try {
      const staff = await storage.getUser(req.params.id);
      if (!staff) {
        return res.status(404).json({ error: "Staff member not found" });
      }
      res.json(staff);
    } catch (error) {
      console.error("Failed to fetch staff member:", error);
      res.status(500).json({ error: "Failed to fetch staff member" });
    }
  });

  // Create staff member
  app.post("/api/staff", async (req, res) => {
    try {
      const staffData = {
        username: req.body.username,
        password: req.body.password,
        email: req.body.email,
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        phone: req.body.phone,
        role: req.body.role || 'staff',
        isActive: req.body.isActive !== undefined ? req.body.isActive : true,
      };

      // Check for existing users using storage layer
      const existingUsername = await storage.getUserByUsername(staffData.username);
      if (existingUsername) {
        return res.status(400).json({ error: "Username already exists" });
      }

      const existingEmail = await storage.getUserByEmail(staffData.email);
      if (existingEmail) {
        return res.status(400).json({ error: "Email already exists" });
      }

      const createdStaff = await storage.createUser(staffData);
      res.status(201).json(createdStaff);
    } catch (error) {
      console.error("Failed to create staff member:", error);
      res.status(500).json({ error: "Failed to create staff member" });
    }
  });

  // Update staff member
  app.patch("/api/staff/:id", async (req, res) => {
    try {
      const updates: Record<string, any> = {};
      if (req.body.username !== undefined) updates.username = req.body.username;
      if (req.body.password !== undefined) updates.password = req.body.password;
      if (req.body.email !== undefined) updates.email = req.body.email;
      if (req.body.firstName !== undefined) updates.firstName = req.body.firstName;
      if (req.body.lastName !== undefined) updates.lastName = req.body.lastName;
      if (req.body.phone !== undefined) updates.phone = req.body.phone;
      if (req.body.role !== undefined) updates.role = req.body.role;
      if (req.body.isActive !== undefined) updates.isActive = req.body.isActive;

      if (updates.email) {
        const existingEmail = await storage.getUserByEmail(updates.email);
        if (existingEmail && existingEmail.id !== req.params.id) {
          return res.status(400).json({ error: "Email already exists" });
        }
      }

      if (updates.username) {
        const existingUsername = await storage.getUserByUsername(updates.username);
        if (existingUsername && existingUsername.id !== req.params.id) {
          return res.status(400).json({ error: "Username already exists" });
        }
      }

      const staff = await storage.updateUser(req.params.id, updates);
      if (!staff) {
        return res.status(404).json({ error: "Staff member not found" });
      }
      res.json(staff);
    } catch (error) {
      console.error("Failed to update staff member:", error);
      res.status(500).json({ error: "Failed to update staff member" });
    }
  });

  // Delete staff member
  app.delete("/api/staff/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteUser(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Staff member not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Failed to delete staff member:", error);
      res.status(500).json({ error: "Failed to delete staff member" });
    }
  });

  // Get staff by role
  app.get("/api/staff/role/:role", async (req, res) => {
    try {
      const role = req.params.role;
      const staff = await storage.getUsersByRole(role);
      res.json(staff);
    } catch (error) {
      console.error("Failed to fetch staff by role:", error);
      res.status(500).json({ error: "Failed to fetch staff by role" });
    }
  });
}