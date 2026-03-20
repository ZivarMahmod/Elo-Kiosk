/**
 * Product queries hook
 */

import { useState, useEffect, useCallback } from "react";
import {
  getAllProducts,
  getKioskProducts,
  getProductsByCategory,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductCount,
} from "@/core/sync/pb-products";
import type { Product, CreateProductInput, UpdateProductInput } from "@/core/types/product";

export function useProducts(kioskOnly: boolean = false) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = kioskOnly ? await getKioskProducts() : await getAllProducts();
      setProducts(data);
      const c = await getProductCount();
      setCount(c);
    } catch (err) {
      console.error("[Products] Error:", err);
    } finally {
      setLoading(false);
    }
  }, [kioskOnly]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const add = useCallback(async (input: CreateProductInput) => {
    const result = await createProduct(input);
    await refresh();
    return result;
  }, [refresh]);

  const update = useCallback(async (input: UpdateProductInput) => {
    const result = await updateProduct(input);
    await refresh();
    return result;
  }, [refresh]);

  const remove = useCallback(async (id: string) => {
    await deleteProduct(id);
    await refresh();
  }, [refresh]);

  const getByCategory = useCallback(async (categoryId: string) => {
    return getProductsByCategory(categoryId);
  }, []);

  return { products, loading, count, refresh, add, update, remove, getByCategory };
}
