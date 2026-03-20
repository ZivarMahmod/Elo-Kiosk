/**
 * PocketBase category CRUD — replaces SQLite for categories
 * All operations go against pb_categories collection
 */

import pb, { getActiveKioskId, getLicenseData } from "./pocketbase";
import type { Category, CreateCategoryInput, UpdateCategoryInput } from "../types/category";

function mapRecord(record: any): Category {
  return {
    id: record.id,
    name: record.name,
    emoji: record.emoji ?? "",
    color: record.color ?? "#d5ddd8",
    subtitle: record.subtitle ?? "",
    sortOrder: record.sortOrder ?? 0,
    showOnKiosk: record.showOnKiosk !== false,
    status: record.status !== false,
    createdAt: record.created,
    updatedAt: record.updated,
  };
}

async function getFilter(kioskOnly: boolean = false): Promise<string> {
  const kioskId = await getActiveKioskId();
  const license = await getLicenseData();
  const tenantId = license.tenantId || "";
  let filter = `kioskId = "${kioskId}" && tenantId = "${tenantId}"`;
  if (kioskOnly) {
    filter += ` && showOnKiosk = true && status = true`;
  }
  return filter;
}

export async function getAllCategories(): Promise<Category[]> {
  const filter = await getFilter();
  const records = await pb.collection("pb_categories").getFullList({
    filter,
    sort: "sortOrder,name",
  });
  return records.map(mapRecord);
}

export async function getKioskCategories(): Promise<Category[]> {
  const filter = await getFilter(true);
  const records = await pb.collection("pb_categories").getFullList({
    filter,
    sort: "sortOrder,name",
  });
  return records.map(mapRecord);
}

export async function getCategoryById(id: string): Promise<Category | null> {
  try {
    const record = await pb.collection("pb_categories").getOne(id);
    return mapRecord(record);
  } catch {
    return null;
  }
}

export async function createCategory(input: CreateCategoryInput): Promise<Category> {
  const kioskId = await getActiveKioskId();
  const license = await getLicenseData();

  const record = await pb.collection("pb_categories").create({
    kioskId,
    tenantId: license.tenantId || "",
    name: input.name,
    emoji: input.emoji ?? "",
    color: input.color ?? "#d5ddd8",
    subtitle: input.subtitle ?? "",
    sortOrder: input.sortOrder ?? 0,
    showOnKiosk: input.showOnKiosk !== false,
    status: input.status !== false,
  });

  return mapRecord(record);
}

export async function updateCategory(input: UpdateCategoryInput): Promise<Category | null> {
  const data: Record<string, any> = {};

  if (input.name !== undefined) data.name = input.name;
  if (input.emoji !== undefined) data.emoji = input.emoji;
  if (input.color !== undefined) data.color = input.color;
  if (input.subtitle !== undefined) data.subtitle = input.subtitle;
  if (input.sortOrder !== undefined) data.sortOrder = input.sortOrder;
  if (input.showOnKiosk !== undefined) data.showOnKiosk = input.showOnKiosk;
  if (input.status !== undefined) data.status = input.status;

  if (Object.keys(data).length === 0) return getCategoryById(input.id);

  const record = await pb.collection("pb_categories").update(input.id, data);
  return mapRecord(record);
}

export async function deleteCategory(id: string): Promise<void> {
  await pb.collection("pb_categories").delete(id);
}

export async function getCategoryCount(): Promise<number> {
  const filter = await getFilter();
  const result = await pb.collection("pb_categories").getList(1, 1, { filter });
  return result.totalItems;
}
