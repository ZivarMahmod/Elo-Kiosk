/**
 * Admin Wishes page — customer wishes
 */

import { useState, useEffect } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Modal, Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getAllWishes, createWish, deleteWish } from "@/core/database/wishes";
import type { Wish } from "@/core/types/wish";

export default function WishesPage() {
  const [wishes, setWishes] = useState<Wish[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [category, setCategory] = useState("");
  const [text, setText] = useState("");

  const refresh = async () => {
    const data = await getAllWishes();
    setWishes(data);
  };

  useEffect(() => { refresh(); }, []);

  const handleSave = async () => {
    if (!text.trim()) return;
    await createWish({ category: category.trim() || "Allmänt", text: text.trim() });
    setCategory(""); setText("");
    setShowForm(false);
    await refresh();
  };

  const handleDelete = (w: Wish) => {
    Alert.alert("Ta bort", "Vill du ta bort detta önskemål?", [
      { text: "Avbryt" },
      { text: "Ta bort", style: "destructive", onPress: async () => { await deleteWish(w.id); await refresh(); } },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Kundönskemål</Text>
          <Text style={styles.subtitle}>{wishes.length} önskemål</Text>
        </View>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {wishes.length > 0 && (
            <TouchableOpacity
              style={[styles.addBtn, { backgroundColor: "#e74c3c" }]}
              onPress={() => {
                Alert.alert(
                  "Rensa alla önskemål",
                  `Är du säker på att du vill ta bort alla ${wishes.length} önskemål? Detta kan inte ångras.`,
                  [
                    { text: "Avbryt" },
                    {
                      text: `Rensa ${wishes.length} st`,
                      style: "destructive",
                      onPress: async () => {
                        for (const w of wishes) { await deleteWish(w.id); }
                        await refresh();
                      },
                    },
                  ]
                );
              }}
            >
              <Ionicons name="trash-outline" size={16} color="#fff" />
              <Text style={styles.addBtnText}>Rensa alla ({wishes.length})</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.addBtn} onPress={() => setShowForm(true)}>
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.addBtnText}>Lägg till</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {wishes.length === 0 ? (
          <View style={{ alignItems: "center", paddingVertical: 40 }}>
            <Ionicons name="heart-outline" size={48} color="#d1d5db" />
            <Text style={{ fontSize: 16, fontWeight: "600", color: "#2c3e35", marginTop: 12 }}>Inga önskemål ännu</Text>
            <Text style={styles.emptyText}>Kundernas önskemål visas här</Text>
          </View>
        ) : (
          wishes.map((w) => (
            <View key={w.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.catBadge}>
                  <Text style={styles.catBadgeText}>{w.category}</Text>
                </View>
                <Text style={styles.cardDate}>{w.timestamp?.split("T")[0] || ""}</Text>
              </View>
              <Text style={styles.cardText}>{w.text}</Text>
              <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(w)}>
                <Ionicons name="trash-outline" size={16} color="#c44040" />
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>

      <Modal visible={showForm} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.formModal}>
            <Text style={styles.formTitle}>Nytt önskemål</Text>
            <View style={styles.formField}>
              <Text style={styles.formLabel}>Kategori</Text>
              <TextInput style={styles.formInput} value={category} onChangeText={setCategory} placeholder="T.ex. Drycker, Snacks" />
            </View>
            <View style={styles.formField}>
              <Text style={styles.formLabel}>Önskemål</Text>
              <TextInput style={[styles.formInput, { height: 80 }]} value={text} onChangeText={setText} placeholder="Beskriv önskemålet..." multiline />
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
  list: { gap: 12, paddingBottom: 24 },
  emptyText: { fontSize: 14, color: "#8a9b93", fontStyle: "italic" },
  card: { backgroundColor: "#fff", borderRadius: 12, padding: 16, borderWidth: 1, borderColor: "#f0f0f0" },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  catBadge: { backgroundColor: "#e8f0ec", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  catBadgeText: { fontSize: 12, fontWeight: "600", color: "#2d6b5a" },
  cardDate: { fontSize: 12, color: "#8a9b93" },
  cardText: { fontSize: 15, color: "#2c3e35", lineHeight: 22 },
  deleteBtn: { position: "absolute", bottom: 14, right: 14 },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.3)", justifyContent: "center", alignItems: "center" },
  formModal: { backgroundColor: "#fff", borderRadius: 16, padding: 28, width: 400, elevation: 10 },
  formTitle: { fontSize: 22, fontWeight: "700", color: "#2c3e35", marginBottom: 20 },
  formField: { marginBottom: 14 },
  formLabel: { fontSize: 13, fontWeight: "600", color: "#6b7c74", marginBottom: 4 },
  formInput: { height: 44, borderWidth: 1, borderColor: "#d1d5db", borderRadius: 8, paddingHorizontal: 12, fontSize: 15, color: "#2c3e35", textAlignVertical: "top" },
  formActions: { flexDirection: "row", gap: 12, marginTop: 16 },
  cancelBtn: { flex: 1, height: 44, borderWidth: 1, borderColor: "#d1d5db", borderRadius: 10, justifyContent: "center", alignItems: "center" },
  cancelBtnText: { fontSize: 15, color: "#6b7c74" },
  saveBtn: { flex: 1, height: 44, backgroundColor: "#2d6b5a", borderRadius: 10, justifyContent: "center", alignItems: "center" },
  saveBtnText: { fontSize: 15, fontWeight: "600", color: "#fff" },
});
