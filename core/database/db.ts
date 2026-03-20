/**
 * Database initialization and migrations
 * Uses expo-sqlite on native, localStorage on web
 */

import { Platform } from "react-native";
import { CREATE_TABLES_SQL, SCHEMA_VERSION } from "./schema";
import { DEFAULT_SETTINGS } from "../types/settings";

// ── Web-compatible database interface ──
interface DbRow { [key: string]: any; }

interface DatabaseInterface {
  execAsync(sql: string): Promise<void>;
  runAsync(sql: string, ...params: any[]): Promise<{ lastInsertRowId: number; changes: number }>;
  getFirstAsync<T = DbRow>(sql: string, ...params: any[]): Promise<T | null>;
  getAllAsync<T = DbRow>(sql: string, ...params: any[]): Promise<T[]>;
}

// ── localStorage-based database for web ──
class WebDatabase implements DatabaseInterface {
  private store: Map<string, any[]> = new Map();
  private prefix = "elo_db_";

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    if (typeof window === "undefined") return;
    try {
      const keys = Object.keys(localStorage).filter(k => k.startsWith(this.prefix));
      for (const key of keys) {
        const table = key.replace(this.prefix, "");
        this.store.set(table, JSON.parse(localStorage.getItem(key) || "[]"));
      }
    } catch { }
  }

  private saveTable(table: string) {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(this.prefix + table, JSON.stringify(this.store.get(table) || []));
    } catch { }
  }

  private getTable(name: string): any[] {
    if (!this.store.has(name)) this.store.set(name, []);
    return this.store.get(name)!;
  }

  private parseSQL(sql: string): { action: string; table: string } {
    const normalized = sql.trim().toUpperCase();
    const tableMatch = sql.match(/(?:FROM|INTO|UPDATE|TABLE(?:\s+IF\s+NOT\s+EXISTS)?)\s+[`"]?(\w+)[`"]?/i);
    const table = tableMatch?.[1] || "";
    let action = "OTHER";
    if (normalized.startsWith("SELECT")) action = "SELECT";
    else if (normalized.startsWith("INSERT")) action = "INSERT";
    else if (normalized.startsWith("UPDATE")) action = "UPDATE";
    else if (normalized.startsWith("DELETE")) action = "DELETE";
    else if (normalized.startsWith("CREATE")) action = "CREATE";
    return { action, table };
  }

  async execAsync(sql: string): Promise<void> {
    // For CREATE TABLE and PRAGMA, just ensure tables exist
    const creates = sql.match(/CREATE TABLE IF NOT EXISTS\s+(\w+)/gi) || [];
    for (const c of creates) {
      const name = c.replace(/CREATE TABLE IF NOT EXISTS\s+/i, "").trim();
      if (!this.store.has(name)) {
        this.store.set(name, []);
        this.saveTable(name);
      }
    }
  }

  async runAsync(sql: string, ...params: any[]): Promise<{ lastInsertRowId: number; changes: number }> {
    const { action, table } = this.parseSQL(sql);
    const flatParams = params.flat();

    if (action === "INSERT") {
      const colMatch = sql.match(/\(([^)]+)\)\s*VALUES/i);
      if (colMatch) {
        const cols = colMatch[1].split(",").map(c => c.trim().replace(/[`"]/g, ""));
        const row: any = {};
        cols.forEach((col, i) => {
          row[col] = flatParams[i] !== undefined ? flatParams[i] : null;
        });
        if (!row.id) row.id = generateId();
        const rows = this.getTable(table);
        // OR IGNORE: skip if id exists
        if (sql.toUpperCase().includes("OR IGNORE")) {
          if (!rows.find((r: any) => r.id === row.id)) {
            rows.push(row);
          }
        } else {
          // OR REPLACE: remove existing and add new
          const idx = rows.findIndex((r: any) => r.id === row.id);
          if (idx >= 0) rows[idx] = row;
          else rows.push(row);
        }
        this.saveTable(table);
        return { lastInsertRowId: rows.length, changes: 1 };
      }
    }

    if (action === "UPDATE") {
      const rows = this.getTable(table);
      // Simple WHERE id = ? or WHERE key = ?
      const whereMatch = sql.match(/WHERE\s+(\w+)\s*=\s*\?/i);
      if (whereMatch) {
        const whereCol = whereMatch[1];
        const whereVal = flatParams[flatParams.length - 1];
        const setMatch = sql.match(/SET\s+(.*?)\s+WHERE/i);
        if (setMatch) {
          const setParts = setMatch[1].split(",").map(s => s.trim());
          let paramIdx = 0;
          let changes = 0;
          for (const row of rows) {
            if (String(row[whereCol]) === String(whereVal)) {
              for (const part of setParts) {
                const colName = part.split("=")[0].trim().replace(/[`"]/g, "");
                if (part.includes("?")) {
                  row[colName] = flatParams[paramIdx++];
                }
              }
              changes++;
            }
          }
          this.saveTable(table);
          return { lastInsertRowId: 0, changes };
        }
      }
    }

    if (action === "DELETE") {
      const rows = this.getTable(table);
      const whereMatch = sql.match(/WHERE\s+(\w+)\s*=\s*\?/i);
      if (whereMatch) {
        const whereCol = whereMatch[1];
        const whereVal = flatParams[0];
        const before = rows.length;
        const filtered = rows.filter((r: any) => String(r[whereCol]) !== String(whereVal));
        this.store.set(table, filtered);
        this.saveTable(table);
        return { lastInsertRowId: 0, changes: before - filtered.length };
      }
      // DELETE all
      if (!sql.toUpperCase().includes("WHERE")) {
        const count = rows.length;
        this.store.set(table, []);
        this.saveTable(table);
        return { lastInsertRowId: 0, changes: count };
      }
    }

    return { lastInsertRowId: 0, changes: 0 };
  }

  async getFirstAsync<T = DbRow>(sql: string, ...params: any[]): Promise<T | null> {
    const results = await this.getAllAsync<T>(sql, ...params);
    return results[0] || null;
  }

  async getAllAsync<T = DbRow>(sql: string, ...params: any[]): Promise<T[]> {
    const { table } = this.parseSQL(sql);
    const flatParams = params.flat();
    let rows = [...this.getTable(table)];

    // Apply WHERE clause
    const whereMatches = [...sql.matchAll(/WHERE\s+.*?(\w+)\s*=\s*\?/gi)];
    if (whereMatches.length > 0) {
      // Simple single WHERE
      const whereMatch = sql.match(/WHERE\s+(\w+)\s*=\s*\?/i);
      if (whereMatch) {
        const col = whereMatch[1];
        const val = flatParams[0];
        rows = rows.filter(r => String(r[col]) === String(val));
      }
    }

    // Apply ORDER BY
    const orderMatch = sql.match(/ORDER BY\s+(\w+)\s*(ASC|DESC)?/i);
    if (orderMatch) {
      const col = orderMatch[1];
      const dir = (orderMatch[2] || "ASC").toUpperCase();
      rows.sort((a, b) => {
        const av = a[col], bv = b[col];
        if (av < bv) return dir === "ASC" ? -1 : 1;
        if (av > bv) return dir === "ASC" ? 1 : -1;
        return 0;
      });
    }

    // Apply LIMIT
    const limitMatch = sql.match(/LIMIT\s+(\d+)/i);
    if (limitMatch) {
      rows = rows.slice(0, parseInt(limitMatch[1]));
    }

    return rows as T[];
  }
}

// ── Database singleton ──
let _db: DatabaseInterface | null = null;

export async function getDatabase(): Promise<DatabaseInterface> {
  if (_db) return _db;

  if (Platform.OS === "web") {
    _db = new WebDatabase();
    await initializeDatabase(_db);
    return _db;
  }

  // Native: use expo-sqlite
  const SQLite = require("expo-sqlite");
  const nativeDb = await SQLite.openDatabaseAsync("elo-kiosk.db");
  _db = nativeDb;
  await initializeDatabase(_db!);
  return _db!;
}

async function initializeDatabase(db: DatabaseInterface): Promise<void> {
  if (Platform.OS !== "web") {
    await db.execAsync("PRAGMA journal_mode = WAL;");
    await db.execAsync("PRAGMA foreign_keys = ON;");
  }

  await db.execAsync(CREATE_TABLES_SQL);

  const versionRow = await db.getFirstAsync<{ version: number }>(
    "SELECT version FROM schema_version LIMIT 1"
  );

  if (!versionRow) {
    await db.runAsync(
      "INSERT INTO schema_version (version) VALUES (?)",
      SCHEMA_VERSION
    );
    await seedDefaultSettings(db);
    await seedSampleData(db);
  }
}

async function seedDefaultSettings(db: DatabaseInterface): Promise<void> {
  const entries = Object.entries(DEFAULT_SETTINGS);
  for (const [key, value] of entries) {
    const serialized = typeof value === "object" ? JSON.stringify(value) : String(value);
    await db.runAsync(
      "INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)",
      key,
      serialized
    );
  }
}

async function seedSampleData(db: DatabaseInterface): Promise<void> {
  const categories = [
    { id: "cat-1", name: "Dryck", emoji: "🥤", color: "#3b82f6", subtitle: "Läsk, energi, kaffe", sortOrder: 1 },
    { id: "cat-2", name: "Snacks", emoji: "🍫", color: "#f59e0b", subtitle: "Chips, choklad, bars", sortOrder: 2 },
    { id: "cat-3", name: "Mellanmål", emoji: "🍨", color: "#8b5cf6", subtitle: "Pudding, proteinbars", sortOrder: 3 },
    { id: "cat-4", name: "Mat", emoji: "🍕", color: "#ef4444", subtitle: "Pizza, nudlar, varm mat", sortOrder: 4 },
  ];

  for (const cat of categories) {
    await db.runAsync(
      "INSERT OR IGNORE INTO categories (id, name, emoji, color, subtitle, sortOrder, status, showOnKiosk) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      cat.id, cat.name, cat.emoji, cat.color, cat.subtitle, cat.sortOrder, 1, 1
    );
  }

  const products = [
    { id: "p1", name: "Coca-Cola Zero", price: 15, categoryId: "cat-1" },
    { id: "p2", name: "Pepsi Max", price: 15, categoryId: "cat-1" },
    { id: "p3", name: "Red Bull", price: 22, categoryId: "cat-1" },
    { id: "p4", name: "Nocco", price: 25, categoryId: "cat-1" },
    { id: "p5", name: "Celsius", price: 25, categoryId: "cat-1" },
    { id: "p6", name: "Monster Energy", price: 22, categoryId: "cat-1" },
    { id: "p7", name: "Fanta Orange", price: 15, categoryId: "cat-1" },
    { id: "p8", name: "Bonaqua", price: 15, categoryId: "cat-1" },
    { id: "p9", name: "Kexchoklad", price: 15, categoryId: "cat-2" },
    { id: "p10", name: "Pringles", price: 18, categoryId: "cat-2" },
    { id: "p11", name: "Svenska Lantchips", price: 20, categoryId: "cat-2" },
    { id: "p12", name: "Corny Big", price: 15, categoryId: "cat-2" },
    { id: "p13", name: "Flapjack", price: 18, categoryId: "cat-2" },
    { id: "p14", name: "Sportlunch Dubbel", price: 18, categoryId: "cat-2" },
    { id: "p15", name: "Risifrutti", price: 18, categoryId: "cat-3" },
    { id: "p16", name: "Arla Proteinpudding", price: 18, categoryId: "cat-3" },
    { id: "p17", name: "Proteinbar", price: 20, categoryId: "cat-3" },
    { id: "p18", name: "Billys Pan Pizza Original", price: 25, categoryId: "cat-4" },
    { id: "p19", name: "Billys Pan Pizza Hawaii", price: 25, categoryId: "cat-4" },
    { id: "p20", name: "Nudlar", price: 20, categoryId: "cat-4" },
  ];

  for (const prod of products) {
    await db.runAsync(
      "INSERT OR IGNORE INTO products (id, name, price, categoryId, stockStatus, quantity, showOnKiosk, sku, vatRate) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      prod.id, prod.name, prod.price, prod.categoryId, "i_lager", 30, 1, "", 25
    );
  }

  await db.runAsync(
    "INSERT OR IGNORE INTO offers (id, title, description, products, discount, offerPrice, isMainOffer) VALUES (?, ?, ?, ?, ?, ?, ?)",
    "offer-1", "Nocco + Proteinbar", "Köp båda för 40 kr — spara 5 kr", JSON.stringify([{ namn: "Nocco", antal: 1 }, { namn: "Proteinbar", antal: 1 }]), 5, 40, 1
  );
}

export function generateId(prefix: string = ""): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return prefix ? `${prefix}-${timestamp}${random}` : `${timestamp}${random}`;
}

export type { DatabaseInterface };
