/**
 * Admin Reports page — sales reports & statistics
 */

import { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useReceipts } from "@/hooks/useReceipts";

export default function ReportsPage() {
  const { receipts } = useReceipts();

  // Calculate stats
  const totalRevenue = receipts.reduce((sum, r) => sum + r.total, 0);
  const avgOrder = receipts.length > 0 ? Math.round(totalRevenue / receipts.length) : 0;

  // Revenue by date
  const revenueByDate = new Map<string, number>();
  for (const r of receipts) {
    revenueByDate.set(r.datum, (revenueByDate.get(r.datum) || 0) + r.total);
  }
  const dailyRevenue = Array.from(revenueByDate.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .slice(0, 14);

  // Top products
  const productSales = new Map<string, { qty: number; revenue: number }>();
  for (const r of receipts) {
    for (const item of r.items) {
      const existing = productSales.get(item.namn) || { qty: 0, revenue: 0 };
      productSales.set(item.namn, {
        qty: existing.qty + item.antal,
        revenue: existing.revenue + item.prisTotal,
      });
    }
  }
  const topProducts = Array.from(productSales.entries())
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .slice(0, 10);

  // Payment methods
  const paymentMethods = new Map<string, number>();
  for (const r of receipts) {
    paymentMethods.set(r.betalning, (paymentMethods.get(r.betalning) || 0) + 1);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Rapporter & statistik</Text>
      <Text style={styles.subtitle}>Baserat på {receipts.length} kvitton</Text>

      {/* Summary cards */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { backgroundColor: "#e8f5ee" }]}>
          <Ionicons name="cash-outline" size={24} color="#2d6b5a" />
          <Text style={styles.summaryLabel}>Total omsättning</Text>
          <Text style={[styles.summaryValue, { color: "#2d6b5a" }]}>{totalRevenue} kr</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: "#fdf4e8" }]}>
          <Ionicons name="receipt-outline" size={24} color="#c47a3a" />
          <Text style={styles.summaryLabel}>Antal kvitton</Text>
          <Text style={[styles.summaryValue, { color: "#c47a3a" }]}>{receipts.length}</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: "#e8f0fa" }]}>
          <Ionicons name="trending-up-outline" size={24} color="#5b8fa8" />
          <Text style={styles.summaryLabel}>Snittorder</Text>
          <Text style={[styles.summaryValue, { color: "#5b8fa8" }]}>{avgOrder} kr</Text>
        </View>
      </View>

      {/* Daily Revenue */}
      <Text style={styles.sectionTitle}>Daglig omsättning</Text>
      <View style={styles.listCard}>
        {dailyRevenue.length === 0 ? (
          <Text style={styles.emptyText}>Ingen data</Text>
        ) : (
          dailyRevenue.map(([date, rev]) => (
            <View key={date} style={styles.listRow}>
              <Text style={styles.listLabel}>{date}</Text>
              <Text style={styles.listValue}>{rev} kr</Text>
            </View>
          ))
        )}
      </View>

      {/* Top products */}
      <Text style={styles.sectionTitle}>Mest sålda produkter</Text>
      <View style={styles.listCard}>
        {topProducts.length === 0 ? (
          <Text style={styles.emptyText}>Ingen data</Text>
        ) : (
          topProducts.map(([name, data], i) => (
            <View key={name} style={styles.listRow}>
              <Text style={styles.listRank}>#{i + 1}</Text>
              <Text style={[styles.listLabel, { flex: 1 }]}>{name}</Text>
              <Text style={styles.listExtra}>{data.qty} st</Text>
              <Text style={styles.listValue}>{data.revenue} kr</Text>
            </View>
          ))
        )}
      </View>

      {/* Payment methods */}
      <Text style={styles.sectionTitle}>Betalmetoder</Text>
      <View style={styles.listCard}>
        {Array.from(paymentMethods.entries()).map(([method, count]) => (
          <View key={method} style={styles.listRow}>
            <Text style={styles.listLabel}>{method}</Text>
            <Text style={styles.listValue}>{count} st</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 24, gap: 16, paddingBottom: 40 },
  title: { fontSize: 28, fontWeight: "700", color: "#2c3e35" },
  subtitle: { fontSize: 14, color: "#6b7c74" },
  summaryRow: { flexDirection: "row", gap: 14 },
  summaryCard: { flex: 1, padding: 18, borderRadius: 14, gap: 6 },
  summaryLabel: { fontSize: 13, color: "#6b7c74" },
  summaryValue: { fontSize: 28, fontWeight: "700" },
  sectionTitle: { fontSize: 18, fontWeight: "600", color: "#2c3e35" },
  listCard: { backgroundColor: "#fff", borderRadius: 12, borderWidth: 1, borderColor: "#f0f0f0" },
  listRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: "#f5f5f5" },
  listRank: { fontSize: 13, fontWeight: "600", color: "#8a9b93", width: 28 },
  listLabel: { fontSize: 14, color: "#2c3e35" },
  listExtra: { fontSize: 13, color: "#6b7c74" },
  listValue: { fontSize: 14, fontWeight: "600", color: "#2c3e35", minWidth: 80, textAlign: "right" },
  emptyText: { padding: 16, textAlign: "center", color: "#8a9b93", fontStyle: "italic" },
});
