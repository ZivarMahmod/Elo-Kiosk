/**
 * Admin Receipts page — receipt history
 */

import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useReceipts } from "@/hooks/useReceipts";

export default function ReceiptsPage() {
  const { receipts, loading, todayRevenue, todayCount, refresh } = useReceipts();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Kvitton</Text>
          <Text style={styles.subtitle}>{receipts.length} kvitton totalt</Text>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={refresh}>
          <Ionicons name="refresh-outline" size={20} color="#6b7c74" />
        </TouchableOpacity>
      </View>

      {/* Today summary */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { backgroundColor: "#e8f5ee" }]}>
          <Text style={styles.summaryLabel}>Idag</Text>
          <Text style={[styles.summaryValue, { color: "#2d6b5a" }]}>{todayRevenue} kr</Text>
          <Text style={styles.summaryExtra}>{todayCount} kvitton</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: "#fdf4e8" }]}>
          <Text style={styles.summaryLabel}>Totalt</Text>
          <Text style={[styles.summaryValue, { color: "#c47a3a" }]}>
            {receipts.reduce((s, r) => s + r.total, 0)} kr
          </Text>
          <Text style={styles.summaryExtra}>{receipts.length} kvitton</Text>
        </View>
      </View>

      {/* Table */}
      <View style={styles.tableHeader}>
        <Text style={[styles.th, { flex: 1 }]}>Kvitto-nr</Text>
        <Text style={[styles.th, { flex: 1 }]}>Datum</Text>
        <Text style={[styles.th, { flex: 1 }]}>Tid</Text>
        <Text style={[styles.th, { width: 80 }]}>Artiklar</Text>
        <Text style={[styles.th, { width: 100 }]}>Total</Text>
        <Text style={[styles.th, { width: 100 }]}>Betalning</Text>
        <Text style={[styles.th, { width: 100 }]}>Status</Text>
      </View>

      <ScrollView style={styles.tableBody}>
        {receipts.length === 0 ? (
          <Text style={styles.emptyText}>Inga kvitton registrerade</Text>
        ) : (
          receipts.map((r) => (
            <View key={r.id} style={styles.row}>
              <Text style={[styles.td, { flex: 1, fontWeight: "600" }]}>{r.kvittoNummer}</Text>
              <Text style={[styles.td, { flex: 1 }]}>{r.datum}</Text>
              <Text style={[styles.td, { flex: 1 }]}>{r.tid}</Text>
              <Text style={[styles.td, { width: 80, textAlign: "center" }]}>{r.items.length}</Text>
              <Text style={[styles.td, { width: 100, fontWeight: "600" }]}>{r.total} kr</Text>
              <Text style={[styles.td, { width: 100 }]}>{r.betalning}</Text>
              <View style={{ width: 100 }}>
                <View style={[styles.statusBadge, {
                  backgroundColor: r.status === "registrerad" ? "#e8f5ee" : "#fdf4e8"
                }]}>
                  <Text style={[styles.statusText, {
                    color: r.status === "registrerad" ? "#2d6b5a" : "#c47a3a"
                  }]}>
                    {r.status === "registrerad" ? "Registrerad" : "Ej registrerad"}
                  </Text>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  title: { fontSize: 28, fontWeight: "700", color: "#2c3e35" },
  subtitle: { fontSize: 14, color: "#6b7c74" },
  refreshBtn: { padding: 10, backgroundColor: "#fff", borderRadius: 10, borderWidth: 1, borderColor: "#e5e7eb" },
  summaryRow: { flexDirection: "row", gap: 14, marginBottom: 20 },
  summaryCard: { flex: 1, padding: 18, borderRadius: 14 },
  summaryLabel: { fontSize: 13, color: "#6b7c74" },
  summaryValue: { fontSize: 28, fontWeight: "700", marginVertical: 4 },
  summaryExtra: { fontSize: 13, color: "#6b7c74" },
  tableHeader: { flexDirection: "row", backgroundColor: "#f9fafb", paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8 },
  th: { fontSize: 12, fontWeight: "600", color: "#6b7c74", textTransform: "uppercase" },
  tableBody: { flex: 1, marginTop: 4 },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 12, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: "#f0f0f0", backgroundColor: "#fff" },
  td: { fontSize: 14, color: "#2c3e35" },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, alignSelf: "flex-start" },
  statusText: { fontSize: 11, fontWeight: "600" },
  emptyText: { padding: 20, textAlign: "center", color: "#8a9b93", fontStyle: "italic" },
});
