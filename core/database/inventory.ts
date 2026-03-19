/**
 * Inventory & warehouse CRUD operations
 */

import { getDatabase, generateId } from "./db";
import type {
  Warehouse,
  CreateWarehouseInput,
  StockAllocation,
  CreateStockAllocationInput,
  StockAdjustment,
  CreateStockAdjustmentInput,
} from "../types/inventory";

// ── Warehouses ──

export async function getAllWarehouses(): Promise<Warehouse[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<any>("SELECT * FROM warehouses ORDER BY name ASC");
  return rows.map((r) => ({ ...r, status: r.status === 1 }));
}

export async function createWarehouse(input: CreateWarehouseInput): Promise<Warehouse> {
  const db = await getDatabase();
  const id = generateId("wh");
  const now = new Date().toISOString();
  await db.runAsync(
    "INSERT INTO warehouses (id, name, address, type, status, createdAt) VALUES (?, ?, ?, ?, ?, ?)",
    id, input.name, input.address ?? null, input.type ?? null, input.status !== false ? 1 : 0, now
  );
  const row = await db.getFirstAsync<any>("SELECT * FROM warehouses WHERE id = ?", id);
  return { ...row!, status: row!.status === 1 };
}

export async function deleteWarehouse(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync("DELETE FROM warehouses WHERE id = ?", id);
}

// ── Stock Allocations ──

export async function getStockAllocations(productId?: string): Promise<StockAllocation[]> {
  const db = await getDatabase();
  const query = productId
    ? "SELECT * FROM stock_allocations WHERE productId = ?"
    : "SELECT * FROM stock_allocations";
  const params = productId ? [productId] : [];
  return db.getAllAsync<StockAllocation>(query, ...params);
}

export async function createStockAllocation(input: CreateStockAllocationInput): Promise<StockAllocation> {
  const db = await getDatabase();
  const id = generateId("sa");
  const now = new Date().toISOString();
  await db.runAsync(
    "INSERT INTO stock_allocations (id, productId, warehouseId, quantity, reservedQuantity, createdAt) VALUES (?, ?, ?, ?, 0, ?)",
    id, input.productId, input.warehouseId, input.quantity, now
  );
  return (await db.getFirstAsync<StockAllocation>("SELECT * FROM stock_allocations WHERE id = ?", id))!;
}

// ── Stock Adjustments ──

export async function getStockAdjustments(productId?: string): Promise<StockAdjustment[]> {
  const db = await getDatabase();
  const query = productId
    ? "SELECT * FROM stock_adjustments WHERE productId = ? ORDER BY date DESC"
    : "SELECT * FROM stock_adjustments ORDER BY date DESC";
  const params = productId ? [productId] : [];
  return db.getAllAsync<StockAdjustment>(query, ...params);
}

export async function createStockAdjustment(input: CreateStockAdjustmentInput): Promise<StockAdjustment> {
  const db = await getDatabase();
  const id = generateId("adj");
  const now = new Date().toISOString();
  const date = now.split("T")[0];

  await db.runAsync(
    "INSERT INTO stock_adjustments (id, productId, quantity, reason, date, createdAt) VALUES (?, ?, ?, ?, ?, ?)",
    id, input.productId, input.quantity, input.reason, date, now
  );

  // Also update the product quantity
  await db.runAsync(
    "UPDATE products SET quantity = quantity + ?, updatedAt = ? WHERE id = ?",
    input.quantity, now, input.productId
  );

  return (await db.getFirstAsync<StockAdjustment>("SELECT * FROM stock_adjustments WHERE id = ?", id))!;
}
