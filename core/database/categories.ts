/**
 * Category CRUD operations
 */

import { getDatabase, generateId } from "./db";
import type { Category, CreateCategoryInput, UpdateCategoryInput } from "../types/category";

export async function getAllCategories(): Promise<Category[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<any>(
    "SELECT * FROM categories ORDER BY sortOrder ASC, name ASC"
  );
  return rows.map(parseCategoryRow);
}

export async function getKioskCategories(): Promise<Category[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<any>(
    "SELECT * FROM categories WHERE showOnKiosk = 1 AND status = 1 ORDER BY sortOrder ASC, name ASC"
  );
  return rows.map(parseCategoryRow);
}

export async function getCategoryById(id: string): Promise<Category | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<any>("SELECT * FROM categories WHERE id = ?", id);
  return row ? parseCategoryRow(row) : null;
}

export async function createCategory(input: CreateCategoryInput): Promise<Category> {
  const db = await getDatabase();
  const id = generateId("cat");
  const now = new Date().toISOString();

  await db.runAsync(
    `INSERT INTO categories (id, name, status, description, emoji, color, subtitle, parentId,
      visibleFrom, visibleTo, bannerImageUrl, sortOrder, showOnKiosk, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    input.name,
    input.status !== false ? 1 : 0,
    input.description ?? null,
    input.emoji ?? "",
    input.color ?? "#d5ddd8",
    input.subtitle ?? "",
    input.parentId ?? null,
    input.visibleFrom ?? null,
    input.visibleTo ?? null,
    input.bannerImageUrl ?? null,
    input.sortOrder ?? 0,
    input.showOnKiosk !== false ? 1 : 0,
    now
  );

  return (await getCategoryById(id))!;
}

export async function updateCategory(input: UpdateCategoryInput): Promise<Category | null> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  const sets: string[] = [];
  const values: any[] = [];

  const fields: Record<string, any> = { ...input };
  delete fields.id;

  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined) continue;
    if (key === "status" || key === "showOnKiosk") {
      sets.push(`${key} = ?`);
      values.push(value ? 1 : 0);
    } else {
      sets.push(`${key} = ?`);
      values.push(value);
    }
  }

  if (sets.length === 0) return getCategoryById(input.id);

  sets.push("updatedAt = ?");
  values.push(now);
  values.push(input.id);

  await db.runAsync(`UPDATE categories SET ${sets.join(", ")} WHERE id = ?`, ...values);
  return getCategoryById(input.id);
}

export async function deleteCategory(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync("DELETE FROM categories WHERE id = ?", id);
}

export async function getCategoryCount(): Promise<number> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ count: number }>("SELECT COUNT(*) as count FROM categories");
  return row?.count ?? 0;
}

function parseCategoryRow(row: any): Category {
  return {
    ...row,
    status: row.status === 1,
    showOnKiosk: row.showOnKiosk === 1,
  };
}
