import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertConfigSchema, insertRuleSchema } from "@shared/schema";

export function registerRoutes(app: Express): Server {
  app.post("/api/configs", async (req, res) => {
    const parsed = insertConfigSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid config data" });
    }

    const config = await storage.saveConfig(parsed.data);
    res.json(config);
  });

  app.get("/api/configs", async (_req, res) => {
    const configs = await storage.getAllConfigs();
    res.json(configs);
  });

  app.get("/api/configs/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid ID" });
    }

    const config = await storage.getConfig(id);
    if (!config) {
      return res.status(404).json({ error: "Config not found" });
    }

    res.json(config);
  });

  app.post("/api/rules", async (req, res) => {
    const parsed = insertRuleSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid rule data" });
    }

    const rule = await storage.addRule(parsed.data);
    res.json(rule);
  });

  app.get("/api/rules", async (_req, res) => {
    const rules = await storage.getAllRules();
    res.json(rules);
  });

  const httpServer = createServer(app);
  return httpServer;
}
