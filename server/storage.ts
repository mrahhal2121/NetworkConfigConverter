import { type Conversion, type InsertConversion } from "@shared/schema";

export interface IStorage {
  saveConversion(conversion: InsertConversion): Promise<Conversion>;
  getConversion(id: number): Promise<Conversion | undefined>;
  listConversions(): Promise<Conversion[]>;
}

export class MemStorage implements IStorage {
  private conversions: Map<number, Conversion>;
  private currentId: number;

  constructor() {
    this.conversions = new Map();
    this.currentId = 1;
  }

  async saveConversion(conversion: InsertConversion): Promise<Conversion> {
    const id = this.currentId++;
    const newConversion: Conversion = { ...conversion, id };
    this.conversions.set(id, newConversion);
    return newConversion;
  }

  async getConversion(id: number): Promise<Conversion | undefined> {
    return this.conversions.get(id);
  }

  async listConversions(): Promise<Conversion[]> {
    return Array.from(this.conversions.values());
  }
}

export const storage = new MemStorage();
