/**
 * Admin Categories page
 */

import { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Modal, Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useCategories } from "@/hooks/useCategories";
import type { Category } from "@/core/types/category";

export default function CategoriesPage() {
  const { categories, loading, add, update, remove } = useCategories();
  const [showForm, setShowForm] = useState(false);
  const [editCat, setEditCat] = useState<Category | null>(null);

  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("");
  const [color, setColor] = useState("#d5ddd8");
  const [subtitle, setSubtitle] = useState("");

  const openAdd = () => {
    setEditCat(null);
    setName(""); setEmoji(""); setColor("#d5ddd8"); setSubtitle("");
    setShowForm(true);
  };

  const openEdit = (c: Category) => {
    setEditCat(c);
    setName(c.name); setEmoji(c.emoji || ""); setColor(c.color || "#d5ddd8"); setSubtitle(c.subtitle || "");
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    if (editCat) {
      await update({ id: editCat.id, name: name.trim(), emoji, color, subtitle });
    } else {
      await add({ name: name.trim(), emoji, color, subtitle });
    }
    setShowForm(false);
  };

  const handleDelete = (c: Category) => {
    Alert.alert("Ta bort", `Vill du ta bort "${c.name}"?`, [
      { text: "Avbryt" },
      { text: "Ta bort", style: "destructive", onPress: () => remove(c.id) },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Kategorier</Text>
          <Text style={styles.subtitle}>{categories.length} kategorier</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.addBtnText}>Ny kategori</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.grid}>
        {categories.map((cat) => (
          <View key={cat.id} style={[styles.card, { backgroundColor: cat.color || "#d5ddd8" }]}>
            <Text style={styles.cardEmoji}>{cat.emoji || "\uD83D\uDCC1"}</Text>
            <Text style={styles.cardName}>{cat.name}</Text>
            {cat.subtitle ? <Text style={styles.cardSub}>{cat.subtitle}</Text> : null}
            <View style={styles.cardActions}>
              <TouchableOpacity onPress={() => openEdit(cat)}>
                <Ionicons name="create-outline" size={18} color="#2c3e35" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDelete(cat)}>
                <Ionicons name="trash-outline" size={18} color="#c44040" />
              </TouchableOpacity>
            </View>
            <View style={styles.statusDot}>
              <View style={[styles.dot, { backgroundColor: cat.showOnKiosk ? "#2d6b5a" : "#ccc" }]} />
              <Text style={styles.dotText}>{cat.showOnKiosk ? "Visas" : "Dold"}</Text>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Modal */}
      <Modal visible={showForm} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.formModal}>
            <Text style={styles.formTitle}>{editCat ? "Redigera kategori" : "Ny kategori"}</Text>
            <View style={styles.formField}>
              <Text style={styles.formLabel}>Namn</Text>
              <TextInput style={styles.formInput} value={name} onChangeText={setName} placeholder="Kategorinamn" />
            </View>
            <View style={{ flexDirection: "row", gap: 12 }}>
              <View style={[styles.formField, { flex: 1 }]}>
                <Text style={styles.formLabel}>Emoji</Text>
                <TextInput style={styles.formInput} value={emoji} onChangeText={setEmoji} placeholder="\uD83D\uDCC1" />
              </View>
              <View style={[styles.formField, { flex: 1 }]}>
                <Text style={styles.formLabel}>Färg</Text>
                <TextInput style={styles.formInput} value={color} onChangeText={setColor} placeholder="#d5ddd8" />
              </View>
            </View>
            <View style={styles.formField}>
              <Text style={styles.formLabel}>Undertitel</Text>
              <TextInput style={styles.formInput} value={subtitle} onChangeText={setSubtitle} placeholder="Kort beskrivning" />
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
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 14, paddingBottom: 24 },
  card: { width: "23%", minHeight: 140, borderRadius: 16, padding: 16, justifyContent: "flex-end", borderWidth: 1, borderColor: "rgba(0,0,0,0.06)" },
  cardEmoji: { position: "absolute", top: 10, right: 12, fontSize: 36, opacity: 0.6 },
  cardName: { fontSize: 20, fontWeight: "700", color: "#2c3e35" },
  cardSub: { fontSize: 13, color: "#4a5a52", marginTop: 2 },
  cardActions: { flexDirection: "row", gap: 12, marginTop: 10 },
  statusDot: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotText: { fontSize: 11, color: "#6b7c74" },

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
