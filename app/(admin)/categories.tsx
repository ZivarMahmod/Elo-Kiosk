/**
 * Admin Categories page — list, add, edit, delete categories
 */

import { useState, useMemo } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Modal, Alert, Switch,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useCategories } from "@/hooks/useCategories";
import { useProducts } from "@/hooks/useProducts";
import type { Category } from "@/core/types/category";

const COLOR_PRESETS = [
  "#d5ddd8", "#e8f5ee", "#fde8e8", "#f5ede4", "#e0e7ff",
  "#fef3c7", "#d1fae5", "#fce7f3", "#f3e8ff", "#cffafe",
];

export default function CategoriesPage() {
  const { categories, loading, add, update, remove } = useCategories();
  const { products } = useProducts();
  const [showForm, setShowForm] = useState(false);
  const [editCat, setEditCat] = useState<Category | null>(null);
  const [search, setSearch] = useState("");

  // Form state
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("");
  const [color, setColor] = useState("#d5ddd8");
  const [subtitle, setSubtitle] = useState("");
  const [description, setDescription] = useState("");
  const [sortOrder, setSortOrder] = useState("0");
  const [showOnKiosk, setShowOnKiosk] = useState(true);
  const [active, setActive] = useState(true);

  // Product count per category
  const productCountMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const p of products) {
      if (p.categoryId) {
        map[p.categoryId] = (map[p.categoryId] || 0) + 1;
      }
    }
    return map;
  }, [products]);

  const filtered = categories.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.subtitle || "").toLowerCase().includes(search.toLowerCase()) ||
    (c.emoji || "").includes(search)
  );

  const openAdd = () => {
    setEditCat(null);
    setName("");
    setEmoji("");
    setColor("#d5ddd8");
    setSubtitle("");
    setDescription("");
    setSortOrder("0");
    setShowOnKiosk(true);
    setActive(true);
    setShowForm(true);
  };

  const openEdit = (c: Category) => {
    setEditCat(c);
    setName(c.name);
    setEmoji(c.emoji || "");
    setColor(c.color || "#d5ddd8");
    setSubtitle(c.subtitle || "");
    setDescription(c.description || "");
    setSortOrder(String(c.sortOrder ?? 0));
    setShowOnKiosk(c.showOnKiosk ?? true);
    setActive(c.status ?? true);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    const payload = {
      name: name.trim(),
      emoji,
      color,
      subtitle: subtitle.trim(),
      description: description.trim() || null,
      sortOrder: Number(sortOrder) || 0,
      showOnKiosk,
      status: active,
    };
    if (editCat) {
      await update({ id: editCat.id, ...payload });
    } else {
      await add(payload);
    }
    setShowForm(false);
  };

  const handleDelete = (c: Category) => {
    const count = productCountMap[c.id] || 0;
    const extra = count > 0 ? `\nDen har ${count} produkt(er) kopplade.` : "";
    Alert.alert("Ta bort", `Vill du ta bort "${c.name}"?${extra}`, [
      { text: "Avbryt" },
      { text: "Ta bort", style: "destructive", onPress: () => remove(c.id) },
    ]);
  };

  const toggleKiosk = async (c: Category) => {
    await update({ id: c.id, showOnKiosk: !c.showOnKiosk });
  };

  const toggleActive = async (c: Category) => {
    await update({ id: c.id, status: !c.status });
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Kategorier</Text>
          <Text style={styles.headerSubtitle}>{categories.length} kategorier totalt</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.addBtnText}>Ny kategori</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <Ionicons name="search-outline" size={18} color="#8a9b93" />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Sök kategorier..."
          placeholderTextColor="#a0a0a0"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch("")}>
            <Ionicons name="close-circle" size={18} color="#a0a0a0" />
          </TouchableOpacity>
        )}
      </View>

      {/* Table header */}
      <View style={styles.tableHeader}>
        <Text style={[styles.th, { width: 50 }]}>Emoji</Text>
        <Text style={[styles.th, { flex: 2 }]}>Namn</Text>
        <Text style={[styles.th, { flex: 1.5 }]}>Undertitel</Text>
        <Text style={[styles.th, { width: 60 }]}>Färg</Text>
        <Text style={[styles.th, { width: 80, textAlign: "center" }]}>Produkter</Text>
        <Text style={[styles.th, { width: 100, textAlign: "center" }]}>Visas på kiosk</Text>
        <Text style={[styles.th, { width: 80, textAlign: "center" }]}>Status</Text>
        <Text style={[styles.th, { width: 100, textAlign: "center" }]}>Åtgärder</Text>
      </View>

      {/* Table body */}
      <ScrollView style={styles.tableBody}>
        {filtered.length === 0 && !loading && (
          <View style={styles.emptyState}>
            <Ionicons name="folder-open-outline" size={56} color="#c8d3cd" />
            <Text style={styles.emptyTitle}>
              {search ? "Inga kategorier hittades" : "Inga kategorier ännu"}
            </Text>
            <Text style={styles.emptySubtitle}>
              {search
                ? `Inga kategorier matchar "${search}"`
                : "Skapa din första kategori för att komma igång"}
            </Text>
            {!search && (
              <TouchableOpacity style={styles.emptyBtn} onPress={openAdd}>
                <Ionicons name="add" size={18} color="#fff" />
                <Text style={styles.emptyBtnText}>Skapa kategori</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {filtered.map((cat) => {
          const pCount = productCountMap[cat.id] || 0;
          return (
            <View key={cat.id} style={styles.row}>
              {/* Emoji */}
              <View style={{ width: 50, alignItems: "center", justifyContent: "center" }}>
                <Text style={styles.rowEmoji}>{cat.emoji || "\uD83D\uDCC1"}</Text>
              </View>

              {/* Namn */}
              <View style={{ flex: 2, justifyContent: "center" }}>
                <Text style={styles.rowName}>{cat.name}</Text>
              </View>

              {/* Undertitel */}
              <View style={{ flex: 1.5, justifyContent: "center" }}>
                <Text style={styles.rowSubtitle} numberOfLines={1}>
                  {cat.subtitle || "\u2014"}
                </Text>
              </View>

              {/* Färg swatch */}
              <View style={{ width: 60, alignItems: "center", justifyContent: "center" }}>
                <View style={[styles.colorSwatch, { backgroundColor: cat.color || "#d5ddd8" }]} />
              </View>

              {/* Produkter count */}
              <View style={{ width: 80, alignItems: "center", justifyContent: "center" }}>
                <View style={styles.countBadge}>
                  <Text style={styles.countText}>{pCount}</Text>
                </View>
              </View>

              {/* Visas på kiosk */}
              <View style={{ width: 100, alignItems: "center", justifyContent: "center" }}>
                <TouchableOpacity onPress={() => toggleKiosk(cat)}>
                  <View style={[
                    styles.kioskBadge,
                    { backgroundColor: cat.showOnKiosk ? "#e8f5ee" : "#f3f4f6" },
                  ]}>
                    <Ionicons
                      name={cat.showOnKiosk ? "eye" : "eye-off"}
                      size={13}
                      color={cat.showOnKiosk ? "#2d6b5a" : "#9ca3af"}
                    />
                    <Text style={[
                      styles.kioskBadgeText,
                      { color: cat.showOnKiosk ? "#2d6b5a" : "#9ca3af" },
                    ]}>
                      {cat.showOnKiosk ? "Ja" : "Nej"}
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>

              {/* Status */}
              <View style={{ width: 80, alignItems: "center", justifyContent: "center" }}>
                <TouchableOpacity onPress={() => toggleActive(cat)}>
                  <View style={[
                    styles.statusBadge,
                    { backgroundColor: cat.status ? "#e8f5ee" : "#fde8e8" },
                  ]}>
                    <Text style={[
                      styles.statusText,
                      { color: cat.status ? "#2d6b5a" : "#dc2626" },
                    ]}>
                      {cat.status ? "Aktiv" : "Inaktiv"}
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>

              {/* Åtgärder */}
              <View style={{ width: 100, flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center" }}>
                <TouchableOpacity style={styles.actionBtn} onPress={() => openEdit(cat)}>
                  <Ionicons name="create-outline" size={18} color="#5b8fa8" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(cat)}>
                  <Ionicons name="trash-outline" size={18} color="#dc2626" />
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Add/Edit Modal */}
      <Modal visible={showForm} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.formModal}>
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Modal header */}
              <View style={styles.formHeader}>
                <View style={styles.formHeaderLeft}>
                  <View style={[styles.formHeaderIcon, { backgroundColor: color + "33" }]}>
                    <Text style={{ fontSize: 22 }}>{emoji || "\uD83D\uDCC1"}</Text>
                  </View>
                  <Text style={styles.formTitle}>
                    {editCat ? "Redigera kategori" : "Ny kategori"}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setShowForm(false)}>
                  <Ionicons name="close" size={24} color="#6b7c74" />
                </TouchableOpacity>
              </View>

              {/* Name */}
              <View style={styles.formField}>
                <Text style={styles.formLabel}>Namn *</Text>
                <TextInput
                  style={styles.formInput}
                  value={name}
                  onChangeText={setName}
                  placeholder="Kategorinamn"
                  placeholderTextColor="#a0a0a0"
                />
              </View>

              {/* Subtitle */}
              <View style={styles.formField}>
                <Text style={styles.formLabel}>Undertitel</Text>
                <TextInput
                  style={styles.formInput}
                  value={subtitle}
                  onChangeText={setSubtitle}
                  placeholder="Kort beskrivning"
                  placeholderTextColor="#a0a0a0"
                />
              </View>

              {/* Description */}
              <View style={styles.formField}>
                <Text style={styles.formLabel}>Beskrivning</Text>
                <TextInput
                  style={[styles.formInput, styles.formTextarea]}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Valfri längre beskrivning..."
                  placeholderTextColor="#a0a0a0"
                  multiline
                  numberOfLines={3}
                />
              </View>

              {/* Emoji + Sort order row */}
              <View style={styles.formRow}>
                <View style={[styles.formField, { flex: 1 }]}>
                  <Text style={styles.formLabel}>Emoji</Text>
                  <TextInput
                    style={styles.formInput}
                    value={emoji}
                    onChangeText={setEmoji}
                    placeholder="\uD83D\uDCC1"
                    placeholderTextColor="#a0a0a0"
                  />
                </View>
                <View style={[styles.formField, { flex: 1 }]}>
                  <Text style={styles.formLabel}>Sorteringsordning</Text>
                  <TextInput
                    style={styles.formInput}
                    value={sortOrder}
                    onChangeText={setSortOrder}
                    placeholder="0"
                    placeholderTextColor="#a0a0a0"
                    keyboardType="numeric"
                  />
                </View>
              </View>

              {/* Color */}
              <View style={styles.formField}>
                <Text style={styles.formLabel}>Färg</Text>
                <View style={styles.colorInputRow}>
                  <View style={[styles.colorPreview, { backgroundColor: color }]} />
                  <TextInput
                    style={[styles.formInput, { flex: 1 }]}
                    value={color}
                    onChangeText={setColor}
                    placeholder="#d5ddd8"
                    placeholderTextColor="#a0a0a0"
                  />
                </View>
                <View style={styles.colorPresets}>
                  {COLOR_PRESETS.map((c) => (
                    <TouchableOpacity
                      key={c}
                      onPress={() => setColor(c)}
                      style={[
                        styles.colorPresetBtn,
                        { backgroundColor: c },
                        color === c && styles.colorPresetSelected,
                      ]}
                    />
                  ))}
                </View>
              </View>

              {/* Toggles */}
              <View style={styles.toggleSection}>
                <View style={styles.toggleRow}>
                  <View style={styles.toggleInfo}>
                    <Ionicons name="storefront-outline" size={18} color="#6b7c74" />
                    <View>
                      <Text style={styles.toggleLabel}>Visa på kiosk</Text>
                      <Text style={styles.toggleHint}>Kategorin visas i kioskläge</Text>
                    </View>
                  </View>
                  <Switch
                    value={showOnKiosk}
                    onValueChange={setShowOnKiosk}
                    trackColor={{ false: "#d1d5db", true: "#a7d5c5" }}
                    thumbColor={showOnKiosk ? "#2d6b5a" : "#9ca3af"}
                  />
                </View>

                <View style={styles.toggleDivider} />

                <View style={styles.toggleRow}>
                  <View style={styles.toggleInfo}>
                    <Ionicons name="checkmark-circle-outline" size={18} color="#6b7c74" />
                    <View>
                      <Text style={styles.toggleLabel}>Aktiv</Text>
                      <Text style={styles.toggleHint}>Inaktiva kategorier döljs överallt</Text>
                    </View>
                  </View>
                  <Switch
                    value={active}
                    onValueChange={setActive}
                    trackColor={{ false: "#d1d5db", true: "#a7d5c5" }}
                    thumbColor={active ? "#2d6b5a" : "#9ca3af"}
                  />
                </View>
              </View>

              {/* Actions */}
              <View style={styles.formActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowForm(false)}>
                  <Text style={styles.cancelBtnText}>Avbryt</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveBtn, !name.trim() && styles.saveBtnDisabled]}
                  onPress={handleSave}
                  disabled={!name.trim()}
                >
                  <Ionicons name="checkmark" size={18} color="#fff" />
                  <Text style={styles.saveBtnText}>
                    {editCat ? "Uppdatera" : "Skapa"}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
  },

  /* Header */
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#2c3e35",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#6b7c74",
    marginTop: 2,
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#2d6b5a",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  addBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },

  /* Search */
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#2c3e35",
  },

  /* Table */
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f9fafb",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    marginBottom: 4,
  },
  th: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6b7c74",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  tableBody: {
    flex: 1,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    backgroundColor: "#fff",
    minHeight: 56,
  },
  rowEmoji: {
    fontSize: 22,
  },
  rowName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2c3e35",
  },
  rowSubtitle: {
    fontSize: 13,
    color: "#6b7c74",
  },

  /* Color swatch */
  colorSwatch: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
  },

  /* Count badge */
  countBadge: {
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  countText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#4b5563",
  },

  /* Kiosk badge */
  kioskBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  kioskBadgeText: {
    fontSize: 12,
    fontWeight: "600",
  },

  /* Status badge */
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },

  /* Action buttons */
  actionBtn: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: "#f9fafb",
  },

  /* Empty state */
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#2c3e35",
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#6b7c74",
    marginTop: 6,
    textAlign: "center",
  },
  emptyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#2d6b5a",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 20,
  },
  emptyBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },

  /* Modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  formModal: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 28,
    width: 480,
    maxHeight: "85%",
    elevation: 10,
  },
  formHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  formHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  formHeaderIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  formTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#2c3e35",
  },
  formField: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6b7c74",
    marginBottom: 6,
  },
  formInput: {
    height: 44,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 15,
    color: "#2c3e35",
    backgroundColor: "#fff",
  },
  formTextarea: {
    height: 80,
    textAlignVertical: "top",
    paddingTop: 10,
  },
  formRow: {
    flexDirection: "row",
    gap: 12,
  },

  /* Color picker */
  colorInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  colorPreview: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
  },
  colorPresets: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },
  colorPresetBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "transparent",
  },
  colorPresetSelected: {
    borderColor: "#2d6b5a",
    borderWidth: 2,
  },

  /* Toggle section */
  toggleSection: {
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  toggleInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2c3e35",
  },
  toggleHint: {
    fontSize: 12,
    color: "#6b7c74",
    marginTop: 1,
  },
  toggleDivider: {
    height: 1,
    backgroundColor: "#e5e7eb",
    marginVertical: 12,
  },

  /* Form actions */
  formActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  cancelBtn: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  cancelBtnText: {
    fontSize: 15,
    color: "#6b7c74",
  },
  saveBtn: {
    flex: 1,
    height: 44,
    backgroundColor: "#2d6b5a",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
  },
  saveBtnDisabled: {
    backgroundColor: "#9ca3af",
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
  },
});
