/**
 * Product CRUD operations
 * All queries filter by kioskId for per-kiosk data isolation
 */

import { getDatabase, generateId } from "./db";
import { getActiveKioskId } from "../sync/pocketbase";
import type { Product, CreateProductInput, UpdateProductInput } from "../types/product";

export async function getAllProducts(): Promise<Product[]> {
  const db = await getDatabase();
  const kioskId = await getActiveKioskId();
  const rows = await db.getAllAsync<any>(
    "SELECT * FROM products WHERE kioskId = ? ORDER BY sortWeight ASC, name ASC",
    kioskId
  );
  return rows.map(parseProductRow);
}

export async function getProductsByCategory(categoryId: string): Promise<Product[]> {
  const db = await getDatabase();
  const kioskId = await getActiveKioskId();
  const rows = await db.getAllAsync<any>(
    "SELECT * FROM products WHERE kioskId = ? AND categoryId = ? ORDER BY sortWeight ASC, name ASC",
    kioskId, categoryId
  );
  return rows.map(parseProductRow);
}

export async function getKioskProducts(): Promise<Product[]> {
  const db = await getDatabase();
  const kioskId = await getActiveKioskId();
  const rows = await db.getAllAsync<any>(
    "SELECT * FROM products WHERE kioskId = ? AND showOnKiosk = 1 AND stockStatus != 'dold' ORDER BY sortWeight ASC, name ASC",
    kioskId
  );
  return rows.map(parseProductRow);
}

export async function getProductById(id: string): Promise<Product | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<any>("SELECT * FROM products WHERE id = ?", id);
  return row ? parseProductRow(row) : null;
}

export async function createProduct(input: CreateProductInput): Promise<Product> {
  const db = await getDatabase();
  const kioskId = await getActiveKioskId();
  const id = generateId("prod");
  const now = new Date().toISOString();

  await db.runAsync(
    `INSERT INTO products (id, kioskId, name, sku, price, quantity, categoryId, description, imageUrl,
      brand, descriptionShort, descriptionLong, campaignPrice, campaignFrom, campaignTo,
      backgroundColor, textColor, badgeLabel, badgeColor, stockStatus, minStockLevel,
      sortWeight, showOnKiosk, allergens, nutritionInfo, vatRate, costPrice, supplierName,
      internalNote, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    kioskId,
    input.name,
    input.sku ?? "",
    input.price,
    input.quantity ?? 0,
    input.categoryId ?? "",
    input.description ?? "",
    input.imageUrl ?? "",
    input.brand ?? "",
    input.descriptionShort ?? "",
    input.descriptionLong ?? "",
    input.campaignPrice ?? null,
    input.campaignFrom ?? null,
    input.campaignTo ?? null,
    input.backgroundColor ?? "",
    input.textColor ?? "",
    input.badgeLabel ?? "",
    input.badgeColor ?? "",
    input.stockStatus ?? "i_lager",
    input.minStockLevel ?? 0,
    input.sortWeight ?? 0,
    input.showOnKiosk !== false ? 1 : 0,
    JSON.stringify(input.allergens ?? []),
    input.nutritionInfo ?? "",
    input.vatRate ?? 25,
    input.costPrice ?? null,
    input.supplierName ?? "",
    input.internalNote ?? "",
    now
  );

  return (await getProductById(id))!;
}

export async function updateProduct(input: UpdateProductInput): Promise<Product | null> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  const sets: string[] = [];
  const values: any[] = [];

  const fields: Record<string, any> = { ...input };
  delete fields.id;

  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined) continue;
    if (key === "allergens") {
      sets.push("allergens = ?");
      values.push(JSON.stringify(value));
    } else if (key === "showOnKiosk") {
      sets.push("showOnKiosk = ?");
      values.push(value ? 1 : 0);
    } else {
      sets.push(`${key} = ?`);
      values.push(value);
    }
  }

  if (sets.length === 0) return getProductById(input.id);

  sets.push("updatedAt = ?");
  values.push(now);
  values.push(input.id);

  await db.runAsync(`UPDATE products SET ${sets.join(", ")} WHERE id = ?`, ...values);
  return getProductById(input.id);
}

export async function deleteProduct(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync("DELETE FROM products WHERE id = ?", id);
}

export async function getProductCount(): Promise<number> {
  const db = await getDatabase();
  const kioskId = await getActiveKioskId();
  const row = await db.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) as count FROM products WHERE kioskId = ?",
    kioskId
  );
  return row?.count ?? 0;
}

function parseProductRow(row: any): Product {
  return {
    ...row,
    showOnKiosk: row.showOnKiosk === 1,
    allergens: row.allergens ? JSON.parse(row.allergens) : [],
    campaignPrice: row.campaignPrice ?? null,
    costPrice: row.costPrice ?? null,
  };
}
