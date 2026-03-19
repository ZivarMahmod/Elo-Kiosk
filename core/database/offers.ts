/**
 * Offers CRUD operations
 */

import { getDatabase, generateId } from "./db";
import type { Offer, CreateOfferInput, UpdateOfferInput } from "../types/offer";

export async function getAllOffers(): Promise<Offer[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<any>("SELECT * FROM offers ORDER BY createdAt DESC");
  return rows.map(parseOfferRow);
}

export async function getOfferById(id: string): Promise<Offer | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<any>("SELECT * FROM offers WHERE id = ?", id);
  return row ? parseOfferRow(row) : null;
}

export async function createOffer(input: CreateOfferInput): Promise<Offer> {
  const db = await getDatabase();
  const id = generateId("offer");
  const now = new Date().toISOString();

  await db.runAsync(
    `INSERT INTO offers (id, title, description, products, discount, offerPrice, isMainOffer, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    input.title,
    input.description ?? "",
    JSON.stringify(input.products ?? []),
    input.discount ?? 0,
    input.offerPrice ?? 0,
    input.isMainOffer ? 1 : 0,
    now
  );

  return (await getOfferById(id))!;
}

export async function updateOffer(input: UpdateOfferInput): Promise<Offer | null> {
  const db = await getDatabase();
  const sets: string[] = [];
  const values: any[] = [];

  if (input.title !== undefined) { sets.push("title = ?"); values.push(input.title); }
  if (input.description !== undefined) { sets.push("description = ?"); values.push(input.description); }
  if (input.products !== undefined) { sets.push("products = ?"); values.push(JSON.stringify(input.products)); }
  if (input.discount !== undefined) { sets.push("discount = ?"); values.push(input.discount); }
  if (input.offerPrice !== undefined) { sets.push("offerPrice = ?"); values.push(input.offerPrice); }
  if (input.isMainOffer !== undefined) { sets.push("isMainOffer = ?"); values.push(input.isMainOffer ? 1 : 0); }

  if (sets.length === 0) return getOfferById(input.id);

  values.push(input.id);
  await db.runAsync(`UPDATE offers SET ${sets.join(", ")} WHERE id = ?`, ...values);
  return getOfferById(input.id);
}

export async function deleteOffer(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync("DELETE FROM offers WHERE id = ?", id);
}

function parseOfferRow(row: any): Offer {
  return {
    ...row,
    products: row.products ? JSON.parse(row.products) : [],
    isMainOffer: row.isMainOffer === 1,
  };
}
