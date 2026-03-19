/**
 * Admin Offers page — offers/deals management
 */

import { useState, useEffect } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Modal, Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getAllOffers, createOffer, deleteOffer } from "@/core/database/offers";
import type { Offer } from "@/core/types/offer";

export default function OffersPage() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [discount, setDiscount] = useState("");

  const refresh = async () => {
    const data = await getAllOffers();
    setOffers(data);
  };

  useEffect(() => { refresh(); }, []);

  const handleSave = async () => {
    if (!title.trim()) return;
    await createOffer({
      title: title.trim(),
      description: description.trim(),
      offerPrice: Number(price) || 0,
      discount: Number(discount) || 0,
    });
    setTitle(""); setDescription(""); setPrice(""); setDiscount("");
    setShowForm(false);
    await refresh();
  };

  const handleDelete = (o: Offer) => {
    Alert.alert("Ta bort", `Vill du ta bort "${o.title}"?`, [
      { text: "Avbryt" },
      { text: "Ta bort", style: "destructive", onPress: async () => { await deleteOffer(o.id); await refresh(); } },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Erbjudanden</Text>
          <Text style={styles.subtitle}>{offers.length} erbjudanden</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowForm(true)}>
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.addBtnText}>Nytt erbjudande</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.grid}>
        {offers.length === 0 ? (
          <Text style={styles.emptyText}>Inga erbjudanden skapade</Text>
        ) : (
          offers.map((o) => (
            <View key={o.id} style={styles.card}>
              <View style={styles.cardTop}>
                <View style={styles.dealBadge}><Text style={styles.dealBadgeText}>DEAL</Text></View>
                <TouchableOpacity onPress={() => handleDelete(o)}>
                  <Ionicons name="trash-outline" size={18} color="#c44040" />
                </TouchableOpacity>
              </View>
              <Text style={styles.cardTitle}>{o.title}</Text>
              <Text style={styles.cardDesc}>{o.description}</Text>
              <View style={styles.cardPriceRow}>
                <Text style={styles.cardPrice}>{o.offerPrice} kr</Text>
                {o.discount > 0 && <Text style={styles.cardDiscount}>-{o.discount}%</Text>}
              </View>
              {o.isMainOffer && <Text style={styles.mainLabel}>Huvuderbjudande</Text>}
            </View>
          ))
        )}
      </ScrollView>

      <Modal visible={showForm} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.formModal}>
            <Text style={styles.formTitle}>Nytt erbjudande</Text>
            <View style={styles.formField}>
              <Text style={styles.formLabel}>Titel</Text>
              <TextInput style={styles.formInput} value={title} onChangeText={setTitle} placeholder="Erbjudandenamn" />
            </View>
            <View style={styles.formField}>
              <Text style={styles.formLabel}>Beskrivning</Text>
              <TextInput style={styles.formInput} value={description} onChangeText={setDescription} placeholder="Kort beskrivning" />
            </View>
            <View style={{ flexDirection: "row", gap: 12 }}>
              <View style={[styles.formField, { flex: 1 }]}>
                <Text style={styles.formLabel}>Pris (kr)</Text>
                <TextInput style={styles.formInput} value={price} onChangeText={setPrice} keyboardType="numeric" placeholder="0" />
              </View>
              <View style={[styles.formField, { flex: 1 }]}>
                <Text style={styles.formLabel}>Rabatt (%)</Text>
                <TextInput style={styles.formInput} value={discount} onChangeText={setDiscount} keyboardType="numeric" placeholder="0" />
              </View>
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
  emptyText: { fontSize: 14, color: "#8a9b93", fontStyle: "italic", padding: 20 },
  card: { width: "31%", backgroundColor: "#fdf8f0", borderWidth: 1, borderColor: "#e8c87a", borderRadius: 14, padding: 16 },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  dealBadge: { backgroundColor: "rgba(196,122,58,0.15)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  dealBadgeText: { fontSize: 11, fontWeight: "700", color: "#c47a3a", letterSpacing: 1 },
  cardTitle: { fontSize: 18, fontWeight: "700", color: "#2c3e35" },
  cardDesc: { fontSize: 13, color: "#6b7c74", marginTop: 4 },
  cardPriceRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 },
  cardPrice: { fontSize: 20, fontWeight: "700", color: "#c47a3a" },
  cardDiscount: { fontSize: 14, color: "#dc2626", fontWeight: "600" },
  mainLabel: { fontSize: 11, color: "#2d6b5a", fontWeight: "600", marginTop: 6 },

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
