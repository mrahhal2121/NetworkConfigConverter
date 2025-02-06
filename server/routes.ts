import type { Express } from "express";
import { createServer } from "http";
import { storage } from "./storage";
import { insertConversionSchema } from "@shared/schema";
import { ZodError } from "zod";

export function registerRoutes(app: Express) {
  app.post("/api/convert", async (req, res) => {
    try {
      const data = insertConversionSchema.parse(req.body);
      const result = await storage.saveConversion(data);
      res.json(result);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ error: error.errors });
      } else {
        res.status(500).json({ error: "Internal server error" });
      }
    }
  });

  app.get("/api/conversions/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const conversion = await storage.getConversion(id);
    
    if (!conversion) {
      res.status(404).json({ error: "Conversion not found" });
      return;
    }
    
    res.json(conversion);
  });

  app.get("/api/conversions", async (_req, res) => {
    const conversions = await storage.listConversions();
    res.json(conversions);
  });

  return createServer(app);
}
