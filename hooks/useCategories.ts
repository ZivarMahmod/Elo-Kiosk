/**
 * Category queries hook
 */

import { useState, useEffect, useCallback } from "react";
import {
  getAllCategories,
  getKioskCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoryCount,
} from "@/core/sync/pb-categories";
import type { Category, CreateCategoryInput, UpdateCategoryInput } from "@/core/types/category";

export function useCategories(kioskOnly: boolean = false) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = kioskOnly ? await getKioskCategories() : await getAllCategories();
      setCategories(data);
      const c = await getCategoryCount();
      setCount(c);
    } catch (err) {
      console.error("[Categories] Error:", err);
    } finally {
      setLoading(false);
    }
  }, [kioskOnly]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Auto-refresh for kiosk mode — poll every 30 seconds
  useEffect(() => {
    if (!kioskOnly) return;
    const interval = setInterval(refresh, 30000);
    return () => clearInterval(interval);
  }, [kioskOnly, refresh]);

  const add = useCallback(async (input: CreateCategoryInput) => {
    const result = await createCategory(input);
    await refresh();
    return result;
  }, [refresh]);

  const update = useCallback(async (input: UpdateCategoryInput) => {
    const result = await updateCategory(input);
    await refresh();
    return result;
  }, [refresh]);

  const remove = useCallback(async (id: string) => {
    await deleteCategory(id);
    await refresh();
  }, [refresh]);

  return { categories, loading, count, refresh, add, update, remove };
}
