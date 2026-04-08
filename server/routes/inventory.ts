import { Express } from "express";
import { storage } from "../storage";
import { insertInventorySchema, updateInventorySchema } from "@shared/schema";
import { z } from "zod";

export function registerInventoryRoutes(app: Express) {
  // Get all inventory items
  app.get("/api/inventory", async (req, res) => {
    try {
      const items = await storage.getAllInventory();
      res.json(items);
    } catch (error) {
      console.error("Failed to fetch inventory:", error);
      res.status(500).json({ error: "Failed to fetch inventory items" });
    }
  });

  // Get inventory item by ID
  app.get("/api/inventory/:id", async (req, res) => {
    try {
      const item = await storage.getInventoryItem(req.params.id);
      if (!item) {
        return res.status(404).json({ error: "Inventory item not found" });
      }
      res.json(item);
    } catch (error) {
      console.error("Failed to fetch inventory item:", error);
      res.status(500).json({ error: "Failed to fetch inventory item" });
    }
  });

  // Create inventory item
  app.post("/api/inventory", async (req, res) => {
    try {
      const validatedData = insertInventorySchema.parse(req.body);
      const item = await storage.createInventoryItem(validatedData);
      res.status(201).json(item);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation error", details: error.errors });
      }
      console.error("Failed to create inventory item:", error);
      res.status(500).json({ error: "Failed to create item" });
    }
  });

  // Update inventory item
  app.patch("/api/inventory/:id", async (req, res) => {
    try {
      const validatedData = updateInventorySchema.parse(req.body);
      const item = await storage.updateInventoryItem(req.params.id, validatedData);
      if (!item) {
        return res.status(404).json({ error: "Item not found" });
      }
      res.json(item);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation error", details: error.errors });
      }
      console.error("Failed to update inventory item:", error);
      res.status(500).json({ error: "Failed to update item" });
    }
  });

  // Delete inventory item
  app.delete("/api/inventory/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteInventoryItem(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Item not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Failed to delete inventory item:", error);
      res.status(500).json({ error: "Failed to delete item" });
    }
  });
}
