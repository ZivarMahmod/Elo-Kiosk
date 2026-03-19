/**
 * Tags CRUD operations
 */

import { getDatabase, generateId } from "./db";
import type { Tag, CreateTagInput } from "../types/tag";

export async function getAllTags(): Promise<Tag[]> {
  const db = await getDatabase();
  return db.getAllAsync<Tag>("SELECT * FROM tags ORDER BY name ASC");
}

export async function createTag(input: CreateTagInput): Promise<Tag> {
  const db = await getDatabase();
  const id = generateId("tag");
  const now = new Date().toISOString();

  await db.runAsync(
    "INSERT INTO tags (id, name, emoji, color, createdAt) VALUES (?, ?, ?, ?, ?)",
    id, input.name, input.emoji ?? "", input.color ?? "#6b7c74", now
  );

  return (await db.getFirstAsync<Tag>("SELECT * FROM tags WHERE id = ?", id))!;
}

export async function deleteTag(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync("DELETE FROM tags WHERE id = ?", id);
}
