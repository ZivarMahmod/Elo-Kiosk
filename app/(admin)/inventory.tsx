/**
 * Admin Inventory page — tabbed warehouse & stock management
 * Tab 1: Lagerplatser (warehouses table + add modal)
 * Tab 2: Lagersaldo (full product stock table with search)
 * Tab 3: Justera lager (adjustment form + recent log)
 */

import { useState, useMemo } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Modal, Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useInventory } from "@/hooks/useInventory";
import { useProducts } from "@/hooks/useProducts";
import { useCategories } from "@/hooks/useCategories";

type InventoryTab = "warehouses" | "stock" | "adjust";

const TABS: { key: InventoryTab; label: string; icon: string }[] = [
  { key: "warehouses", label: "Lagerplatser", icon: "business-outline" },
  { key: "stock", label: "Lagersaldo", icon: "cube-outline" },
  { key: "adjust", label: "Justera lager", icon: "swap-vertical-outline" },
];

const WAREHOUSE_TYPES = ["Butik", "Kyl", "Frys", "Förråd"];

const ADJUSTMENT_REASONS = ["Leverans", "Svinn", "Stöld", "Korrigering", "Retur"];

export default function InventoryPage() {
  const { warehouses, adjustments, loading, addWarehouse, removeWarehouse, addAdjustment } = useInventory();
  const { products, refresh: refreshProducts } = useProducts();
  const { categories } = useCategories();
  const [activeTab, setActiveTab] = useState<InventoryTab>("warehouses");

  // ── Add warehouse modal state ──
  const [showAddWarehouse, setShowAddWarehouse] = useState(false);
  const [whName, setWhName] = useState("");
  const [whAddress, setWhAddress] = useState("");
  const [whType, setWhType] = useState("Butik");

  // ── Stock search ──
  const [stockSearch, setStockSearch] = useState("");

  // ── Adjust form state ──
  const [adjProductId, setAdjProductId] = useState("");
  const [adjQty, setAdjQty] = useState("");
  const [adjReason, setAdjReason] = useState("Leverans");
  const [adjNotes, setAdjNotes] = useState("");
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [showReasonPicker, setShowReasonPicker] = useState(false);
  const [adjSaving, setAdjSaving] = useState(false);

  // Category lookup
  const categoryMap = useMemo(() => {
    const map: Record<string, string> = {};
    categories.forEach((c) => { map[c.id] = c.name; });
    return map;
  }, [categories]);

  // Product lookup
  const productMap = useMemo(() => {
    const map: Record<string, string> = {};
    products.forEach((p) => { map[p.id] = p.name; });
    return map;
  }, [products]);

  // Filtered products for stock tab
  const filteredProducts = useMemo(() => {
    if (!stockSearch.trim()) return products;
    const q = stockSearch.toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.sku && p.sku.toLowerCase().includes(q)) ||
        (categoryMap[p.categoryId] || "").toLowerCase().includes(q)
    );
  }, [products, stockSearch, categoryMap]);

  // ── Handlers ──

  const handleAddWarehouse = async () => {
    if (!whName.trim()) return;
    await addWarehouse({ name: whName.trim(), address: whAddress.trim() || null, type: whType });
    setWhName("");
    setWhAddress("");
    setWhType("Butik");
    setShowAddWarehouse(false);
  };

  const handleRemoveWarehouse = (id: string, name: string) => {
    Alert.alert("Ta bort lagerplats", `Vill du ta bort "${name}"?`, [
      { text: "Avbryt", style: "cancel" },
      { text: "Ta bort", style: "destructive", onPress: () => removeWarehouse(id) },
    ]);
  };

  const handleAdjustStock = async () => {
    if (!adjProductId) {
      Alert.alert("Välj produkt", "Du måste välja en produkt att justera.");
      return;
    }
    const qty = parseInt(adjQty, 10);
    if (isNaN(qty) || qty === 0) {
      Alert.alert("Ange antal", "Ange ett positivt eller negativt antal.");
      return;
    }
    setAdjSaving(true);
    try {
      const reasonWithNotes = adjNotes.trim()
        ? `${adjReason}: ${adjNotes.trim()}`
        : adjReason;
      await addAdjustment({
        productId: adjProductId,
        quantity: qty,
        reason: reasonWithNotes,
      });
      await refreshProducts();
      setAdjProductId("");
      setAdjQty("");
      setAdjReason("Leverans");
      setAdjNotes("");
      Alert.alert("Klart", "Lagerjusteringen har sparats.");
    } catch {
      Alert.alert("Fel", "Kunde inte spara justeringen.");
    } finally {
      setAdjSaving(false);
    }
  };

  const getStockStatus = (p: { quantity: number; minStockLevel?: number; stockStatus?: string }) => {
    if (p.stockStatus === "slut" || p.quantity <= 0) return { label: "Slut", color: "#dc2626", bg: "#fef2f2" };
    if (p.quantity <= (p.minStockLevel || 5)) return { label: "Lågt", color: "#f59e0b", bg: "#fffbeb" };
    return { label: "I lager", color: "#16a34a", bg: "#f0fdf4" };
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Lager & lagerplatser</Text>
          <Text style={styles.subtitle}>
            {warehouses.length} lagerplatser, {products.length} produkter
          </Text>
        </View>
      </View>

      {/* Tab navigation */}
      <View style={styles.tabRow}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Ionicons
              name={tab.icon as any}
              size={16}
              color={activeTab === tab.key ? "#2d6b5a" : "#8a9b93"}
            />
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ═══════════ TAB 1: LAGERPLATSER ═══════════ */}
      {activeTab === "warehouses" && (
        <>
          <View style={styles.sectionHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>Lagerplatser</Text>
              <Text style={styles.sectionSubtitle}>{warehouses.length} registrerade</Text>
            </View>
            <TouchableOpacity style={styles.addBtn} onPress={() => setShowAddWarehouse(true)}>
              <Ionicons name="add" size={18} color="#fff" />
              <Text style={styles.addBtnText}>Ny lagerplats</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.tableCard}>
            {/* Table header */}
            <View style={styles.tableHeaderRow}>
              <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Namn</Text>
              <Text style={[styles.tableHeaderCell, { flex: 1.2 }]}>Typ</Text>
              <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Adress</Text>
              <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Produkter</Text>
              <Text style={[styles.tableHeaderCell, { width: 70, textAlign: "center" }]}>Åtgärd</Text>
            </View>

            {warehouses.length === 0 ? (
              <View style={styles.emptyRow}>
                <Ionicons name="file-tray-outline" size={20} color="#8a9b93" />
                <Text style={styles.emptyText}>Inga lagerplatser skapade</Text>
              </View>
            ) : (
              warehouses.map((wh, idx) => (
                <View
                  key={wh.id}
                  style={[styles.tableRow, idx % 2 === 1 && styles.tableRowAlt]}
                >
                  <View style={[{ flex: 2, flexDirection: "row", alignItems: "center", gap: 8 }]}>
                    <Ionicons name="business-outline" size={16} color="#5b8fa8" />
                    <Text style={styles.tableCell}>{wh.name}</Text>
                  </View>
                  <Text style={[styles.tableCell, { flex: 1.2 }]}>{wh.type || "—"}</Text>
                  <Text style={[styles.tableCell, { flex: 2 }]}>{wh.address || "—"}</Text>
                  <Text style={[styles.tableCell, { flex: 1 }]}>{products.length}</Text>
                  <View style={{ width: 70, alignItems: "center" }}>
                    <TouchableOpacity
                      style={styles.deleteBtn}
                      onPress={() => handleRemoveWarehouse(wh.id, wh.name)}
                    >
                      <Ionicons name="trash-outline" size={16} color="#dc2626" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        </>
      )}

      {/* ═══════════ TAB 2: LAGERSALDO ═══════════ */}
      {activeTab === "stock" && (
        <>
          <View style={styles.sectionHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>Lagersaldo</Text>
              <Text style={styles.sectionSubtitle}>
                {filteredProducts.length} av {products.length} produkter
              </Text>
            </View>
          </View>

          {/* Search bar */}
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={18} color="#8a9b93" />
            <TextInput
              style={styles.searchInput}
              value={stockSearch}
              onChangeText={setStockSearch}
              placeholder="Sök produkt, SKU eller kategori..."
              placeholderTextColor="#a0a0a0"
            />
            {stockSearch.length > 0 && (
              <TouchableOpacity onPress={() => setStockSearch("")}>
                <Ionicons name="close-circle" size={18} color="#8a9b93" />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.tableCard}>
            {/* Table header */}
            <View style={styles.tableHeaderRow}>
              <Text style={[styles.tableHeaderCell, { flex: 2.5 }]}>Produkt</Text>
              <Text style={[styles.tableHeaderCell, { flex: 1.5 }]}>Kategori</Text>
              <Text style={[styles.tableHeaderCell, { flex: 0.8, textAlign: "center" }]}>Antal</Text>
              <Text style={[styles.tableHeaderCell, { flex: 0.8, textAlign: "center" }]}>Min.nivå</Text>
              <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: "center" }]}>Status</Text>
              <Text style={[styles.tableHeaderCell, { width: 70, textAlign: "center" }]}>Åtgärd</Text>
            </View>

            {filteredProducts.length === 0 ? (
              <View style={styles.emptyRow}>
                <Ionicons name="cube-outline" size={20} color="#8a9b93" />
                <Text style={styles.emptyText}>Inga produkter hittades</Text>
              </View>
            ) : (
              filteredProducts.map((p, idx) => {
                const status = getStockStatus(p);
                return (
                  <View
                    key={p.id}
                    style={[styles.tableRow, idx % 2 === 1 && styles.tableRowAlt]}
                  >
                    <View style={[{ flex: 2.5 }]}>
                      <Text style={styles.tableCell} numberOfLines={1}>{p.name}</Text>
                      {p.sku ? <Text style={styles.tableCellSub}>{p.sku}</Text> : null}
                    </View>
                    <Text style={[styles.tableCell, { flex: 1.5 }]} numberOfLines={1}>
                      {categoryMap[p.categoryId] || "—"}
                    </Text>
                    <Text style={[styles.tableCell, { flex: 0.8, textAlign: "center", fontWeight: "600" }]}>
                      {p.quantity}
                    </Text>
                    <Text style={[styles.tableCell, { flex: 0.8, textAlign: "center" }]}>
                      {p.minStockLevel || 5}
                    </Text>
                    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                      <View style={[styles.badge, { backgroundColor: status.bg }]}>
                        <Text style={[styles.badgeText, { color: status.color }]}>{status.label}</Text>
                      </View>
                    </View>
                    <View style={{ width: 70, alignItems: "center" }}>
                      <TouchableOpacity
                        style={styles.adjustBtnSmall}
                        onPress={() => {
                          setAdjProductId(p.id);
                          setActiveTab("adjust");
                        }}
                      >
                        <Ionicons name="swap-vertical-outline" size={14} color="#2d6b5a" />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        </>
      )}

      {/* ═══════════ TAB 3: JUSTERA LAGER ═══════════ */}
      {activeTab === "adjust" && (
        <>
          <View style={styles.sectionHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>Justera lager</Text>
              <Text style={styles.sectionSubtitle}>Registrera lagerändring</Text>
            </View>
          </View>

          <View style={styles.formCard}>
            {/* Product selector */}
            <View style={styles.formField}>
              <Text style={styles.formLabel}>Produkt</Text>
              <TouchableOpacity
                style={styles.pickerBtn}
                onPress={() => setShowProductPicker(true)}
              >
                <Text style={[styles.pickerBtnText, !adjProductId && { color: "#a0a0a0" }]}>
                  {adjProductId ? productMap[adjProductId] || "Välj produkt" : "Välj produkt..."}
                </Text>
                <Ionicons name="chevron-down" size={18} color="#8a9b93" />
              </TouchableOpacity>
            </View>

            {/* Quantity */}
            <View style={styles.formField}>
              <Text style={styles.formLabel}>Antal (positiv = in, negativ = ut)</Text>
              <View style={styles.qtyRow}>
                <TouchableOpacity
                  style={styles.qtyBtn}
                  onPress={() => setAdjQty(String((parseInt(adjQty, 10) || 0) - 1))}
                >
                  <Ionicons name="remove" size={20} color="#dc2626" />
                </TouchableOpacity>
                <TextInput
                  style={styles.qtyInput}
                  value={adjQty}
                  onChangeText={setAdjQty}
                  placeholder="0"
                  placeholderTextColor="#a0a0a0"
                  keyboardType="numeric"
                />
                <TouchableOpacity
                  style={styles.qtyBtn}
                  onPress={() => setAdjQty(String((parseInt(adjQty, 10) || 0) + 1))}
                >
                  <Ionicons name="add" size={20} color="#16a34a" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Reason selector */}
            <View style={styles.formField}>
              <Text style={styles.formLabel}>Orsak</Text>
              <TouchableOpacity
                style={styles.pickerBtn}
                onPress={() => setShowReasonPicker(true)}
              >
                <Text style={styles.pickerBtnText}>{adjReason}</Text>
                <Ionicons name="chevron-down" size={18} color="#8a9b93" />
              </TouchableOpacity>
            </View>

            {/* Notes */}
            <View style={styles.formField}>
              <Text style={styles.formLabel}>Anteckning (valfritt)</Text>
              <TextInput
                style={[styles.formInput, { height: 70, textAlignVertical: "top" }]}
                value={adjNotes}
                onChangeText={setAdjNotes}
                placeholder="Ytterligare information..."
                placeholderTextColor="#a0a0a0"
                multiline
              />
            </View>

            {/* Submit */}
            <TouchableOpacity
              style={[styles.submitBtn, adjSaving && { opacity: 0.6 }]}
              onPress={handleAdjustStock}
              disabled={adjSaving}
            >
              <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
              <Text style={styles.submitBtnText}>
                {adjSaving ? "Sparar..." : "Registrera justering"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Recent adjustment log */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Senaste justeringar</Text>
          </View>

          <View style={styles.tableCard}>
            <View style={styles.tableHeaderRow}>
              <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Produkt</Text>
              <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: "center" }]}>Antal</Text>
              <Text style={[styles.tableHeaderCell, { flex: 1.5 }]}>Orsak</Text>
              <Text style={[styles.tableHeaderCell, { flex: 1.5 }]}>Datum</Text>
            </View>

            {adjustments.length === 0 ? (
              <View style={styles.emptyRow}>
                <Ionicons name="document-text-outline" size={20} color="#8a9b93" />
                <Text style={styles.emptyText}>Inga lagerjusteringar gjorda</Text>
              </View>
            ) : (
              adjustments.slice(0, 20).map((adj, idx) => (
                <View
                  key={adj.id}
                  style={[styles.tableRow, idx % 2 === 1 && styles.tableRowAlt]}
                >
                  <Text style={[styles.tableCell, { flex: 2 }]} numberOfLines={1}>
                    {productMap[adj.productId] || adj.productId}
                  </Text>
                  <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                    <View
                      style={[
                        styles.badge,
                        {
                          backgroundColor: adj.quantity > 0 ? "#f0fdf4" : "#fef2f2",
                        },
                      ]}
                    >
                      <Ionicons
                        name={adj.quantity > 0 ? "arrow-up" : "arrow-down"}
                        size={12}
                        color={adj.quantity > 0 ? "#16a34a" : "#dc2626"}
                      />
                      <Text
                        style={[
                          styles.badgeText,
                          { color: adj.quantity > 0 ? "#16a34a" : "#dc2626", marginLeft: 3 },
                        ]}
                      >
                        {adj.quantity > 0 ? "+" : ""}
                        {adj.quantity}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.tableCell, { flex: 1.5 }]} numberOfLines={1}>
                    {adj.reason || "—"}
                  </Text>
                  <Text style={[styles.tableCell, { flex: 1.5, color: "#8a9b93" }]} numberOfLines={1}>
                    {adj.date || adj.createdAt?.slice(0, 10) || "—"}
                  </Text>
                </View>
              ))
            )}
          </View>
        </>
      )}

      {/* ═══════════ MODAL: Add Warehouse ═══════════ */}
      <Modal visible={showAddWarehouse} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.formModal}>
            <Text style={styles.modalTitle}>Ny lagerplats</Text>

            <View style={styles.formField}>
              <Text style={styles.formLabel}>Namn</Text>
              <TextInput
                style={styles.formInput}
                value={whName}
                onChangeText={setWhName}
                placeholder="Lagerplatsnamn"
                placeholderTextColor="#a0a0a0"
              />
            </View>

            <View style={styles.formField}>
              <Text style={styles.formLabel}>Adress</Text>
              <TextInput
                style={styles.formInput}
                value={whAddress}
                onChangeText={setWhAddress}
                placeholder="Valfritt"
                placeholderTextColor="#a0a0a0"
              />
            </View>

            <View style={styles.formField}>
              <Text style={styles.formLabel}>Typ</Text>
              <View style={styles.typeRow}>
                {WAREHOUSE_TYPES.map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.typeChip, whType === t && styles.typeChipActive]}
                    onPress={() => setWhType(t)}
                  >
                    <Text style={[styles.typeChipText, whType === t && styles.typeChipTextActive]}>
                      {t}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShowAddWarehouse(false)}
              >
                <Text style={styles.cancelBtnText}>Avbryt</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleAddWarehouse}>
                <Ionicons name="checkmark" size={18} color="#fff" />
                <Text style={styles.saveBtnText}>Spara</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ═══════════ MODAL: Product Picker ═══════════ */}
      <Modal visible={showProductPicker} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.formModal, { maxHeight: 500 }]}>
            <Text style={styles.modalTitle}>Välj produkt</Text>
            <ScrollView style={{ maxHeight: 380 }}>
              {products.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  style={[
                    styles.pickerItem,
                    adjProductId === p.id && styles.pickerItemActive,
                  ]}
                  onPress={() => {
                    setAdjProductId(p.id);
                    setShowProductPicker(false);
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.pickerItemText}>{p.name}</Text>
                    <Text style={styles.pickerItemSub}>
                      {categoryMap[p.categoryId] || "—"} — {p.quantity} st
                    </Text>
                  </View>
                  {adjProductId === p.id && (
                    <Ionicons name="checkmark-circle" size={20} color="#2d6b5a" />
                  )}
                </TouchableOpacity>
              ))}
              {products.length === 0 && (
                <Text style={styles.emptyText}>Inga produkter finns</Text>
              )}
            </ScrollView>
            <TouchableOpacity
              style={[styles.cancelBtn, { marginTop: 12 }]}
              onPress={() => setShowProductPicker(false)}
            >
              <Text style={styles.cancelBtnText}>Stäng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ═══════════ MODAL: Reason Picker ═══════════ */}
      <Modal visible={showReasonPicker} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.formModal}>
            <Text style={styles.modalTitle}>Välj orsak</Text>
            {ADJUSTMENT_REASONS.map((r) => (
              <TouchableOpacity
                key={r}
                style={[
                  styles.pickerItem,
                  adjReason === r && styles.pickerItemActive,
                ]}
                onPress={() => {
                  setAdjReason(r);
                  setShowReasonPicker(false);
                }}
              >
                <Text style={styles.pickerItemText}>{r}</Text>
                {adjReason === r && (
                  <Ionicons name="checkmark-circle" size={20} color="#2d6b5a" />
                )}
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={[styles.cancelBtn, { marginTop: 12 }]}
              onPress={() => setShowReasonPicker(false)}
            >
              <Text style={styles.cancelBtnText}>Stäng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

// ═══════════ STYLES ═══════════

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 24, paddingBottom: 40, gap: 16 },

  // Header
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontSize: 28, fontWeight: "700", color: "#2c3e35" },
  subtitle: { fontSize: 14, color: "#6b7c74", marginTop: 2 },

  // Tabs
  tabRow: { flexDirection: "row", gap: 6, marginBottom: 8, flexWrap: "wrap" },
  tab: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 14, paddingVertical: 9,
    borderRadius: 8, backgroundColor: "#f0f0f0",
  },
  tabActive: { backgroundColor: "#e8f5ee" },
  tabText: { fontSize: 13, fontWeight: "600", color: "#8a9b93" },
  tabTextActive: { color: "#2d6b5a" },

  // Section header
  sectionHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    marginTop: 4,
  },
  sectionTitle: { fontSize: 18, fontWeight: "600", color: "#2c3e35" },
  sectionSubtitle: { fontSize: 13, color: "#8a9b93", marginTop: 1 },

  // Add button
  addBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "#2d6b5a", paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 10,
  },
  addBtnText: { color: "#fff", fontSize: 14, fontWeight: "600" },

  // Table card
  tableCard: {
    backgroundColor: "#fff", borderRadius: 14, borderWidth: 1,
    borderColor: "#f0f0f0", overflow: "hidden",
  },
  tableHeaderRow: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#f8faf9", paddingVertical: 10, paddingHorizontal: 14,
    borderBottomWidth: 1, borderBottomColor: "#f0f0f0",
  },
  tableHeaderCell: {
    fontSize: 12, fontWeight: "700", color: "#6b7c74",
    textTransform: "uppercase", letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: "row", alignItems: "center",
    paddingVertical: 10, paddingHorizontal: 14,
    borderBottomWidth: 1, borderBottomColor: "#f5f5f5",
  },
  tableRowAlt: { backgroundColor: "#fbfcfb" },
  tableCell: { fontSize: 14, color: "#2c3e35" },
  tableCellSub: { fontSize: 11, color: "#8a9b93", marginTop: 1 },

  // Empty row
  emptyRow: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingVertical: 20, paddingHorizontal: 14, justifyContent: "center",
  },
  emptyText: { fontSize: 14, color: "#8a9b93", fontStyle: "italic" },

  // Delete button
  deleteBtn: {
    width: 34, height: 34, borderRadius: 8,
    backgroundColor: "#fef2f2", justifyContent: "center", alignItems: "center",
  },

  // Badge
  badge: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12,
  },
  badgeText: { fontSize: 12, fontWeight: "600" },

  // Adjust button in stock table
  adjustBtnSmall: {
    width: 34, height: 34, borderRadius: 8,
    backgroundColor: "#e8f5ee", justifyContent: "center", alignItems: "center",
  },

  // Search bar
  searchBar: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#fff", borderRadius: 10, borderWidth: 1,
    borderColor: "#e5e7eb", paddingHorizontal: 12, height: 44,
  },
  searchInput: { flex: 1, fontSize: 14, color: "#2c3e35" },

  // Form card
  formCard: {
    backgroundColor: "#fff", borderRadius: 14, padding: 20,
    borderWidth: 1, borderColor: "#f0f0f0",
  },
  formField: { marginBottom: 16 },
  formLabel: { fontSize: 13, fontWeight: "600", color: "#6b7c74", marginBottom: 6 },
  formInput: {
    height: 44, borderWidth: 1, borderColor: "#d1d5db",
    borderRadius: 8, paddingHorizontal: 12, fontSize: 15, color: "#2c3e35",
  },

  // Picker button
  pickerBtn: {
    height: 44, borderWidth: 1, borderColor: "#d1d5db", borderRadius: 8,
    paddingHorizontal: 12, flexDirection: "row", alignItems: "center",
    justifyContent: "space-between",
  },
  pickerBtnText: { fontSize: 15, color: "#2c3e35" },

  // Quantity row
  qtyRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  qtyBtn: {
    width: 44, height: 44, borderRadius: 10, backgroundColor: "#f0f0f0",
    justifyContent: "center", alignItems: "center",
  },
  qtyInput: {
    flex: 1, height: 44, borderWidth: 1, borderColor: "#d1d5db",
    borderRadius: 8, paddingHorizontal: 12, fontSize: 18,
    fontWeight: "700", color: "#2c3e35", textAlign: "center",
  },

  // Submit
  submitBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, height: 50, backgroundColor: "#2d6b5a", borderRadius: 12,
    marginTop: 4,
  },
  submitBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },

  // Type chips (warehouse modal)
  typeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  typeChip: {
    paddingHorizontal: 16, paddingVertical: 9, borderRadius: 8,
    borderWidth: 1, borderColor: "#d1d5db", backgroundColor: "#f9fafb",
  },
  typeChipActive: { backgroundColor: "#e8f5ee", borderColor: "#2d6b5a" },
  typeChipText: { fontSize: 14, color: "#6b7c74" },
  typeChipTextActive: { color: "#2d6b5a", fontWeight: "600" },

  // Modals
  modalOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center", alignItems: "center",
  },
  formModal: {
    backgroundColor: "#fff", borderRadius: 16, padding: 28,
    width: 420, elevation: 10,
  },
  modalTitle: { fontSize: 22, fontWeight: "700", color: "#2c3e35", marginBottom: 20 },
  modalActions: { flexDirection: "row", gap: 12, marginTop: 20 },
  cancelBtn: {
    flex: 1, height: 44, borderWidth: 1, borderColor: "#d1d5db",
    borderRadius: 10, justifyContent: "center", alignItems: "center",
  },
  cancelBtnText: { fontSize: 15, color: "#6b7c74" },
  saveBtn: {
    flex: 1, height: 44, backgroundColor: "#2d6b5a", borderRadius: 10,
    flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 6,
  },
  saveBtnText: { fontSize: 15, fontWeight: "600", color: "#fff" },

  // Picker items (modals)
  pickerItem: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingVertical: 12, paddingHorizontal: 14, borderRadius: 8,
    marginBottom: 4,
  },
  pickerItemActive: { backgroundColor: "#e8f5ee" },
  pickerItemText: { fontSize: 15, color: "#2c3e35", fontWeight: "500" },
  pickerItemSub: { fontSize: 12, color: "#8a9b93", marginTop: 2 },
});
