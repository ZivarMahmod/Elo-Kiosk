/**
 * Database initialization and migrations
 * Uses expo-sqlite for local SQLite storage
 */

import * as SQLite from "expo-sqlite";
import { CREATE_TABLES_SQL, SCHEMA_VERSION } from "./schema";
import { DEFAULT_SETTINGS } from "../types/settings";

let _db: SQLite.SQLiteDatabase | null = null;

/**
 * Get or create the database instance
 */
export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (_db) return _db;
  _db = await SQLite.openDatabaseAsync("elo-kiosk.db");
  await initializeDatabase(_db);
  return _db;
}

/**
 * Initialize database with all tables and default data
 */
async function initializeDatabase(db: SQLite.SQLiteDatabase): Promise<void> {
  // Enable WAL mode for better performance
  await db.execAsync("PRAGMA journal_mode = WAL;");
  await db.execAsync("PRAGMA foreign_keys = ON;");

  // Create all tables
  await db.execAsync(CREATE_TABLES_SQL);

  // Check schema version and run migrations if needed
  const versionRow = await db.getFirstAsync<{ version: number }>(
    "SELECT version FROM schema_version LIMIT 1"
  );

  if (!versionRow) {
    // Fresh install — insert version and seed defaults
    await db.runAsync(
      "INSERT INTO schema_version (version) VALUES (?)",
      SCHEMA_VERSION
    );
    await seedDefaultSettings(db);
    await seedSampleData(db);
  } else if (versionRow.version < SCHEMA_VERSION) {
    // Run migrations
    await runMigrations(db, versionRow.version, SCHEMA_VERSION);
    await db.runAsync(
      "UPDATE schema_version SET version = ?",
      SCHEMA_VERSION
    );
  }
}

/**
 * Seed default settings into the settings table
 */
async function seedDefaultSettings(db: SQLite.SQLiteDatabase): Promise<void> {
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

/**
 * Seed sample data for demonstration
 */
async function seedSampleData(db: SQLite.SQLiteDatabase): Promise<void> {
  // Sample categories
  const categories = [
    { id: "cat-1", name: "Drycker", emoji: "\u2615", color: "#d5ddd8", subtitle: "Kaffe, te, juice", sortOrder: 1 },
    { id: "cat-2", name: "Snacks", emoji: "\uD83C\uDF6A", color: "#f0e6d3", subtitle: "Chips, godis, kex", sortOrder: 2 },
    { id: "cat-3", name: "Frukt", emoji: "\uD83C\uDF4E", color: "#d4e8d0", subtitle: "Frisk frukt", sortOrder: 3 },
    { id: "cat-4", name: "Mackor", emoji: "\uD83E\uDD6A", color: "#e8dfd0", subtitle: "Fyllda mackor", sortOrder: 4 },
  ];

  for (const cat of categories) {
    await db.runAsync(
      `INSERT OR IGNORE INTO categories (id, name, emoji, color, subtitle, sortOrder, status, showOnKiosk)
       VALUES (?, ?, ?, ?, ?, ?, 1, 1)`,
      cat.id, cat.name, cat.emoji, cat.color, cat.subtitle, cat.sortOrder
    );
  }

  // Sample products
  const products = [
    { id: "prod-1", name: "Kaffe", price: 25, categoryId: "cat-1", stockStatus: "i_lager", quantity: 50 },
    { id: "prod-2", name: "Te", price: 20, categoryId: "cat-1", stockStatus: "i_lager", quantity: 30 },
    { id: "prod-3", name: "Juice", price: 30, categoryId: "cat-1", stockStatus: "i_lager", quantity: 20 },
    { id: "prod-4", name: "Chips", price: 35, categoryId: "cat-2", stockStatus: "i_lager", quantity: 40 },
    { id: "prod-5", name: "Chokladkaka", price: 45, categoryId: "cat-2", stockStatus: "i_lager", quantity: 25 },
    { id: "prod-6", name: "Banan", price: 10, categoryId: "cat-3", stockStatus: "i_lager", quantity: 60 },
    { id: "prod-7", name: "Apple", price: 12, categoryId: "cat-3", stockStatus: "i_lager", quantity: 45 },
    { id: "prod-8", name: "Skinksmörgås", price: 55, categoryId: "cat-4", stockStatus: "i_lager", quantity: 15 },
    { id: "prod-9", name: "Ostmacka", price: 45, categoryId: "cat-4", stockStatus: "i_lager", quantity: 20 },
  ];

  for (const prod of products) {
    await db.runAsync(
      `INSERT OR IGNORE INTO products (id, name, price, categoryId, stockStatus, quantity, showOnKiosk, sku, vatRate)
       VALUES (?, ?, ?, ?, ?, ?, 1, '', 25)`,
      prod.id, prod.name, prod.price, prod.categoryId, prod.stockStatus, prod.quantity
    );
  }

  // Sample offer
  await db.runAsync(
    `INSERT OR IGNORE INTO offers (id, title, description, products, discount, offerPrice, isMainOffer)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    "offer-1",
    "Frukostpaket",
    "Kaffe + Macka",
    JSON.stringify([{ namn: "Kaffe", antal: 1 }, { namn: "Skinksmörgås", antal: 1 }]),
    10,
    70,
    1
  );
}

/**
 * Run database migrations from oldVersion to newVersion
 */
async function runMigrations(
  db: SQLite.SQLiteDatabase,
  _oldVersion: number,
  _newVersion: number
): Promise<void> {
  // Future migrations go here
  // if (oldVersion < 2) { await migrateToV2(db); }
}

/**
 * Generate a unique ID
 */
export function generateId(prefix: string = ""): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return prefix ? `${prefix}-${timestamp}${random}` : `${timestamp}${random}`;
}
