import { Express } from "express";
import { storage } from "../storage";
import { roleEnum, rolePermissions } from "@shared/schema";

// Static defaults for fallback and seeding
const staticDefaults: Record<string, string[]> = {
  admin: ["dashboard", "leads", "members", "workouts", "attendance", "payments", "admin", "reports", "trainers", "notifications"],
  manager: ["dashboard", "leads", "members", "workouts", "attendance", "payments", "reports", "trainers", "notifications"],
  trainer: ["dashboard", "members", "workouts", "attendance"],
  staff: ["dashboard", "leads", "members", "attendance"],
  member: ["dashboard"],
};

// Helper function to seed permissions if they don't exist
async function seedPermissionsIfNeeded() {
  try {
    for (const [role, permissions] of Object.entries(staticDefaults)) {
      const existing = await storage.getRolePermissionsByRole(role);
      if (!existing) {
        await storage.createRolePermission(role, permissions);
      }
    }
  } catch (error) {
    console.error("Failed to seed permissions:", error);
  }
}

export function registerRoleRoutes(app: Express) {
  // Seed permissions on first access (auto-create if not exists)
  app.get("/api/roles", async (req, res) => {
    try {
      // First seed permissions if they don't exist
      await seedPermissionsIfNeeded();
      
      const allPermissions = await storage.getRolePermissions();
      
      // Combine static roles with dynamic permissions from DB
      const roles = roleEnum.map(role => {
        const dbPerms = allPermissions.find(p => p.role === role);
        return {
          role,
          permissions: dbPerms?.permissions || staticDefaults[role] || [],
          updatedAt: dbPerms?.updatedAt || null
        };
      });
      
      res.json({ roles, allPermissions });
    } catch (error) {
      console.error("Failed to fetch roles:", error);
      res.status(500).json({ error: "Failed to fetch roles" });
    }
  });

  // Get all permissions
  app.get("/api/permissions", async (req, res) => {
    try {
      const allPermissions = await storage.getRolePermissions();
      const staticPermissions = rolePermissions;
      
      res.json({
        allPermissions,
        staticPermissions,
        availablePages: [
          { id: "dashboard", label: "Dashboard" },
          { id: "leads", label: "Leads" },
          { id: "members", label: "Members" },
          { id: "attendance", label: "Attendance" },
          { id: "workouts", label: "Workouts & Diet" },
          { id: "payments", label: "Payments" },
          { id: "trainers", label: "Personal Trainers" },
          { id: "reports", label: "Reports" },
          { id: "notifications", label: "Notifications" },
          { id: "admin", label: "Admin Settings" },
        ]
      });
    } catch (error) {
      console.error("Failed to fetch permissions:", error);
      res.status(500).json({ error: "Failed to fetch permissions" });
    }
  });

  // Get permissions for a specific role
  app.get("/api/roles/:role/permissions", async (req, res) => {
    try {
      const role = req.params.role;
      if (!roleEnum.includes(role as any)) {
        return res.status(400).json({ error: "Invalid role" });
      }
      
      const permissions = await storage.getPermissionsForRole(role);
      res.json({ role, permissions });
    } catch (error) {
      console.error("Failed to fetch role permissions:", error);
      res.status(500).json({ error: "Failed to fetch role permissions" });
    }
  });

  // Update permissions for a specific role (upsert - creates if not exists)
  app.put("/api/roles/:role/permissions", async (req, res) => {
    try {
      const role = req.params.role;
      if (!roleEnum.includes(role as any)) {
        return res.status(400).json({ error: "Invalid role" });
      }
      
      const { permissions } = req.body;
      if (!Array.isArray(permissions)) {
        return res.status(400).json({ error: "Permissions must be an array" });
      }
      
      const result = await storage.upsertRolePermissions(role, permissions);
      
      res.json({ 
        message: "Permissions saved successfully", 
        role, 
        permissions: result.permissions 
      });
    } catch (error) {
      console.error("Failed to save role permissions:", error);
      res.status(500).json({ error: "Failed to save role permissions" });
    }
  });

  // Get users by role
  app.get("/api/roles/:role/users", async (req, res) => {
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

  // Seed default role permissions (admin only)
  app.post("/api/roles/seed", async (req, res) => {
    try {
      await storage.seedRolePermissions();
      res.json({ message: "Role permissions seeded successfully" });
    } catch (error) {
      console.error("Failed to seed role permissions:", error);
      res.status(500).json({ error: "Failed to seed role permissions" });
    }
  });
}
