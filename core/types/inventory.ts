/**
 * Inventory & warehouse type definitions
 */

export type StockTransferStatus = "pending" | "completed" | "cancelled";

export interface Warehouse {
  id: string;
  name: string;
  address?: string | null;
  type?: string | null;
  status: boolean;
  createdAt: string;
  updatedAt?: string | null;
}

export interface CreateWarehouseInput {
  name: string;
  address?: string | null;
  type?: string | null;
  status?: boolean;
}

export interface StockAllocation {
  id: string;
  productId: string;
  warehouseId: string;
  quantity: number;
  reservedQuantity: number;
  createdAt: string;
  updatedAt?: string | null;
}

export interface StockAdjustment {
  id: string;
  productId: string;
  quantity: number;
  reason: string;
  date: string;
  createdAt: string;
}

export interface CreateStockAllocationInput {
  productId: string;
  warehouseId: string;
  quantity: number;
}

export interface CreateStockAdjustmentInput {
  productId: string;
  quantity: number;
  reason: string;
}
