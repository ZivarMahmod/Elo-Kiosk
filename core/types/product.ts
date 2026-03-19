/**
 * Product-related type definitions
 * Copied from admin portal with all enhanced kiosk fields
 */

export type ProductStatus = "Available" | "Stock Low" | "Stock Out";
export type StockStatus = "i_lager" | "slut" | "dold" | "kommande";
export type VatRate = 0 | 6 | 12 | 25;

export type Allergen =
  | "gluten"
  | "laktos"
  | "notter"
  | "agg"
  | "fisk"
  | "soja"
  | "selleri"
  | "senap"
  | "sesam"
  | "lupin"
  | "blotdjur"
  | "sulfiter";

export const ALLERGEN_LABELS: Record<Allergen, string> = {
  gluten: "Gluten",
  laktos: "Laktos",
  notter: "Notter",
  agg: "Agg",
  fisk: "Fisk",
  soja: "Soja",
  selleri: "Selleri",
  senap: "Senap",
  sesam: "Sesam",
  lupin: "Lupin",
  blotdjur: "Blotdjur",
  sulfiter: "Sulfiter",
};

export const BADGE_PRESETS = [
  "Nyhet",
  "Popular",
  "Slut snart",
  "Vegetarisk",
  "Vegan",
  "Glutenfri",
] as const;

export const STOCK_STATUS_LABELS: Record<StockStatus, string> = {
  i_lager: "I lager",
  slut: "Slut",
  dold: "Dold",
  kommande: "Kommande",
};

export interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  quantity: number;
  status?: ProductStatus;
  createdAt: string;
  updatedAt?: string | null;
  categoryId: string;
  description?: string;
  imageUrl?: string;

  // Enhanced kiosk fields
  brand?: string;
  descriptionShort?: string;
  descriptionLong?: string;
  campaignPrice?: number | null;
  campaignFrom?: string | null;
  campaignTo?: string | null;
  backgroundColor?: string;
  textColor?: string;
  badgeLabel?: string;
  badgeColor?: string;
  stockStatus?: StockStatus;
  minStockLevel?: number;
  sortWeight?: number;
  showOnKiosk?: boolean;
  allergens?: Allergen[];
  nutritionInfo?: string;
  vatRate?: VatRate;
  costPrice?: number | null;
  supplierName?: string;
  internalNote?: string;
}

export interface CreateProductInput {
  name: string;
  sku?: string;
  price: number;
  quantity?: number;
  categoryId?: string;
  description?: string;
  imageUrl?: string;

  brand?: string;
  descriptionShort?: string;
  descriptionLong?: string;
  campaignPrice?: number | null;
  campaignFrom?: string | null;
  campaignTo?: string | null;
  backgroundColor?: string;
  textColor?: string;
  badgeLabel?: string;
  badgeColor?: string;
  stockStatus?: StockStatus;
  minStockLevel?: number;
  sortWeight?: number;
  showOnKiosk?: boolean;
  allergens?: Allergen[];
  nutritionInfo?: string;
  vatRate?: VatRate;
  costPrice?: number | null;
  supplierName?: string;
  internalNote?: string;
}

export interface UpdateProductInput {
  id: string;
  name?: string;
  sku?: string;
  price?: number;
  quantity?: number;
  categoryId?: string;
  description?: string;
  imageUrl?: string;

  brand?: string;
  descriptionShort?: string;
  descriptionLong?: string;
  campaignPrice?: number | null;
  campaignFrom?: string | null;
  campaignTo?: string | null;
  backgroundColor?: string;
  textColor?: string;
  badgeLabel?: string;
  badgeColor?: string;
  stockStatus?: StockStatus;
  minStockLevel?: number;
  sortWeight?: number;
  showOnKiosk?: boolean;
  allergens?: Allergen[];
  nutritionInfo?: string;
  vatRate?: VatRate;
  costPrice?: number | null;
  supplierName?: string;
  internalNote?: string;
}
