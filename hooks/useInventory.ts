/**
 * Inventory queries hook
 */

import { useState, useEffect, useCallback } from "react";
import {
  getAllWarehouses,
  createWarehouse,
  deleteWarehouse,
  getStockAdjustments,
  createStockAdjustment,
} from "@/core/database/inventory";
import type { Warehouse, StockAdjustment, CreateWarehouseInput, CreateStockAdjustmentInput } from "@/core/types/inventory";

export function useInventory() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [adjustments, setAdjustments] = useState<StockAdjustment[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [wh, adj] = await Promise.all([
        getAllWarehouses(),
        getStockAdjustments(),
      ]);
      setWarehouses(wh);
      setAdjustments(adj);
    } catch (err) {
      console.error("[Inventory] Error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addWarehouse = useCallback(async (input: CreateWarehouseInput) => {
    await createWarehouse(input);
    await refresh();
  }, [refresh]);

  const removeWarehouse = useCallback(async (id: string) => {
    await deleteWarehouse(id);
    await refresh();
  }, [refresh]);

  const addAdjustment = useCallback(async (input: CreateStockAdjustmentInput) => {
    await createStockAdjustment(input);
    await refresh();
  }, [refresh]);

  return { warehouses, adjustments, loading, refresh, addWarehouse, removeWarehouse, addAdjustment };
}
