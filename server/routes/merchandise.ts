import { Express } from "express";
import { storage } from "../storage";
import { insertInventorySchema, updateInventorySchema } from "@shared/schema";
import { z } from "zod";

export function registerMerchandiseRoutes(app: Express) {
  // Get all merchandise items
  app.get("/api/merchandise", async (req, res) => {
    try {
      const items = await storage.getAllInventory();
      res.json(items);
    } catch (error) {
      console.error("Failed to fetch merchandise:", error);
      res.status(500).json({ error: "Failed to fetch merchandise items" });
    }
  });

  // Get merchandise item by ID
  app.get("/api/merchandise/:id", async (req, res) => {
    try {
      const item = await storage.getInventoryItem(req.params.id);
      if (!item) {
        return res.status(404).json({ error: "Merchandise item not found" });
      }
      res.json(item);
    } catch (error) {
      console.error("Failed to fetch merchandise item:", error);
      res.status(500).json({ error: "Failed to fetch merchandise item" });
    }
  });

  // Create merchandise item
  app.post("/api/merchandise", async (req, res) => {
    try {
      const validatedData = insertInventorySchema.parse({
        ...req.body,
        type: 'Merchandise', // Ensure type is set to Merchandise
      });
      const item = await storage.createInventoryItem(validatedData);
      res.status(201).json(item);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation error", details: error.errors });
      }
      console.error("Failed to create merchandise item:", error);
      res.status(500).json({ error: "Failed to create merchandise item" });
    }
  });

  // Update merchandise item
  app.patch("/api/merchandise/:id", async (req, res) => {
    try {
      const validatedData = updateInventorySchema.parse(req.body);
      const item = await storage.updateInventoryItem(req.params.id, validatedData);
      if (!item) {
        return res.status(404).json({ error: "Merchandise item not found" });
      }
      res.json(item);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation error", details: error.errors });
      }
      console.error("Failed to update merchandise item:", error);
      res.status(500).json({ error: "Failed to update merchandise item" });
    }
  });

  // Delete merchandise item
  app.delete("/api/merchandise/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteInventoryItem(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Merchandise item not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Failed to delete merchandise item:", error);
      res.status(500).json({ error: "Failed to delete merchandise item" });
    }
  });

  // Get merchandise sales data
  app.get("/api/merchandise/sales", async (req, res) => {
    try {
      const items = await storage.getAllInventory();
      const salesData = items.map(item => ({
        id: item.id,
        name: item.name,
        category: item.category,
        sales: item.stock, // Using stock as a proxy for sales data
        revenue: item.stock * item.price,
      }));
      res.json(salesData);
    } catch (error) {
      console.error("Failed to fetch merchandise sales data:", error);
      res.status(500).json({ error: "Failed to fetch merchandise sales data" });
    }
  });

  // Get low stock items (items with stock <= 5 as threshold)
  app.get("/api/merchandise/low-stock", async (req, res) => {
    try {
      const items = await storage.getAllInventory();
      const lowStockItems = items.filter(item => item.stock <= 5);
      res.json(lowStockItems);
    } catch (error) {
      console.error("Failed to fetch low stock items:", error);
      res.status(500).json({ error: "Failed to fetch low stock items" });
    }
  });
}