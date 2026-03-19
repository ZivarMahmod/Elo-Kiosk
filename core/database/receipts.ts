/**
 * Receipt CRUD operations
 */

import { getDatabase, generateId } from "./db";
import type { Receipt, CreateReceiptInput, UpdateReceiptInput } from "../types/receipt";

export async function getAllReceipts(): Promise<Receipt[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<any>(
    "SELECT * FROM receipts ORDER BY createdAt DESC"
  );
  return rows.map(parseReceiptRow);
}

export async function getReceiptsByDate(datum: string): Promise<Receipt[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<any>(
    "SELECT * FROM receipts WHERE datum = ? ORDER BY tid DESC",
    datum
  );
  return rows.map(parseReceiptRow);
}

export async function getReceiptById(id: string): Promise<Receipt | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<any>("SELECT * FROM receipts WHERE id = ?", id);
  return row ? parseReceiptRow(row) : null;
}

export async function createReceipt(input: CreateReceiptInput): Promise<Receipt> {
  const db = await getDatabase();
  const id = generateId("rcpt");
  const now = new Date().toISOString();

  await db.runAsync(
    `INSERT INTO receipts (id, kvittoNummer, datum, tid, items, total, status, tagged, tagType, betalning, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    input.kvittoNummer,
    input.datum,
    input.tid,
    JSON.stringify(input.items),
    input.total,
    input.status ?? "ej_registrerad",
    input.tagged ? 1 : 0,
    input.tagType ?? null,
    input.betalning ?? "Swish",
    now
  );

  return (await getReceiptById(id))!;
}

export async function updateReceipt(input: UpdateReceiptInput): Promise<Receipt | null> {
  const db = await getDatabase();
  const sets: string[] = [];
  const values: any[] = [];

  if (input.status !== undefined) { sets.push("status = ?"); values.push(input.status); }
  if (input.tagged !== undefined) { sets.push("tagged = ?"); values.push(input.tagged ? 1 : 0); }
  if (input.tagType !== undefined) { sets.push("tagType = ?"); values.push(input.tagType); }

  if (sets.length === 0) return getReceiptById(input.id);

  values.push(input.id);
  await db.runAsync(`UPDATE receipts SET ${sets.join(", ")} WHERE id = ?`, ...values);
  return getReceiptById(input.id);
}

export async function deleteReceipt(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync("DELETE FROM receipts WHERE id = ?", id);
}

export async function getReceiptCount(): Promise<number> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ count: number }>("SELECT COUNT(*) as count FROM receipts");
  return row?.count ?? 0;
}

export async function getTodayRevenue(): Promise<number> {
  const db = await getDatabase();
  const today = new Date().toISOString().split("T")[0];
  const row = await db.getFirstAsync<{ total: number }>(
    "SELECT COALESCE(SUM(total), 0) as total FROM receipts WHERE datum = ?",
    today
  );
  return row?.total ?? 0;
}

export async function getTodayReceiptCount(): Promise<number> {
  const db = await getDatabase();
  const today = new Date().toISOString().split("T")[0];
  const row = await db.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) as count FROM receipts WHERE datum = ?",
    today
  );
  return row?.count ?? 0;
}

function parseReceiptRow(row: any): Receipt {
  return {
    ...row,
    items: row.items ? JSON.parse(row.items) : [],
    tagged: row.tagged === 1,
  };
}
