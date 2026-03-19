/**
 * Receipt queries hook
 */

import { useState, useEffect, useCallback } from "react";
import {
  getAllReceipts,
  createReceipt,
  updateReceipt,
  deleteReceipt,
  getReceiptCount,
  getTodayRevenue,
  getTodayReceiptCount,
} from "@/core/database/receipts";
import type { Receipt, CreateReceiptInput, UpdateReceiptInput } from "@/core/types/receipt";

export function useReceipts() {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [count, setCount] = useState(0);
  const [todayRevenue, setTodayRevenue] = useState(0);
  const [todayCount, setTodayCount] = useState(0);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [data, c, rev, tc] = await Promise.all([
        getAllReceipts(),
        getReceiptCount(),
        getTodayRevenue(),
        getTodayReceiptCount(),
      ]);
      setReceipts(data);
      setCount(c);
      setTodayRevenue(rev);
      setTodayCount(tc);
    } catch (err) {
      console.error("[Receipts] Error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const add = useCallback(async (input: CreateReceiptInput) => {
    const result = await createReceipt(input);
    await refresh();
    return result;
  }, [refresh]);

  const update = useCallback(async (input: UpdateReceiptInput) => {
    const result = await updateReceipt(input);
    await refresh();
    return result;
  }, [refresh]);

  const remove = useCallback(async (id: string) => {
    await deleteReceipt(id);
    await refresh();
  }, [refresh]);

  return { receipts, loading, count, todayRevenue, todayCount, refresh, add, update, remove };
}
