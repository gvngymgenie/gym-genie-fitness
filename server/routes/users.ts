import { Express } from "express";
import { storage } from "../storage";
import { roleEnum } from "@shared/schema";

export function registerUserRoutes(app: Express) {
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

  // Get all users
  app.get("/api/users", async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Failed to fetch users:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  // Get user by ID
  app.get("/api/users/:id", async (req, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(user);
    } catch (error) {
      console.error("Failed to fetch user:", error);
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  // Create user
  app.post("/api/users", async (req, res) => {
    try {
      const userData = {
        username: req.body.username,
        password: req.body.password,
        email: req.body.email,
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        phone: req.body.phone,
        role: req.body.role || 'member',
        isActive: req.body.isActive !== undefined ? req.body.isActive : true,
      };

      // Check for existing users using storage layer
      const existingUsername = await storage.getUserByUsername(userData.username);
      if (existingUsername) {
        return res.status(400).json({ error: "Username already exists" });
      }

      const existingEmail = await storage.getUserByEmail(userData.email);
      if (existingEmail) {
        return res.status(400).json({ error: "Email already exists" });
      }

      const createdUser = await storage.createUser(userData);
      res.status(201).json(createdUser);
    } catch (error) {
      console.error("Failed to create user:", error);
      res.status(500).json({ error: "Failed to create user" });
    }
  });

  // Update user
  app.patch("/api/users/:id", async (req, res) => {
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

      const user = await storage.updateUser(req.params.id, updates);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(user);
    } catch (error) {
      console.error("Failed to update user:", error);
      res.status(500).json({ error: "Failed to update user" });
    }
  });

  // Delete user
  app.delete("/api/users/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteUser(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "User not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Failed to delete user:", error);
      res.status(500).json({ error: "Failed to delete user" });
    }
  });

  // Get users by role
  app.get("/api/users/role/:role", async (req, res) => {
    try {
      const role = req.params.role;
      if (!roleEnum.includes(role as any)) {
        return res.status(400).json({ error: "Invalid role" });
      }
      const users = await storage.getUsersByRole(role);
      res.json(users);
    } catch (error) {
      console.error("Failed to fetch users by role:", error);
      res.status(500).json({ error: "Failed to fetch users by role" });
    }
  });

  // Get role permissions
  app.get("/api/roles/permissions", async (req, res) => {
    const { rolePermissions } = await import("@shared/schema");
    res.json(rolePermissions);
  });
}
