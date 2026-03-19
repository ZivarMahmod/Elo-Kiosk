/**
 * Admin Inventory page — stock/warehouse management
 */

import { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useInventory } from "@/hooks/useInventory";
import { useProducts } from "@/hooks/useProducts";

export default function InventoryPage() {
  const { warehouses, adjustments, loading, addWarehouse, addAdjustment } = useInventory();
  const { products, refresh: refreshProducts } = useProducts();
  const [showAddWarehouse, setShowAddWarehouse] = useState(false);
  const [whName, setWhName] = useState("");
  const [whAddress, setWhAddress] = useState("");

  const handleAddWarehouse = async () => {
    if (!whName.trim()) return;
    await addWarehouse({ name: whName.trim(), address: whAddress.trim() || null });
    setWhName(""); setWhAddress("");
    setShowAddWarehouse(false);
  };

  // Products with low stock
  const lowStock = products.filter((p) => p.quantity > 0 && p.quantity <= (p.minStockLevel || 5));
  const outOfStock = products.filter((p) => p.quantity <= 0 || p.stockStatus === "slut");

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Lager & lagerplatser</Text>
          <Text style={styles.subtitle}>{warehouses.length} lagerplatser, {products.length} produkter</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowAddWarehouse(true)}>
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.addBtnText}>Ny lagerplats</Text>
        </TouchableOpacity>
      </View>

      {/* Warehouses */}
      <Text style={styles.sectionTitle}>Lagerplatser</Text>
      <View style={styles.whGrid}>
        {warehouses.length === 0 ? (
          <Text style={styles.emptyText}>Inga lagerplatser skapade</Text>
        ) : (
          warehouses.map((wh) => (
            <View key={wh.id} style={styles.whCard}>
              <Ionicons name="business-outline" size={24} color="#5b8fa8" />
              <Text style={styles.whName}>{wh.name}</Text>
              {wh.address ? <Text style={styles.whAddress}>{wh.address}</Text> : null}
            </View>
          ))
        )}
      </View>

      {/* Out of stock */}
      <Text style={styles.sectionTitle}>Slut i lager ({outOfStock.length})</Text>
      {outOfStock.length === 0 ? (
        <Text style={styles.emptyText}>Alla produkter finns i lager</Text>
      ) : (
        <View style={styles.stockList}>
          {outOfStock.map((p) => (
            <View key={p.id} style={styles.stockRow}>
              <View style={[styles.stockDot, { backgroundColor: "#dc2626" }]} />
              <Text style={styles.stockName}>{p.name}</Text>
              <Text style={styles.stockQty}>0 st</Text>
            </View>
          ))}
        </View>
      )}

      {/* Low stock */}
      <Text style={styles.sectionTitle}>Lågt lager ({lowStock.length})</Text>
      {lowStock.length === 0 ? (
        <Text style={styles.emptyText}>Inga produkter med lågt lager</Text>
      ) : (
        <View style={styles.stockList}>
          {lowStock.map((p) => (
            <View key={p.id} style={styles.stockRow}>
              <View style={[styles.stockDot, { backgroundColor: "#f5a623" }]} />
              <Text style={styles.stockName}>{p.name}</Text>
              <Text style={styles.stockQty}>{p.quantity} st</Text>
            </View>
          ))}
        </View>
      )}

      {/* Recent adjustments */}
      <Text style={styles.sectionTitle}>Senaste justeringar</Text>
      {adjustments.length === 0 ? (
        <Text style={styles.emptyText}>Inga lagerjusteringar gjorda</Text>
      ) : (
        <View style={styles.stockList}>
          {adjustments.slice(0, 10).map((adj) => (
            <View key={adj.id} style={styles.stockRow}>
              <Ionicons name={adj.quantity > 0 ? "arrow-up" : "arrow-down"} size={16} color={adj.quantity > 0 ? "#2d6b5a" : "#dc2626"} />
              <Text style={styles.stockName}>{adj.reason || "Justering"}</Text>
              <Text style={[styles.stockQty, { color: adj.quantity > 0 ? "#2d6b5a" : "#dc2626" }]}>
                {adj.quantity > 0 ? "+" : ""}{adj.quantity} st
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Add warehouse modal */}
      <Modal visible={showAddWarehouse} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.formModal}>
            <Text style={styles.formTitle}>Ny lagerplats</Text>
            <View style={styles.formField}>
              <Text style={styles.formLabel}>Namn</Text>
              <TextInput style={styles.formInput} value={whName} onChangeText={setWhName} placeholder="Lagerplatsnamn" />
            </View>
            <View style={styles.formField}>
              <Text style={styles.formLabel}>Adress</Text>
              <TextInput style={styles.formInput} value={whAddress} onChangeText={setWhAddress} placeholder="Valfritt" />
            </View>
            <View style={styles.formActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAddWarehouse(false)}>
                <Text style={styles.cancelBtnText}>Avbryt</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleAddWarehouse}>
                <Text style={styles.saveBtnText}>Spara</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 24, gap: 16, paddingBottom: 40 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontSize: 28, fontWeight: "700", color: "#2c3e35" },
  subtitle: { fontSize: 14, color: "#6b7c74" },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#2d6b5a", paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  addBtnText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  sectionTitle: { fontSize: 18, fontWeight: "600", color: "#2c3e35" },
  emptyText: { fontSize: 14, color: "#8a9b93", fontStyle: "italic" },
  whGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  whCard: { width: "31%", backgroundColor: "#fff", borderRadius: 12, padding: 16, borderWidth: 1, borderColor: "#f0f0f0" },
  whName: { fontSize: 16, fontWeight: "600", color: "#2c3e35", marginTop: 8 },
  whAddress: { fontSize: 13, color: "#6b7c74", marginTop: 2 },
  stockList: { backgroundColor: "#fff", borderRadius: 12, borderWidth: 1, borderColor: "#f0f0f0" },
  stockRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: "#f5f5f5" },
  stockDot: { width: 8, height: 8, borderRadius: 4 },
  stockName: { flex: 1, fontSize: 14, color: "#2c3e35" },
  stockQty: { fontSize: 14, fontWeight: "600", color: "#6b7c74" },

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
