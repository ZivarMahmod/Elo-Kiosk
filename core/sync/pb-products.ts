/**
 * PocketBase product CRUD — replaces SQLite for products
 * All operations go against pb_products collection
 */

import pb, { getActiveKioskId, getLicenseData } from "./pocketbase";
import type { Product, CreateProductInput, UpdateProductInput } from "../types/product";

function mapRecord(record: any): Product {
  return {
    id: record.id,
    name: record.name,
    sku: record.sku ?? "",
    price: record.price ?? 0,
    quantity: record.quantity ?? 0,
    categoryId: record.categoryId ?? "",
    description: record.description ?? "",
    imageUrl: record.imageUrl ?? "",
    stockStatus: record.stockStatus ?? "i_lager",
    showOnKiosk: record.showOnKiosk !== false,
    sortWeight: record.sortWeight ?? 0,
    badgeLabel: record.badgeLabel ?? "",
    badgeColor: record.badgeColor ?? "",
    campaignPrice: record.campaignPrice ?? null,
    vatRate: record.vatRate ?? 25,
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
    filter += ` && showOnKiosk = true && stockStatus != "dold"`;
  }
  return filter;
}

export async function getAllProducts(): Promise<Product[]> {
  const filter = await getFilter();
  const records = await pb.collection("pb_products").getFullList({
    filter,
    sort: "sortWeight,name",
  });
  return records.map(mapRecord);
}

export async function getKioskProducts(): Promise<Product[]> {
  const filter = await getFilter(true);
  const records = await pb.collection("pb_products").getFullList({
    filter,
    sort: "sortWeight,name",
  });
  return records.map(mapRecord);
}

export async function getProductsByCategory(categoryId: string): Promise<Product[]> {
  const kioskId = await getActiveKioskId();
  const license = await getLicenseData();
  const tenantId = license.tenantId || "";
  const records = await pb.collection("pb_products").getFullList({
    filter: `kioskId = "${kioskId}" && tenantId = "${tenantId}" && categoryId = "${categoryId}"`,
    sort: "sortWeight,name",
  });
  return records.map(mapRecord);
}

export async function getProductById(id: string): Promise<Product | null> {
  try {
    const record = await pb.collection("pb_products").getOne(id);
    return mapRecord(record);
  } catch {
    return null;
  }
}

export async function createProduct(input: CreateProductInput): Promise<Product> {
  const kioskId = await getActiveKioskId();
  const license = await getLicenseData();

  const record = await pb.collection("pb_products").create({
    kioskId,
    tenantId: license.tenantId || "",
    name: input.name,
    sku: input.sku ?? "",
    price: input.price,
    quantity: input.quantity ?? 0,
    categoryId: input.categoryId ?? "",
    description: input.description ?? "",
    imageUrl: input.imageUrl ?? "",
    stockStatus: input.stockStatus ?? "i_lager",
    showOnKiosk: input.showOnKiosk !== false,
    sortWeight: input.sortWeight ?? 0,
    badgeLabel: input.badgeLabel ?? "",
    badgeColor: input.badgeColor ?? "",
    campaignPrice: input.campaignPrice ?? null,
    vatRate: input.vatRate ?? 25,
  });

  return mapRecord(record);
}

export async function updateProduct(input: UpdateProductInput): Promise<Product | null> {
  const data: Record<string, any> = {};

  if (input.name !== undefined) data.name = input.name;
  if (input.sku !== undefined) data.sku = input.sku;
  if (input.price !== undefined) data.price = input.price;
  if (input.quantity !== undefined) data.quantity = input.quantity;
  if (input.categoryId !== undefined) data.categoryId = input.categoryId;
  if (input.description !== undefined) data.description = input.description;
  if (input.imageUrl !== undefined) data.imageUrl = input.imageUrl;
  if (input.stockStatus !== undefined) data.stockStatus = input.stockStatus;
  if (input.showOnKiosk !== undefined) data.showOnKiosk = input.showOnKiosk;
  if (input.sortWeight !== undefined) data.sortWeight = input.sortWeight;
  if (input.badgeLabel !== undefined) data.badgeLabel = input.badgeLabel;
  if (input.badgeColor !== undefined) data.badgeColor = input.badgeColor;
  if (input.campaignPrice !== undefined) data.campaignPrice = input.campaignPrice;
  if (input.vatRate !== undefined) data.vatRate = input.vatRate;

  if (Object.keys(data).length === 0) return getProductById(input.id);

  const record = await pb.collection("pb_products").update(input.id, data);
  return mapRecord(record);
}

export async function deleteProduct(id: string): Promise<void> {
  await pb.collection("pb_products").delete(id);
}

export async function getProductCount(): Promise<number> {
  const filter = await getFilter();
  const result = await pb.collection("pb_products").getList(1, 1, { filter });
  return result.totalItems;
}
