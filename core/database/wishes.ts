/**
 * Wishes CRUD operations
 */

import { getDatabase, generateId } from "./db";
import type { Wish, CreateWishInput } from "../types/wish";

export async function getAllWishes(): Promise<Wish[]> {
  const db = await getDatabase();
  return db.getAllAsync<Wish>("SELECT * FROM wishes ORDER BY timestamp DESC");
}

export async function createWish(input: CreateWishInput): Promise<Wish> {
  const db = await getDatabase();
  const id = generateId("wish");
  const now = new Date().toISOString();

  await db.runAsync(
    "INSERT INTO wishes (id, category, text, timestamp) VALUES (?, ?, ?, ?)",
    id, input.category, input.text, now
  );

  return (await db.getFirstAsync<Wish>("SELECT * FROM wishes WHERE id = ?", id))!;
}

export async function deleteWish(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync("DELETE FROM wishes WHERE id = ?", id);
}

export async function getWishCount(): Promise<number> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ count: number }>("SELECT COUNT(*) as count FROM wishes");
  return row?.count ?? 0;
}
