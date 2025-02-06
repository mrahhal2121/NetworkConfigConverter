import { configFiles, conversionRules, type Config, type InsertConfig, type Rule, type InsertRule } from "@shared/schema";

export interface IStorage {
  saveConfig(config: InsertConfig): Promise<Config>;
  getConfig(id: number): Promise<Config | undefined>;
  getAllConfigs(): Promise<Config[]>;
  addRule(rule: InsertRule): Promise<Rule>;
  getAllRules(): Promise<Rule[]>;
}

export class MemStorage implements IStorage {
  private configs: Map<number, Config>;
  private rules: Map<number, Rule>;
  private configId: number;
  private ruleId: number;

  constructor() {
    this.configs = new Map();
    this.rules = new Map();
    this.configId = 1;
    this.ruleId = 1;
  }

  async saveConfig(insertConfig: InsertConfig): Promise<Config> {
    const id = this.configId++;
    const config: Config = { ...insertConfig, id };
    this.configs.set(id, config);
    return config;
  }

  async getConfig(id: number): Promise<Config | undefined> {
    return this.configs.get(id);
  }

  async getAllConfigs(): Promise<Config[]> {
    return Array.from(this.configs.values());
  }

  async addRule(insertRule: InsertRule): Promise<Rule> {
    const id = this.ruleId++;
    const rule: Rule = { ...insertRule, id };
    this.rules.set(id, rule);
    return rule;
  }

  async getAllRules(): Promise<Rule[]> {
    return Array.from(this.rules.values());
  }
}

export const storage = new MemStorage();
