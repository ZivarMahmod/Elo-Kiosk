/**
 * Admin Products page — list, add, edit products
 */

import { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Modal, Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useProducts } from "@/hooks/useProducts";
import { useCategories } from "@/hooks/useCategories";
import type { Product } from "@/core/types/product";
import { STOCK_STATUS_LABELS } from "@/core/types/product";

export default function ProductsPage() {
  const { products, loading, add, update, remove, refresh } = useProducts();
  const { categories } = useCategories();
  const [showForm, setShowForm] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [search, setSearch] = useState("");

  // Form state
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [stockStatus, setStockStatus] = useState("i_lager");

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const openAdd = () => {
    setEditProduct(null);
    setName("");
    setPrice("");
    setCategoryId(categories[0]?.id ?? "");
    setStockStatus("i_lager");
    setShowForm(true);
  };

  const openEdit = (p: Product) => {
    setEditProduct(p);
    setName(p.name);
    setPrice(String(p.price));
    setCategoryId(p.categoryId);
    setStockStatus(p.stockStatus || "i_lager");
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    if (editProduct) {
      await update({
        id: editProduct.id,
        name: name.trim(),
        price: Number(price) || 0,
        categoryId,
        stockStatus: stockStatus as any,
      });
    } else {
      await add({
        name: name.trim(),
        price: Number(price) || 0,
        categoryId,
        stockStatus: stockStatus as any,
      });
    }
    setShowForm(false);
  };

  const handleDelete = (p: Product) => {
    Alert.alert("Ta bort", `Vill du ta bort "${p.name}"?`, [
      { text: "Avbryt" },
      { text: "Ta bort", style: "destructive", onPress: () => remove(p.id) },
    ]);
  };

  const getCategoryName = (id: string) =>
    categories.find((c) => c.id === id)?.name ?? "Okänd";

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Produkter</Text>
          <Text style={styles.subtitle}>{products.length} produkter totalt</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.addBtnText}>Ny produkt</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <Ionicons name="search-outline" size={18} color="#8a9b93" />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Sök produkter..."
          placeholderTextColor="#a0a0a0"
        />
      </View>

      {/* Table */}
      <View style={styles.tableHeader}>
        <Text style={[styles.th, { flex: 2 }]}>Namn</Text>
        <Text style={[styles.th, { flex: 1 }]}>Pris</Text>
        <Text style={[styles.th, { flex: 1 }]}>Kategori</Text>
        <Text style={[styles.th, { flex: 1 }]}>Status</Text>
        <Text style={[styles.th, { width: 80 }]}>Antal</Text>
        <Text style={[styles.th, { width: 100 }]}></Text>
      </View>

      <ScrollView style={styles.tableBody}>
        {filtered.map((p) => (
          <View key={p.id} style={styles.row}>
            <Text style={[styles.td, { flex: 2, fontWeight: "600" }]}>{p.name}</Text>
            <Text style={[styles.td, { flex: 1 }]}>{p.price} kr</Text>
            <Text style={[styles.td, { flex: 1 }]}>{getCategoryName(p.categoryId)}</Text>
            <View style={{ flex: 1, justifyContent: "center" }}>
              <View style={[styles.statusBadge, { backgroundColor: p.stockStatus === "i_lager" ? "#e8f5ee" : p.stockStatus === "slut" ? "#fde8e8" : "#f5ede4" }]}>
                <Text style={[styles.statusText, { color: p.stockStatus === "i_lager" ? "#2d6b5a" : p.stockStatus === "slut" ? "#dc2626" : "#c47a3a" }]}>
                  {STOCK_STATUS_LABELS[p.stockStatus || "i_lager"]}
                </Text>
              </View>
            </View>
            <Text style={[styles.td, { width: 80, textAlign: "center" }]}>{p.quantity}</Text>
            <View style={{ width: 100, flexDirection: "row", gap: 8, alignItems: "center" }}>
              <TouchableOpacity onPress={() => openEdit(p)}>
                <Ionicons name="create-outline" size={20} color="#5b8fa8" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDelete(p)}>
                <Ionicons name="trash-outline" size={20} color="#dc2626" />
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Add/Edit Modal */}
      <Modal visible={showForm} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.formModal}>
            <Text style={styles.formTitle}>
              {editProduct ? "Redigera produkt" : "Ny produkt"}
            </Text>
            <View style={styles.formField}>
              <Text style={styles.formLabel}>Namn</Text>
              <TextInput style={styles.formInput} value={name} onChangeText={setName} placeholder="Produktnamn" />
            </View>
            <View style={styles.formField}>
              <Text style={styles.formLabel}>Pris (kr)</Text>
              <TextInput style={styles.formInput} value={price} onChangeText={setPrice} keyboardType="numeric" placeholder="0" />
            </View>
            <View style={styles.formActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowForm(false)}>
                <Text style={styles.cancelBtnText}>Avbryt</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                <Text style={styles.saveBtnText}>Spara</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  title: { fontSize: 28, fontWeight: "700", color: "#2c3e35" },
  subtitle: { fontSize: 14, color: "#6b7c74" },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#2d6b5a", paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  addBtnText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  searchRow: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#fff", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 16, borderWidth: 1, borderColor: "#e5e7eb" },
  searchInput: { flex: 1, fontSize: 15, color: "#2c3e35" },
  tableHeader: { flexDirection: "row", backgroundColor: "#f9fafb", paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8, marginBottom: 4 },
  th: { fontSize: 12, fontWeight: "600", color: "#6b7c74", textTransform: "uppercase", letterSpacing: 0.5 },
  tableBody: { flex: 1 },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 12, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: "#f0f0f0", backgroundColor: "#fff" },
  td: { fontSize: 14, color: "#2c3e35" },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, alignSelf: "flex-start" },
  statusText: { fontSize: 12, fontWeight: "600" },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.3)", justifyContent: "center", alignItems: "center" },
  formModal: { backgroundColor: "#fff", borderRadius: 16, padding: 28, width: 400, elevation: 10 },
  formTitle: { fontSize: 22, fontWeight: "700", color: "#2c3e35", marginBottom: 20 },
  formField: { marginBottom: 14 },
  formLabel: { fontSize: 13, fontWeight: "600", color: "#6b7c74", marginBottom: 4 },
  formInput: { height: 44, borderWidth: 1, borderColor: "#d1d5db", borderRadius: 8, paddingHorizontal: 12, fontSize: 15, color: "#2c3e35" },
  formActions: { flexDirection: "row", gap: 12, marginTop: 16 },
  cancelBtn: { flex: 1, height: 44, borderWidth: 1, borderColor: "#d1d5db", borderRadius: 10, justifyContent: "center", alignItems: "center" },
  cancelBtnText: { fontSize: 15, color: "#6b7c74" },
  saveBtn: { flex: 1, height: 44, backgroundColor: "#2d6b5a", borderRadius: 10, justifyContent: "center", alignItems: "center" },
  saveBtnText: { fontSize: 15, fontWeight: "600", color: "#fff" },
});
