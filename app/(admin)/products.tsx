/**
 * Admin Products page — kiosk-admin standard
 * Category filter, stock filter, expandable rows, full CRUD modal
 */

import { useState, useMemo } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Modal, Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useProducts } from "@/hooks/useProducts";
import { useCategories } from "@/hooks/useCategories";
import type { Product, Allergen, VatRate } from "@/core/types/product";
import { STOCK_STATUS_LABELS, ALLERGEN_LABELS } from "@/core/types/product";

type StockFilter = "all" | "i_lager" | "lagt" | "slut";

const VAT_OPTIONS: VatRate[] = [0, 6, 12, 25];

const BADGE_COLOR_PRESETS = [
  { label: "Gron", value: "#2d6b5a" },
  { label: "Bla", value: "#5b8fa8" },
  { label: "Orange", value: "#c47a3a" },
  { label: "Rod", value: "#dc2626" },
  { label: "Lila", value: "#9b59b6" },
  { label: "Gra", value: "#6b7c74" },
];

export default function ProductsPage() {
  const { products, loading, add, update, remove, refresh, count, getByCategory } = useProducts();
  const { categories } = useCategories();

  // Filters
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [stockFilter, setStockFilter] = useState<StockFilter>("all");

  // Expandable row
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Form modal
  const [showForm, setShowForm] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [sku, setSku] = useState("");
  const [barcode, setBarcode] = useState("");
  const [price, setPrice] = useState("");
  const [campaignPrice, setCampaignPrice] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [stockStatus, setStockStatus] = useState("i_lager");
  const [quantity, setQuantity] = useState("");
  const [minStockLevel, setMinStockLevel] = useState("");
  const [vatRate, setVatRate] = useState<VatRate>(25);
  const [badgeLabel, setBadgeLabel] = useState("");
  const [badgeColor, setBadgeColor] = useState("");
  const [selectedAllergens, setSelectedAllergens] = useState<Allergen[]>([]);

  // Filtered products
  const filtered = useMemo(() => {
    return products.filter((p) => {
      if (search) {
        const q = search.toLowerCase();
        const matchName = p.name.toLowerCase().includes(q);
        const matchSku = p.sku?.toLowerCase().includes(q);
        const matchDesc = p.description?.toLowerCase().includes(q);
        if (!matchName && !matchSku && !matchDesc) return false;
      }
      if (categoryFilter !== "all" && p.categoryId !== categoryFilter) return false;
      if (stockFilter !== "all") {
        const status = p.stockStatus || "i_lager";
        if (stockFilter === "i_lager" && status !== "i_lager") return false;
        if (stockFilter === "slut" && status !== "slut") return false;
        if (stockFilter === "lagt" && (p.quantity ?? 0) > (p.minStockLevel ?? 5) ) return false;
      }
      return true;
    });
  }, [products, search, categoryFilter, stockFilter]);

  // Stats
  const stats = useMemo(() => ({
    total: products.length,
    inStock: products.filter((p) => (p.stockStatus || "i_lager") === "i_lager").length,
    lowStock: products.filter((p) => (p.quantity ?? 0) <= (p.minStockLevel ?? 5) && (p.stockStatus || "i_lager") !== "slut").length,
    outOfStock: products.filter((p) => (p.stockStatus || "i_lager") === "slut").length,
  }), [products]);

  const getCategoryName = (id: string) =>
    categories.find((c) => c.id === id)?.name ?? "Okand";

  // Form helpers
  const resetForm = () => {
    setName("");
    setDescription("");
    setSku("");
    setBarcode("");
    setPrice("");
    setCampaignPrice("");
    setCategoryId(categories[0]?.id ?? "");
    setStockStatus("i_lager");
    setQuantity("");
    setMinStockLevel("");
    setVatRate(25);
    setBadgeLabel("");
    setBadgeColor("");
    setSelectedAllergens([]);
  };

  const openAdd = () => {
    setEditProduct(null);
    resetForm();
    setShowForm(true);
  };

  const openEdit = (p: Product) => {
    setEditProduct(p);
    setName(p.name);
    setDescription(p.description || "");
    setSku(p.sku || "");
    setBarcode("");
    setPrice(String(p.price));
    setCampaignPrice(p.campaignPrice ? String(p.campaignPrice) : "");
    setCategoryId(p.categoryId);
    setStockStatus(p.stockStatus || "i_lager");
    setQuantity(String(p.quantity ?? ""));
    setMinStockLevel(p.minStockLevel ? String(p.minStockLevel) : "");
    setVatRate(p.vatRate ?? 25);
    setBadgeLabel(p.badgeLabel || "");
    setBadgeColor(p.badgeColor || "");
    setSelectedAllergens(p.allergens || []);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    const data: any = {
      name: name.trim(),
      price: Number(price) || 0,
      categoryId,
      stockStatus: stockStatus as any,
      description: description.trim() || undefined,
      sku: sku.trim() || undefined,
      quantity: quantity ? Number(quantity) : undefined,
      minStockLevel: minStockLevel ? Number(minStockLevel) : undefined,
      campaignPrice: campaignPrice ? Number(campaignPrice) : null,
      vatRate,
      badgeLabel: badgeLabel.trim() || undefined,
      badgeColor: badgeColor || undefined,
      allergens: selectedAllergens.length > 0 ? selectedAllergens : undefined,
    };
    if (editProduct) {
      await update({ id: editProduct.id, ...data });
    } else {
      await add(data);
    }
    setShowForm(false);
  };

  const handleDelete = (p: Product) => {
    Alert.alert("Ta bort", `Vill du ta bort "${p.name}"?`, [
      { text: "Avbryt" },
      { text: "Ta bort", style: "destructive", onPress: () => remove(p.id) },
    ]);
  };

  const toggleAllergen = (a: Allergen) => {
    setSelectedAllergens((prev) =>
      prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]
    );
  };

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.title}>Produkter</Text>
          <Text style={s.subtitle}>{products.length} produkter totalt</Text>
        </View>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <TouchableOpacity style={[s.actionBtn, { backgroundColor: "#5b8fa8" }]} onPress={refresh}>
            <Ionicons name="refresh-outline" size={16} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={s.actionBtn} onPress={openAdd}>
            <Ionicons name="add" size={16} color="#fff" />
            <Text style={s.actionBtnText}>Ny produkt</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats */}
      <View style={s.statsRow}>
        <View style={[s.statCard, { backgroundColor: "#e8f5ee" }]}>
          <Text style={s.statLabel}>Totalt</Text>
          <Text style={[s.statValue, { color: "#2d6b5a" }]}>{stats.total}</Text>
        </View>
        <View style={[s.statCard, { backgroundColor: "#e8f0fa" }]}>
          <Text style={s.statLabel}>I lager</Text>
          <Text style={[s.statValue, { color: "#5b8fa8" }]}>{stats.inStock}</Text>
        </View>
        <View style={[s.statCard, { backgroundColor: "#fdf4e8" }]}>
          <Text style={s.statLabel}>Lagt lager</Text>
          <Text style={[s.statValue, { color: "#c47a3a" }]}>{stats.lowStock}</Text>
        </View>
        <View style={[s.statCard, { backgroundColor: "#fde8e8" }]}>
          <Text style={s.statLabel}>Slut</Text>
          <Text style={[s.statValue, { color: "#dc2626" }]}>{stats.outOfStock}</Text>
        </View>
      </View>

      {/* Search + Filters */}
      <View style={s.filterRow}>
        <View style={s.searchBox}>
          <Ionicons name="search-outline" size={16} color="#8a9b93" />
          <TextInput
            style={s.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Sok produkter, SKU..."
            placeholderTextColor="#b0b8b3"
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Ionicons name="close-circle" size={16} color="#8a9b93" />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Stock status filter */}
        <View style={s.filterGroup}>
          {([
            { key: "all", label: "Alla" },
            { key: "i_lager", label: "I lager" },
            { key: "lagt", label: "Lagt" },
            { key: "slut", label: "Slut" },
          ] as { key: StockFilter; label: string }[]).map((f) => (
            <TouchableOpacity
              key={f.key}
              style={[s.filterBtn, stockFilter === f.key && s.filterBtnActive]}
              onPress={() => setStockFilter(f.key)}
            >
              <Text style={[s.filterBtnText, stockFilter === f.key && s.filterBtnTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Category filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.categoryScroll} contentContainerStyle={s.categoryScrollContent}>
        <TouchableOpacity
          style={[s.categoryBtn, categoryFilter === "all" && s.categoryBtnActive]}
          onPress={() => setCategoryFilter("all")}
        >
          <Text style={[s.categoryBtnText, categoryFilter === "all" && s.categoryBtnTextActive]}>Alla</Text>
        </TouchableOpacity>
        {categories.map((c) => (
          <TouchableOpacity
            key={c.id}
            style={[s.categoryBtn, categoryFilter === c.id && s.categoryBtnActive]}
            onPress={() => setCategoryFilter(c.id)}
          >
            <Text style={[s.categoryBtnText, categoryFilter === c.id && s.categoryBtnTextActive]}>
              {c.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Table Header */}
      <View style={s.tableHeader}>
        <Text style={[s.th, { flex: 2 }]}>Namn</Text>
        <Text style={[s.th, { flex: 1 }]}>SKU</Text>
        <Text style={[s.th, { width: 90, textAlign: "right" }]}>Pris</Text>
        <Text style={[s.th, { flex: 1 }]}>Kategori</Text>
        <Text style={[s.th, { width: 80, textAlign: "center" }]}>Antal</Text>
        <Text style={[s.th, { width: 90 }]}>Status</Text>
        <Text style={[s.th, { width: 100, textAlign: "center" }]}>Atgarder</Text>
      </View>

      {/* Table Body */}
      <ScrollView style={s.tableBody}>
        {filtered.length === 0 ? (
          <View style={s.emptyState}>
            <Ionicons name="cube-outline" size={40} color="#d1d5db" />
            <Text style={s.emptyTitle}>Inga produkter matchar</Text>
            <Text style={s.emptyText}>Andra filter eller sokord</Text>
          </View>
        ) : filtered.map((p) => {
          const isExpanded = expandedId === p.id;
          const status = p.stockStatus || "i_lager";
          return (
            <View key={p.id}>
              <TouchableOpacity
                style={[s.row, isExpanded && { backgroundColor: "#f9fafb" }]}
                onPress={() => setExpandedId(isExpanded ? null : p.id)}
                activeOpacity={0.7}
              >
                <View style={{ flex: 2, flexDirection: "row", alignItems: "center", gap: 8 }}>
                  {p.badgeLabel ? (
                    <View style={[s.badge, { backgroundColor: p.badgeColor || "#2d6b5a" }]}>
                      <Text style={s.badgeText}>{p.badgeLabel}</Text>
                    </View>
                  ) : null}
                  <View style={{ flex: 1 }}>
                    <Text style={[s.td, { fontWeight: "600" }]} numberOfLines={1}>{p.name}</Text>
                    {p.campaignPrice ? (
                      <Text style={s.campaignTag}>Kampanj: {p.campaignPrice} kr</Text>
                    ) : null}
                  </View>
                </View>
                <Text style={[s.td, { flex: 1, color: "#8a9b93" }]} numberOfLines={1}>{p.sku || "-"}</Text>
                <Text style={[s.td, { width: 90, textAlign: "right", fontWeight: "700" }]}>{p.price} kr</Text>
                <Text style={[s.td, { flex: 1 }]} numberOfLines={1}>{getCategoryName(p.categoryId)}</Text>
                <Text style={[s.td, { width: 80, textAlign: "center" }]}>{p.quantity ?? 0}</Text>
                <View style={{ width: 90 }}>
                  <View style={[s.statusBadge, {
                    backgroundColor: status === "i_lager" ? "#e8f5ee" : status === "slut" ? "#fde8e8" : "#fdf4e8"
                  }]}>
                    <Text style={[s.statusText, {
                      color: status === "i_lager" ? "#2d6b5a" : status === "slut" ? "#dc2626" : "#c47a3a"
                    }]}>
                      {STOCK_STATUS_LABELS[status]}
                    </Text>
                  </View>
                </View>
                <View style={{ width: 100, flexDirection: "row", justifyContent: "center", gap: 6 }}>
                  <TouchableOpacity
                    style={s.iconBtn}
                    onPress={(e) => { e.stopPropagation?.(); openEdit(p); }}
                  >
                    <Ionicons name="create-outline" size={16} color="#5b8fa8" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={s.iconBtn}
                    onPress={(e) => { e.stopPropagation?.(); handleDelete(p); }}
                  >
                    <Ionicons name="trash-outline" size={16} color="#dc2626" />
                  </TouchableOpacity>
                  <Ionicons name={isExpanded ? "chevron-up-outline" : "chevron-down-outline"} size={16} color="#8a9b93" />
                </View>
              </TouchableOpacity>

              {/* Expanded details */}
              {isExpanded && (
                <View style={s.expanded}>
                  <View style={s.expandedHeader}>
                    <View style={s.expandedInfo}>
                      <Text style={s.expandedLabel}>Beskrivning</Text>
                      <Text style={s.expandedValue}>{p.description || "Ingen beskrivning"}</Text>
                    </View>
                  </View>

                  <View style={s.detailsGrid}>
                    <View style={s.detailItem}>
                      <Text style={s.expandedLabel}>SKU</Text>
                      <Text style={s.expandedValue}>{p.sku || "-"}</Text>
                    </View>
                    <View style={s.detailItem}>
                      <Text style={s.expandedLabel}>Kategori</Text>
                      <Text style={s.expandedValue}>{getCategoryName(p.categoryId)}</Text>
                    </View>
                    <View style={s.detailItem}>
                      <Text style={s.expandedLabel}>Antal i lager</Text>
                      <Text style={s.expandedValue}>{p.quantity ?? 0}</Text>
                    </View>
                    <View style={s.detailItem}>
                      <Text style={s.expandedLabel}>Min lagerniva</Text>
                      <Text style={s.expandedValue}>{p.minStockLevel ?? "-"}</Text>
                    </View>
                  </View>

                  {/* Price breakdown */}
                  <View style={s.priceBreakdown}>
                    <View style={s.priceBreakdownHeader}>
                      <Text style={s.priceBreakdownTitle}>Prisuppdelning</Text>
                    </View>
                    <View style={s.priceRow}>
                      <Text style={s.priceLabel}>Ordinarie pris</Text>
                      <Text style={s.priceValue}>{p.price} kr</Text>
                    </View>
                    {p.campaignPrice ? (
                      <View style={s.priceRow}>
                        <Text style={[s.priceLabel, { color: "#c47a3a" }]}>Kampanjpris</Text>
                        <Text style={[s.priceValue, { color: "#c47a3a", fontWeight: "700" }]}>{p.campaignPrice} kr</Text>
                      </View>
                    ) : null}
                    <View style={s.priceRow}>
                      <Text style={s.priceLabel}>Moms</Text>
                      <Text style={s.priceValue}>{p.vatRate ?? 25}%</Text>
                    </View>
                    <View style={[s.priceRow, { borderTopWidth: 2, borderTopColor: "#e5e7eb" }]}>
                      <Text style={[s.priceLabel, { fontWeight: "700", fontSize: 14 }]}>Effektivt pris</Text>
                      <Text style={[s.priceValue, { fontWeight: "700", fontSize: 14, color: "#2d6b5a" }]}>
                        {p.campaignPrice || p.price} kr
                      </Text>
                    </View>
                  </View>

                  {/* Allergens */}
                  {(p.allergens && p.allergens.length > 0) ? (
                    <View style={s.allergenSection}>
                      <Text style={s.expandedLabel}>Allergener</Text>
                      <View style={s.allergenRow}>
                        {p.allergens.map((a) => (
                          <View key={a} style={s.allergenChip}>
                            <Text style={s.allergenChipText}>{ALLERGEN_LABELS[a]}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  ) : null}

                  {/* Badge info */}
                  {p.badgeLabel ? (
                    <View style={s.detailsGrid}>
                      <View style={s.detailItem}>
                        <Text style={s.expandedLabel}>Badge</Text>
                        <View style={[s.badge, { backgroundColor: p.badgeColor || "#2d6b5a" }]}>
                          <Text style={s.badgeText}>{p.badgeLabel}</Text>
                        </View>
                      </View>
                    </View>
                  ) : null}

                  {/* Action buttons */}
                  <View style={s.expandedActions}>
                    <TouchableOpacity style={[s.expandedBtn, { backgroundColor: "#5b8fa8" }]} onPress={() => openEdit(p)}>
                      <Ionicons name="create-outline" size={16} color="#fff" />
                      <Text style={s.expandedBtnText}>Redigera</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[s.expandedBtn, { backgroundColor: "#dc2626" }]} onPress={() => handleDelete(p)}>
                      <Ionicons name="trash-outline" size={16} color="#fff" />
                      <Text style={s.expandedBtnText}>Ta bort</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>

      {/* Add/Edit Modal */}
      <Modal visible={showForm} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={s.modal}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={s.modalTitle}>
                {editProduct ? "Redigera produkt" : "Ny produkt"}
              </Text>
              {editProduct && (
                <Text style={s.modalSub}>ID: {editProduct.id}</Text>
              )}

              {/* Basic info */}
              <Text style={s.formSection}>Grundinfo</Text>

              <Text style={s.formLabel}>Namn *</Text>
              <TextInput style={s.formInput} value={name} onChangeText={setName} placeholder="Produktnamn" placeholderTextColor="#b0b8b3" />

              <Text style={s.formLabel}>Beskrivning</Text>
              <TextInput
                style={[s.formInput, { height: 70, textAlignVertical: "top" }]}
                value={description}
                onChangeText={setDescription}
                placeholder="Kort beskrivning..."
                placeholderTextColor="#b0b8b3"
                multiline
              />

              <View style={s.formRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.formLabel}>SKU</Text>
                  <TextInput style={s.formInput} value={sku} onChangeText={setSku} placeholder="SKU-001" placeholderTextColor="#b0b8b3" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.formLabel}>Streckkod</Text>
                  <TextInput style={s.formInput} value={barcode} onChangeText={setBarcode} placeholder="7350000000000" placeholderTextColor="#b0b8b3" />
                </View>
              </View>

              {/* Pricing */}
              <Text style={s.formSection}>Pris</Text>

              <View style={s.formRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.formLabel}>Pris (kr) *</Text>
                  <TextInput style={s.formInput} value={price} onChangeText={setPrice} keyboardType="numeric" placeholder="0" placeholderTextColor="#b0b8b3" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.formLabel}>Kampanjpris (kr)</Text>
                  <TextInput style={s.formInput} value={campaignPrice} onChangeText={setCampaignPrice} keyboardType="numeric" placeholder="Valfritt" placeholderTextColor="#b0b8b3" />
                </View>
              </View>

              <Text style={s.formLabel}>Momssats</Text>
              <View style={s.filterGroup}>
                {VAT_OPTIONS.map((v) => (
                  <TouchableOpacity
                    key={v}
                    style={[s.vatBtn, vatRate === v && s.vatBtnActive]}
                    onPress={() => setVatRate(v)}
                  >
                    <Text style={[s.vatBtnText, vatRate === v && { color: "#fff" }]}>{v}%</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Category */}
              <Text style={s.formSection}>Kategori & Lager</Text>

              <Text style={s.formLabel}>Kategori</Text>
              <View style={s.categoryPicker}>
                {categories.map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    style={[s.categoryPickerBtn, categoryId === c.id && s.categoryPickerBtnActive]}
                    onPress={() => setCategoryId(c.id)}
                  >
                    <Text style={[s.categoryPickerText, categoryId === c.id && { color: "#fff" }]}>
                      {c.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={s.formRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.formLabel}>Antal i lager</Text>
                  <TextInput style={s.formInput} value={quantity} onChangeText={setQuantity} keyboardType="numeric" placeholder="0" placeholderTextColor="#b0b8b3" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.formLabel}>Min lagerniva</Text>
                  <TextInput style={s.formInput} value={minStockLevel} onChangeText={setMinStockLevel} keyboardType="numeric" placeholder="5" placeholderTextColor="#b0b8b3" />
                </View>
              </View>

              <Text style={s.formLabel}>Lagerstatus</Text>
              <View style={s.filterGroup}>
                {(["i_lager", "slut", "dold", "kommande"] as const).map((st) => (
                  <TouchableOpacity
                    key={st}
                    style={[s.filterBtn, stockStatus === st && s.filterBtnActive]}
                    onPress={() => setStockStatus(st)}
                  >
                    <Text style={[s.filterBtnText, stockStatus === st && s.filterBtnTextActive]}>
                      {STOCK_STATUS_LABELS[st]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Badge */}
              <Text style={s.formSection}>Badge</Text>

              <Text style={s.formLabel}>Badge-text</Text>
              <TextInput style={s.formInput} value={badgeLabel} onChangeText={setBadgeLabel} placeholder="T.ex. Nyhet, Popular..." placeholderTextColor="#b0b8b3" />

              <Text style={s.formLabel}>Badge-farg</Text>
              <View style={s.colorRow}>
                {BADGE_COLOR_PRESETS.map((c) => (
                  <TouchableOpacity
                    key={c.value}
                    style={[s.colorSwatch, { backgroundColor: c.value }, badgeColor === c.value && s.colorSwatchActive]}
                    onPress={() => setBadgeColor(c.value)}
                  />
                ))}
              </View>

              {/* Allergens */}
              <Text style={s.formSection}>Allergener</Text>
              <View style={s.allergenPicker}>
                {(Object.entries(ALLERGEN_LABELS) as [Allergen, string][]).map(([key, label]) => (
                  <TouchableOpacity
                    key={key}
                    style={[s.allergenPickerBtn, selectedAllergens.includes(key) && s.allergenPickerBtnActive]}
                    onPress={() => toggleAllergen(key)}
                  >
                    <Text style={[s.allergenPickerText, selectedAllergens.includes(key) && { color: "#fff" }]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Actions */}
              <View style={s.modalActions}>
                <TouchableOpacity style={s.cancelBtn} onPress={() => setShowForm(false)}>
                  <Text style={s.cancelBtnText}>Avbryt</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.saveBtn} onPress={handleSave}>
                  <Ionicons name="checkmark" size={18} color="#fff" />
                  <Text style={s.saveBtnText}>Spara</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  title: { fontSize: 28, fontWeight: "700", color: "#2c3e35" },
  subtitle: { fontSize: 13, color: "#6b7c74" },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#2d6b5a", paddingHorizontal: 14, paddingVertical: 9, borderRadius: 8 },
  actionBtnText: { color: "#fff", fontSize: 13, fontWeight: "600" },

  // Stats
  statsRow: { flexDirection: "row", gap: 12, marginBottom: 14 },
  statCard: { flex: 1, padding: 14, borderRadius: 12 },
  statLabel: { fontSize: 11, color: "#6b7c74", marginBottom: 4 },
  statValue: { fontSize: 22, fontWeight: "700" },

  // Filters
  filterRow: { flexDirection: "row", gap: 10, marginBottom: 10, alignItems: "center" },
  searchBox: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#fff", borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 8, paddingHorizontal: 10, height: 38 },
  searchInput: { flex: 1, fontSize: 13, color: "#2c3e35" },
  filterGroup: { flexDirection: "row", gap: 4, flexWrap: "wrap" },
  filterBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, backgroundColor: "#f0f0f0" },
  filterBtnActive: { backgroundColor: "#2d6b5a" },
  filterBtnText: { fontSize: 11, fontWeight: "600", color: "#6b7c74" },
  filterBtnTextActive: { color: "#fff" },

  // Category scroll
  categoryScroll: { marginBottom: 14, maxHeight: 38 },
  categoryScrollContent: { gap: 6, paddingRight: 10 },
  categoryBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: "#f0f0f0" },
  categoryBtnActive: { backgroundColor: "#2d6b5a" },
  categoryBtnText: { fontSize: 12, fontWeight: "600", color: "#6b7c74" },
  categoryBtnTextActive: { color: "#fff" },

  // Table
  tableHeader: { flexDirection: "row", backgroundColor: "#f9fafb", paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8 },
  th: { fontSize: 11, fontWeight: "600", color: "#6b7c74", textTransform: "uppercase", letterSpacing: 0.3 },
  tableBody: { flex: 1, marginTop: 2 },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 12, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: "#f0f0f0", backgroundColor: "#fff" },
  td: { fontSize: 13, color: "#2c3e35" },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, alignSelf: "flex-start" },
  statusText: { fontSize: 10, fontWeight: "600" },
  iconBtn: { padding: 6, borderRadius: 6, backgroundColor: "#f5f5f5" },
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  badgeText: { fontSize: 9, fontWeight: "700", color: "#fff", textTransform: "uppercase" },
  campaignTag: { fontSize: 10, color: "#c47a3a", fontWeight: "600", marginTop: 2 },

  // Expanded
  expanded: { backgroundColor: "#f9fafb", paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: "#e5e7eb" },
  expandedHeader: { marginBottom: 12 },
  expandedInfo: {},
  expandedLabel: { fontSize: 10, color: "#8a9b93", textTransform: "uppercase", marginBottom: 2, fontWeight: "600" },
  expandedValue: { fontSize: 13, fontWeight: "600", color: "#2c3e35" },
  detailsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 20, marginBottom: 14 },
  detailItem: { minWidth: 120 },

  // Price breakdown
  priceBreakdown: { backgroundColor: "#fff", borderRadius: 8, overflow: "hidden", borderWidth: 1, borderColor: "#f0f0f0", marginBottom: 12 },
  priceBreakdownHeader: { backgroundColor: "#f0f0f0", paddingVertical: 8, paddingHorizontal: 12 },
  priceBreakdownTitle: { fontSize: 10, fontWeight: "600", color: "#6b7c74", textTransform: "uppercase" },
  priceRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: "#f5f5f5" },
  priceLabel: { fontSize: 13, color: "#2c3e35" },
  priceValue: { fontSize: 13, color: "#2c3e35", fontWeight: "600" },

  // Allergens
  allergenSection: { marginBottom: 14 },
  allergenRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4 },
  allergenChip: { backgroundColor: "#fdf4e8", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  allergenChipText: { fontSize: 11, fontWeight: "600", color: "#c47a3a" },

  expandedActions: { flexDirection: "row", gap: 8, marginTop: 4 },
  expandedBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  expandedBtnText: { color: "#fff", fontSize: 13, fontWeight: "600" },

  // Empty
  emptyState: { alignItems: "center", paddingVertical: 40 },
  emptyTitle: { fontSize: 15, fontWeight: "600", color: "#2c3e35", marginTop: 12 },
  emptyText: { fontSize: 13, color: "#8a9b93" },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.3)", justifyContent: "center", alignItems: "center" },
  modal: { backgroundColor: "#fff", borderRadius: 16, padding: 28, width: 520, maxHeight: "85%", elevation: 10 },
  modalTitle: { fontSize: 22, fontWeight: "700", color: "#2c3e35", marginBottom: 4 },
  modalSub: { fontSize: 12, color: "#8a9b93", marginBottom: 10 },
  formSection: { fontSize: 14, fontWeight: "700", color: "#2d6b5a", marginTop: 18, marginBottom: 8, paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: "#e8f5ee" },
  formLabel: { fontSize: 12, fontWeight: "600", color: "#6b7c74", marginBottom: 4, marginTop: 8 },
  formInput: { height: 40, borderWidth: 1, borderColor: "#d1d5db", borderRadius: 8, paddingHorizontal: 12, fontSize: 14, color: "#2c3e35", backgroundColor: "#fff" },
  formRow: { flexDirection: "row", gap: 12 },

  // VAT buttons
  vatBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 6, backgroundColor: "#f0f0f0" },
  vatBtnActive: { backgroundColor: "#5b8fa8" },
  vatBtnText: { fontSize: 12, fontWeight: "600", color: "#6b7c74" },

  // Category picker
  categoryPicker: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  categoryPickerBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 6, backgroundColor: "#f0f0f0" },
  categoryPickerBtnActive: { backgroundColor: "#2d6b5a" },
  categoryPickerText: { fontSize: 12, fontWeight: "600", color: "#6b7c74" },

  // Color swatches
  colorRow: { flexDirection: "row", gap: 8, marginTop: 4 },
  colorSwatch: { width: 28, height: 28, borderRadius: 14 },
  colorSwatchActive: { borderWidth: 3, borderColor: "#2c3e35" },

  // Allergen picker
  allergenPicker: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  allergenPickerBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, backgroundColor: "#f0f0f0" },
  allergenPickerBtnActive: { backgroundColor: "#c47a3a" },
  allergenPickerText: { fontSize: 11, fontWeight: "600", color: "#6b7c74" },

  // Modal actions
  modalActions: { flexDirection: "row", gap: 12, marginTop: 24, marginBottom: 8 },
  cancelBtn: { flex: 1, height: 44, borderWidth: 1, borderColor: "#d1d5db", borderRadius: 10, justifyContent: "center", alignItems: "center" },
  cancelBtnText: { fontSize: 15, color: "#6b7c74" },
  saveBtn: { flex: 1, height: 44, backgroundColor: "#2d6b5a", borderRadius: 10, justifyContent: "center", alignItems: "center", flexDirection: "row", gap: 6 },
  saveBtnText: { fontSize: 15, fontWeight: "600", color: "#fff" },
});
