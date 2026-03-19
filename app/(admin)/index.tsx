/**
 * Admin Dashboard — shows stats from local SQLite
 */

import { useState, useEffect, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useProducts } from "@/hooks/useProducts";
import { useCategories } from "@/hooks/useCategories";
import { useReceipts } from "@/hooks/useReceipts";
import { useSettings } from "@/hooks/useSettings";
import { getWishCount } from "@/core/database/wishes";
import { getAllOffers } from "@/core/database/offers";

export default function AdminDashboard() {
  const { count: productCount, loading: prodLoading } = useProducts();
  const { count: categoryCount } = useCategories();
  const { count: receiptCount, todayRevenue, todayCount, refresh: refreshReceipts } = useReceipts();
  const { settings } = useSettings();
  const [wishCount, setWishCount] = useState(0);
  const [offerCount, setOfferCount] = useState(0);

  useEffect(() => {
    getWishCount().then(setWishCount).catch(() => {});
    getAllOffers().then((o) => setOfferCount(o.length)).catch(() => {});
  }, []);

  const stats = [
    { label: "Produkter", value: productCount, icon: "cube-outline" as const, color: "#2d6b5a" },
    { label: "Kategorier", value: categoryCount, icon: "folder-outline" as const, color: "#5b8fa8" },
    { label: "Kvitton totalt", value: receiptCount, icon: "receipt-outline" as const, color: "#c47a3a" },
    { label: "Erbjudanden", value: offerCount, icon: "pricetag-outline" as const, color: "#9b59b6" },
    { label: "Önskemål", value: wishCount, icon: "heart-outline" as const, color: "#e74c3c" },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Dashboard</Text>
          <Text style={styles.subtitle}>{settings.storeName} - Översikt</Text>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={refreshReceipts}>
          <Ionicons name="refresh-outline" size={20} color="#6b7c74" />
        </TouchableOpacity>
      </View>

      {/* Today's stats */}
      <View style={styles.todaySection}>
        <Text style={styles.sectionTitle}>Idag</Text>
        <View style={styles.todayRow}>
          <View style={[styles.todayCard, { backgroundColor: "#e8f5ee" }]}>
            <Text style={styles.todayLabel}>Försäljning idag</Text>
            <Text style={[styles.todayValue, { color: "#2d6b5a" }]}>{todayRevenue} kr</Text>
          </View>
          <View style={[styles.todayCard, { backgroundColor: "#fdf4e8" }]}>
            <Text style={styles.todayLabel}>Kvitton idag</Text>
            <Text style={[styles.todayValue, { color: "#c47a3a" }]}>{todayCount}</Text>
          </View>
          <View style={[styles.todayCard, { backgroundColor: "#e8f0fa" }]}>
            <Text style={styles.todayLabel}>Snittorder</Text>
            <Text style={[styles.todayValue, { color: "#5b8fa8" }]}>
              {todayCount > 0 ? Math.round(todayRevenue / todayCount) : 0} kr
            </Text>
          </View>
        </View>
      </View>

      {/* Stats Grid */}
      <Text style={styles.sectionTitle}>Totalt i databasen</Text>
      <View style={styles.statsGrid}>
        {stats.map((stat) => (
          <View key={stat.label} style={styles.statCard}>
            <View style={[styles.statIconBox, { backgroundColor: stat.color + "15" }]}>
              <Ionicons name={stat.icon} size={24} color={stat.color} />
            </View>
            <Text style={styles.statValue}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>

      {/* Quick info */}
      <View style={styles.infoSection}>
        <Text style={styles.sectionTitle}>Snabbinfo</Text>
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Butiksnamn</Text>
            <Text style={styles.infoValue}>{settings.storeName}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Swish-nummer</Text>
            <Text style={styles.infoValue}>{settings.swishNumber || "Ej konfigurerat"}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Beställningar pausade</Text>
            <Text style={[styles.infoValue, { color: settings.ordersPaused ? "#e74c3c" : "#2d6b5a" }]}>
              {settings.ordersPaused ? "JA" : "Nej"}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Skärmsläckare</Text>
            <Text style={styles.infoValue}>{settings.screensaverEnabled ? "Aktiverad" : "Avaktiverad"}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Temaläge</Text>
            <Text style={styles.infoValue}>{settings.themeMode}</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 24, gap: 20 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontSize: 28, fontWeight: "700", color: "#2c3e35" },
  subtitle: { fontSize: 14, color: "#6b7c74", marginTop: 2 },
  refreshBtn: { padding: 10, backgroundColor: "#fff", borderRadius: 10, borderWidth: 1, borderColor: "#e5e7eb" },
  sectionTitle: { fontSize: 18, fontWeight: "600", color: "#2c3e35", marginBottom: 12 },

  todaySection: { marginBottom: 4 },
  todayRow: { flexDirection: "row", gap: 14 },
  todayCard: { flex: 1, padding: 18, borderRadius: 14 },
  todayLabel: { fontSize: 13, color: "#6b7c74", marginBottom: 6 },
  todayValue: { fontSize: 28, fontWeight: "700" },

  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 14 },
  statCard: { width: "18%", backgroundColor: "#fff", borderRadius: 14, padding: 16, alignItems: "center", borderWidth: 1, borderColor: "#f0f0f0" },
  statIconBox: { width: 48, height: 48, borderRadius: 12, justifyContent: "center", alignItems: "center", marginBottom: 10 },
  statValue: { fontSize: 24, fontWeight: "700", color: "#2c3e35" },
  statLabel: { fontSize: 12, color: "#6b7c74", marginTop: 4 },

  infoSection: {},
  infoCard: { backgroundColor: "#fff", borderRadius: 14, padding: 18, borderWidth: 1, borderColor: "#f0f0f0" },
  infoRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#f5f5f5" },
  infoLabel: { fontSize: 14, color: "#6b7c74" },
  infoValue: { fontSize: 14, fontWeight: "600", color: "#2c3e35" },
});
