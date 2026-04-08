import { type Express } from "express";
import { z } from "zod";
import { db } from "../db";
import * as schema from "@shared/schema";
import { eq, desc } from "drizzle-orm";

const createInterestOptionSchema = z.object({
  name: z.string().min(1, "Name is required"),
});

const updateInterestOptionSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  isActive: z.boolean().optional(),
});

const createHealthOptionSchema = z.object({
  name: z.string().min(1, "Name is required"),
});

const updateHealthOptionSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  isActive: z.boolean().optional(),
});

const createTrainingTypeSchema = z.object({
  name: z.string().min(1, "Name is required"),
});

const updateTrainingTypeSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  isActive: z.boolean().optional(),
});

export function registerOptionsRoutes(app: Express) {
  // ============ INTEREST OPTIONS ============
  
  // GET /api/options/interests - List all interest options
  app.get("/api/options/interests", async (req, res) => {
    try {
      const options = await db
        .select()
        .from(schema.interestOptions)
        .orderBy(schema.interestOptions.name);
      res.json(options);
    } catch (error) {
      console.error("Failed to get interest options:", error);
      res.status(500).json({ error: "Failed to get interest options" });
    }
  });

  // POST /api/options/interests - Create new interest option
  app.post("/api/options/interests", async (req, res) => {
    try {
      const data = createInterestOptionSchema.parse(req.body);
      
      const [created] = await db
        .insert(schema.interestOptions)
        .values({
          name: data.name,
          isActive: true,
        })
        .returning();
      
      res.status(201).json(created);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.issues.map(i => i.message).join(", ") });
      }
      console.error("Failed to create interest option:", error);
      res.status(500).json({ error: "Failed to create interest option" });
    }
  });

  // PATCH /api/options/interests/:id - Update interest option
  app.patch("/api/options/interests/:id", async (req, res) => {
    try {
      const id = req.params.id;
      const data = updateInterestOptionSchema.parse(req.body);
      
      const [updated] = await db
        .update(schema.interestOptions)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(schema.interestOptions.id, id))
        .returning();
      
      if (!updated) {
        return res.status(404).json({ error: "Interest option not found" });
      }
      
      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.issues.map(i => i.message).join(", ") });
      }
      console.error("Failed to update interest option:", error);
      res.status(500).json({ error: "Failed to update interest option" });
    }
  });

  // DELETE /api/options/interests/:id - Delete interest option
  app.delete("/api/options/interests/:id", async (req, res) => {
    try {
      const id = req.params.id;
      
      const [deleted] = await db
        .delete(schema.interestOptions)
        .where(eq(schema.interestOptions.id, id))
        .returning();
      
      if (!deleted) {
        return res.status(404).json({ error: "Interest option not found" });
      }
      
      res.json({ message: "Interest option deleted successfully" });
    } catch (error) {
      console.error("Failed to delete interest option:", error);
      res.status(500).json({ error: "Failed to delete interest option" });
    }
  });

  // ============ HEALTH OPTIONS ============
  
  // GET /api/options/health - List all health options
  app.get("/api/options/health", async (req, res) => {
    try {
      const options = await db
        .select()
        .from(schema.healthOptions)
        .orderBy(schema.healthOptions.name);
      res.json(options);
    } catch (error) {
      console.error("Failed to get health options:", error);
      res.status(500).json({ error: "Failed to get health options" });
    }
  });

  // POST /api/options/health - Create new health option
  app.post("/api/options/health", async (req, res) => {
    try {
      const data = createHealthOptionSchema.parse(req.body);
      
      const [created] = await db
        .insert(schema.healthOptions)
        .values({
          name: data.name,
          isActive: true,
        })
        .returning();
      
      res.status(201).json(created);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.issues.map(i => i.message).join(", ") });
      }
      console.error("Failed to create health option:", error);
      res.status(500).json({ error: "Failed to create health option" });
    }
  });

  // PATCH /api/options/health/:id - Update health option
  app.patch("/api/options/health/:id", async (req, res) => {
    try {
      const id = req.params.id;
      const data = updateHealthOptionSchema.parse(req.body);
      
      const [updated] = await db
        .update(schema.healthOptions)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(schema.healthOptions.id, id))
        .returning();
      
      if (!updated) {
        return res.status(404).json({ error: "Health option not found" });
      }
      
      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.issues.map(i => i.message).join(", ") });
      }
      console.error("Failed to update health option:", error);
      res.status(500).json({ error: "Failed to update health option" });
    }
  });

  // DELETE /api/options/health/:id - Delete health option
  app.delete("/api/options/health/:id", async (req, res) => {
    try {
      const id = req.params.id;
      
      const [deleted] = await db
        .delete(schema.healthOptions)
        .where(eq(schema.healthOptions.id, id))
        .returning();
      
      if (!deleted) {
        return res.status(404).json({ error: "Health option not found" });
      }
      
      res.json({ message: "Health option deleted successfully" });
    } catch (error) {
      console.error("Failed to delete health option:", error);
      res.status(500).json({ error: "Failed to delete health option" });
    }
  });

  // ============ TRAINING TYPES ============
  
  // GET /api/options/training-types - List all training types
  app.get("/api/options/training-types", async (req, res) => {
    try {
      const types = await db
        .select()
        .from(schema.trainingTypes)
        .orderBy(schema.trainingTypes.name);
      res.json(types);
    } catch (error) {
      console.error("Failed to get training types:", error);
      res.status(500).json({ error: "Failed to get training types" });
    }
  });

  // POST /api/options/training-types - Create new training type
  app.post("/api/options/training-types", async (req, res) => {
    try {
      const data = createTrainingTypeSchema.parse(req.body);
      
      const [created] = await db
        .insert(schema.trainingTypes)
        .values({
          name: data.name,
          isActive: true,
        })
        .returning();
      
      res.status(201).json(created);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.issues.map(i => i.message).join(", ") });
      }
      console.error("Failed to create training type:", error);
      res.status(500).json({ error: "Failed to create training type" });
    }
  });

  // PATCH /api/options/training-types/:id - Update training type
  app.patch("/api/options/training-types/:id", async (req, res) => {
    try {
      const id = req.params.id;
      const data = updateTrainingTypeSchema.parse(req.body);
      
      const [updated] = await db
        .update(schema.trainingTypes)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(schema.trainingTypes.id, id))
        .returning();
      
      if (!updated) {
        return res.status(404).json({ error: "Training type not found" });
      }
      
      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.issues.map(i => i.message).join(", ") });
      }
      console.error("Failed to update training type:", error);
      res.status(500).json({ error: "Failed to update training type" });
    }
  });

  // DELETE /api/options/training-types/:id - Delete training type
  app.delete("/api/options/training-types/:id", async (req, res) => {
    try {
      const id = req.params.id;
      
      const [deleted] = await db
        .delete(schema.trainingTypes)
        .where(eq(schema.trainingTypes.id, id))
        .returning();
      
      if (!deleted) {
        return res.status(404).json({ error: "Training type not found" });
      }
      
      res.json({ message: "Training type deleted successfully" });
    } catch (error) {
      console.error("Failed to delete training type:", error);
      res.status(500).json({ error: "Failed to delete training type" });
    }
  });
}
