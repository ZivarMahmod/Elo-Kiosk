/**
 * Admin Reports — Fullständiga rapporter & statistik
 * Perioder, ABC-analys, timvis heatmap, momsrapport, export
 */

import { useState, useMemo } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useReceipts } from "@/hooks/useReceipts";
import { useProducts } from "@/hooks/useProducts";
import { useCategories } from "@/hooks/useCategories";

type Period = "today" | "7days" | "30days" | "90days" | "year" | "all";
type Tab = "overview" | "products" | "detailed";

const PERIOD_LABELS: Record<Period, string> = {
  today: "Idag",
  "7days": "7 dagar",
  "30days": "30 dagar",
  "90days": "90 dagar",
  year: "I år",
  all: "All tid",
};

function getStartDate(period: Period): Date {
  const now = new Date();
  switch (period) {
    case "today": return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    case "7days": return new Date(now.getTime() - 7 * 86400000);
    case "30days": return new Date(now.getTime() - 30 * 86400000);
    case "90days": return new Date(now.getTime() - 90 * 86400000);
    case "year": return new Date(now.getFullYear(), 0, 1);
    case "all": return new Date(2020, 0, 1);
  }
}

export default function ReportsPage() {
  const { receipts } = useReceipts();
  const { products } = useProducts();
  const { categories } = useCategories();
  const [period, setPeriod] = useState<Period>("30days");
  const [tab, setTab] = useState<Tab>("overview");

  // Filter receipts by period
  const filtered = useMemo(() => {
    const start = getStartDate(period);
    return receipts.filter((r) => {
      const d = new Date(r.datum + "T" + (r.tid || "00:00"));
      return d >= start;
    });
  }, [receipts, period]);

  // Previous period for comparison
  const prevFiltered = useMemo(() => {
    const start = getStartDate(period);
    const now = new Date();
    const periodMs = now.getTime() - start.getTime();
    const prevStart = new Date(start.getTime() - periodMs);
    return receipts.filter((r) => {
      const d = new Date(r.datum + "T" + (r.tid || "00:00"));
      return d >= prevStart && d < start;
    });
  }, [receipts, period]);

  // Stats
  const totalRevenue = filtered.reduce((s, r) => s + r.total, 0);
  const prevRevenue = prevFiltered.reduce((s, r) => s + r.total, 0);
  const avgOrder = filtered.length > 0 ? Math.round(totalRevenue / filtered.length) : 0;
  const prevAvg = prevFiltered.length > 0 ? Math.round(prevRevenue / prevFiltered.length) : 0;
  const totalItems = filtered.reduce((s, r) => s + r.items.reduce((a: number, i: any) => a + i.antal, 0), 0);

  const pctChange = (curr: number, prev: number) => {
    if (prev === 0) return curr > 0 ? 100 : 0;
    return Math.round(((curr - prev) / prev) * 100);
  };

  // Daily revenue (last 14 days)
  const dailyRevenue = useMemo(() => {
    const map = new Map<string, { revenue: number; orders: number }>();
    for (const r of filtered) {
      const existing = map.get(r.datum) || { revenue: 0, orders: 0 };
      map.set(r.datum, { revenue: existing.revenue + r.total, orders: existing.orders + 1 });
    }
    return Array.from(map.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .slice(0, 14)
      .reverse();
  }, [filtered]);

  const maxDailyRevenue = Math.max(...dailyRevenue.map(([_, d]) => d.revenue), 1);

  // Hourly heatmap
  const hourlySales = useMemo(() => {
    const hours = Array(24).fill(0);
    for (const r of filtered) {
      const hour = parseInt(r.tid?.split(":")[0] || "0", 10);
      hours[hour] += r.total;
    }
    return hours;
  }, [filtered]);
  const maxHourly = Math.max(...hourlySales, 1);

  // Category distribution
  const categoryRevenue = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of filtered) {
      for (const item of r.items) {
        // Find product category
        const product = products.find((p) => p.name === item.namn);
        const cat = product ? (categories.find((c) => c.id === product.categoryId)?.name || "Övrigt") : "Övrigt";
        map.set(cat, (map.get(cat) || 0) + item.prisTotal);
      }
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [filtered, products, categories]);

  // Payment methods
  const paymentMethods = useMemo(() => {
    const map = new Map<string, { count: number; revenue: number }>();
    for (const r of filtered) {
      const existing = map.get(r.betalning) || { count: 0, revenue: 0 };
      map.set(r.betalning, { count: existing.count + 1, revenue: existing.revenue + r.total });
    }
    return Array.from(map.entries()).sort((a, b) => b[1].revenue - a[1].revenue);
  }, [filtered]);

  // Top products with ABC analysis
  const productPerformance = useMemo(() => {
    const map = new Map<string, { qty: number; revenue: number }>();
    for (const r of filtered) {
      for (const item of r.items) {
        const existing = map.get(item.namn) || { qty: 0, revenue: 0 };
        map.set(item.namn, { qty: existing.qty + item.antal, revenue: existing.revenue + item.prisTotal });
      }
    }
    const sorted = Array.from(map.entries()).sort((a, b) => b[1].revenue - a[1].revenue);
    const totalRev = sorted.reduce((s, [_, d]) => s + d.revenue, 0);
    let cumulative = 0;
    return sorted.map(([name, data]) => {
      cumulative += data.revenue;
      const pct = totalRev > 0 ? (cumulative / totalRev) * 100 : 0;
      const abc = pct <= 80 ? "A" : pct <= 95 ? "B" : "C";
      return { name, ...data, abc, pctOfTotal: totalRev > 0 ? Math.round((data.revenue / totalRev) * 100) : 0 };
    });
  }, [filtered]);

  // VAT report
  const vatReport = useMemo(() => {
    const rates: Record<string, number> = { "25%": 0, "12%": 0, "6%": 0 };
    for (const r of filtered) {
      for (const item of r.items) {
        const product = products.find((p) => p.name === item.namn);
        const rate = product?.vatRate || "25%";
        rates[rate] = (rates[rate] || 0) + item.prisTotal;
      }
    }
    return Object.entries(rates).map(([rate, gross]) => ({
      rate,
      gross,
      vat: Math.round(gross - gross / (1 + parseInt(rate) / 100)),
      net: Math.round(gross / (1 + parseInt(rate) / 100)),
    }));
  }, [filtered, products]);

  // Return report
  const returnReport = useMemo(() => {
    const returns = filtered.filter((r) => r.status === "returnerad");
    return {
      count: returns.length,
      total: returns.reduce((s, r) => s + r.total, 0),
    };
  }, [filtered]);

  // Export CSV
  const handleExportCSV = () => {
    const header = "Datum,Tid,KvittoNr,Total,Betalning,Status";
    const rows = filtered.map((r) => `${r.datum},${r.tid},${r.kvittoNummer},${r.total},${r.betalning},${r.status}`);
    const csv = [header, ...rows].join("\n");
    Alert.alert("CSV Export", `${filtered.length} rader redo. I produktion sparas detta som fil.`);
  };

  const ABC_COLORS: Record<string, string> = { A: "#22c55e", B: "#f59e0b", C: "#ef4444" };
  const CAT_COLORS = ["#2d6b5a", "#d4a574", "#5b8fa8", "#c47a3a", "#8b5cf6", "#ec4899"];
  const PAY_ICONS: Record<string, string> = { swish: "phone-portrait-outline", kort: "card-outline", kontant: "cash-outline", qr: "qr-code-outline" };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>📊 Rapporter & statistik</Text>
          <Text style={styles.subtitle}>{filtered.length} kvitton under vald period</Text>
        </View>
        <TouchableOpacity style={styles.exportBtn} onPress={handleExportCSV}>
          <Ionicons name="download-outline" size={18} color="#fff" />
          <Text style={styles.exportBtnText}>Exportera CSV</Text>
        </TouchableOpacity>
      </View>

      {/* Period selector */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.periodScroll}>
        <View style={styles.periodRow}>
          {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
            <TouchableOpacity
              key={p}
              style={[styles.periodBtn, period === p && styles.periodBtnActive]}
              onPress={() => setPeriod(p)}
            >
              <Text style={[styles.periodBtnText, period === p && styles.periodBtnTextActive]}>
                {PERIOD_LABELS[p]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Tab selector */}
      <View style={styles.tabRow}>
        {([["overview", "Diagram"], ["products", "Produkter"], ["detailed", "Detaljrapporter"]] as [Tab, string][]).map(([t, label]) => (
          <TouchableOpacity
            key={t}
            style={[styles.tabBtn, tab === t && styles.tabBtnActive]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabBtnText, tab === t && styles.tabBtnTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Summary cards */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { backgroundColor: "#e8f5ee" }]}>
          <Ionicons name="cash-outline" size={22} color="#2d6b5a" />
          <Text style={styles.summaryLabel}>Försäljning</Text>
          <Text style={[styles.summaryValue, { color: "#2d6b5a" }]}>{totalRevenue.toLocaleString()} kr</Text>
          <Text style={[styles.pctChange, { color: pctChange(totalRevenue, prevRevenue) >= 0 ? "#22c55e" : "#ef4444" }]}>
            {pctChange(totalRevenue, prevRevenue) >= 0 ? "↑" : "↓"} {Math.abs(pctChange(totalRevenue, prevRevenue))}%
          </Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: "#fdf4e8" }]}>
          <Ionicons name="receipt-outline" size={22} color="#c47a3a" />
          <Text style={styles.summaryLabel}>Ordrar</Text>
          <Text style={[styles.summaryValue, { color: "#c47a3a" }]}>{filtered.length}</Text>
          <Text style={[styles.pctChange, { color: pctChange(filtered.length, prevFiltered.length) >= 0 ? "#22c55e" : "#ef4444" }]}>
            {pctChange(filtered.length, prevFiltered.length) >= 0 ? "↑" : "↓"} {Math.abs(pctChange(filtered.length, prevFiltered.length))}%
          </Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: "#e8f0fa" }]}>
          <Ionicons name="trending-up-outline" size={22} color="#5b8fa8" />
          <Text style={styles.summaryLabel}>Snittorder</Text>
          <Text style={[styles.summaryValue, { color: "#5b8fa8" }]}>{avgOrder} kr</Text>
          <Text style={[styles.pctChange, { color: pctChange(avgOrder, prevAvg) >= 0 ? "#22c55e" : "#ef4444" }]}>
            {pctChange(avgOrder, prevAvg) >= 0 ? "↑" : "↓"} {Math.abs(pctChange(avgOrder, prevAvg))}%
          </Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: "#f3e8f5" }]}>
          <Ionicons name="cube-outline" size={22} color="#8b5cf6" />
          <Text style={styles.summaryLabel}>Sålda artiklar</Text>
          <Text style={[styles.summaryValue, { color: "#8b5cf6" }]}>{totalItems}</Text>
        </View>
      </View>

      {tab === "overview" && (
        <>
          {/* Daily revenue chart */}
          <Text style={styles.sectionTitle}>📈 Daglig försäljning</Text>
          <View style={styles.chartCard}>
            {dailyRevenue.length === 0 ? (
              <Text style={styles.emptyText}>Ingen data för vald period</Text>
            ) : (
              <View style={styles.barChart}>
                {dailyRevenue.map(([date, data]) => {
                  const height = Math.max((data.revenue / maxDailyRevenue) * 120, 4);
                  const isToday = date === new Date().toISOString().split("T")[0];
                  return (
                    <View key={date} style={styles.barCol}>
                      <Text style={styles.barValue}>{data.revenue}</Text>
                      <View style={[styles.bar, { height, backgroundColor: isToday ? "#22c55e" : "#2d6b5a" }]} />
                      <Text style={styles.barLabel}>{date.slice(5)}</Text>
                      <Text style={styles.barOrders}>{data.orders} st</Text>
                    </View>
                  );
                })}
              </View>
            )}
          </View>

          {/* Hourly heatmap */}
          <Text style={styles.sectionTitle}>🕐 Timvis försäljning</Text>
          <View style={styles.chartCard}>
            <View style={styles.heatmapGrid}>
              {hourlySales.map((val, hour) => {
                const intensity = val / maxHourly;
                const bg = intensity === 0 ? "#f5f5f5" : `rgba(45, 107, 90, ${Math.max(intensity, 0.15)})`;
                return (
                  <View key={hour} style={[styles.heatCell, { backgroundColor: bg }]}>
                    <Text style={[styles.heatHour, { color: intensity > 0.5 ? "#fff" : "#666" }]}>{hour}</Text>
                    {val > 0 && <Text style={[styles.heatVal, { color: intensity > 0.5 ? "#fff" : "#333" }]}>{val}</Text>}
                  </View>
                );
              })}
            </View>
          </View>

          {/* Category distribution */}
          <Text style={styles.sectionTitle}>📂 Kategorifördelning</Text>
          <View style={styles.chartCard}>
            {categoryRevenue.length === 0 ? (
              <Text style={styles.emptyText}>Ingen data</Text>
            ) : (
              categoryRevenue.map(([cat, rev], i) => {
                const pct = totalRevenue > 0 ? (rev / totalRevenue) * 100 : 0;
                return (
                  <View key={cat} style={styles.catRow}>
                    <View style={styles.catInfo}>
                      <View style={[styles.catDot, { backgroundColor: CAT_COLORS[i % CAT_COLORS.length] }]} />
                      <Text style={styles.catName}>{cat}</Text>
                    </View>
                    <View style={styles.catBarBg}>
                      <View style={[styles.catBar, { width: `${pct}%`, backgroundColor: CAT_COLORS[i % CAT_COLORS.length] }]} />
                    </View>
                    <Text style={styles.catValue}>{rev} kr ({Math.round(pct)}%)</Text>
                  </View>
                );
              })
            )}
          </View>

          {/* Payment methods */}
          <Text style={styles.sectionTitle}>💳 Betalmetoder</Text>
          <View style={styles.chartCard}>
            <View style={styles.payGrid}>
              {paymentMethods.map(([method, data]) => (
                <View key={method} style={styles.payCard}>
                  <Ionicons name={(PAY_ICONS[method] || "help-outline") as any} size={24} color="#2d6b5a" />
                  <Text style={styles.payMethod}>{method}</Text>
                  <Text style={styles.payRevenue}>{data.revenue} kr</Text>
                  <Text style={styles.payCount}>{data.count} ordrar</Text>
                  <Text style={styles.payPct}>
                    {filtered.length > 0 ? Math.round((data.count / filtered.length) * 100) : 0}%
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </>
      )}

      {tab === "products" && (
        <>
          {/* ABC Analysis */}
          <Text style={styles.sectionTitle}>🏆 Produktprestation (ABC-analys)</Text>
          <View style={styles.abcLegend}>
            <View style={styles.abcItem}><View style={[styles.abcDot, { backgroundColor: "#22c55e" }]} /><Text style={styles.abcText}>A = Topp 80% av omsättning</Text></View>
            <View style={styles.abcItem}><View style={[styles.abcDot, { backgroundColor: "#f59e0b" }]} /><Text style={styles.abcText}>B = 80-95%</Text></View>
            <View style={styles.abcItem}><View style={[styles.abcDot, { backgroundColor: "#ef4444" }]} /><Text style={styles.abcText}>C = Botten 5%</Text></View>
          </View>
          <View style={styles.chartCard}>
            {productPerformance.length === 0 ? (
              <Text style={styles.emptyText}>Ingen data</Text>
            ) : (
              <>
                <View style={styles.tableHeader}>
                  <Text style={[styles.tableHeaderText, { flex: 0.3 }]}>#</Text>
                  <Text style={[styles.tableHeaderText, { flex: 2 }]}>Produkt</Text>
                  <Text style={[styles.tableHeaderText, { flex: 0.7 }]}>Antal</Text>
                  <Text style={[styles.tableHeaderText, { flex: 1 }]}>Omsättning</Text>
                  <Text style={[styles.tableHeaderText, { flex: 0.5 }]}>%</Text>
                  <Text style={[styles.tableHeaderText, { flex: 0.4 }]}>ABC</Text>
                </View>
                {productPerformance.map((p, i) => (
                  <View key={p.name} style={[styles.tableRow, i % 2 === 0 && { backgroundColor: "#fafafa" }]}>
                    <Text style={[styles.tableCell, { flex: 0.3, color: "#8a9b93" }]}>{i + 1}</Text>
                    <Text style={[styles.tableCell, { flex: 2, fontWeight: "500" }]} numberOfLines={1}>{p.name}</Text>
                    <Text style={[styles.tableCell, { flex: 0.7 }]}>{p.qty} st</Text>
                    <Text style={[styles.tableCell, { flex: 1, fontWeight: "600" }]}>{p.revenue} kr</Text>
                    <Text style={[styles.tableCell, { flex: 0.5 }]}>{p.pctOfTotal}%</Text>
                    <View style={{ flex: 0.4, alignItems: "center" }}>
                      <View style={[styles.abcBadge, { backgroundColor: ABC_COLORS[p.abc] }]}>
                        <Text style={styles.abcBadgeText}>{p.abc}</Text>
                      </View>
                    </View>
                  </View>
                ))}
              </>
            )}
          </View>
        </>
      )}

      {tab === "detailed" && (
        <>
          {/* VAT Report */}
          <Text style={styles.sectionTitle}>🧾 Momsrapport</Text>
          <View style={styles.chartCard}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, { flex: 1 }]}>Momssats</Text>
              <Text style={[styles.tableHeaderText, { flex: 1 }]}>Brutto</Text>
              <Text style={[styles.tableHeaderText, { flex: 1 }]}>Moms</Text>
              <Text style={[styles.tableHeaderText, { flex: 1 }]}>Netto</Text>
            </View>
            {vatReport.map((v) => (
              <View key={v.rate} style={styles.tableRow}>
                <Text style={[styles.tableCell, { flex: 1, fontWeight: "600" }]}>{v.rate}</Text>
                <Text style={[styles.tableCell, { flex: 1 }]}>{v.gross} kr</Text>
                <Text style={[styles.tableCell, { flex: 1, color: "#c47a3a" }]}>{v.vat} kr</Text>
                <Text style={[styles.tableCell, { flex: 1 }]}>{v.net} kr</Text>
              </View>
            ))}
            <View style={[styles.tableRow, { backgroundColor: "#f0f7f4" }]}>
              <Text style={[styles.tableCell, { flex: 1, fontWeight: "700" }]}>Totalt</Text>
              <Text style={[styles.tableCell, { flex: 1, fontWeight: "700" }]}>{vatReport.reduce((s, v) => s + v.gross, 0)} kr</Text>
              <Text style={[styles.tableCell, { flex: 1, fontWeight: "700", color: "#c47a3a" }]}>{vatReport.reduce((s, v) => s + v.vat, 0)} kr</Text>
              <Text style={[styles.tableCell, { flex: 1, fontWeight: "700" }]}>{vatReport.reduce((s, v) => s + v.net, 0)} kr</Text>
            </View>
          </View>

          {/* Return Report */}
          <Text style={styles.sectionTitle}>↩️ Returrapport</Text>
          <View style={styles.chartCard}>
            <View style={styles.returnRow}>
              <View style={styles.returnStat}>
                <Text style={styles.returnLabel}>Antal returer</Text>
                <Text style={styles.returnValue}>{returnReport.count}</Text>
              </View>
              <View style={styles.returnStat}>
                <Text style={styles.returnLabel}>Totalt returnerat</Text>
                <Text style={[styles.returnValue, { color: "#ef4444" }]}>{returnReport.total} kr</Text>
              </View>
              <View style={styles.returnStat}>
                <Text style={styles.returnLabel}>Returandel</Text>
                <Text style={styles.returnValue}>
                  {filtered.length > 0 ? Math.round((returnReport.count / filtered.length) * 100) : 0}%
                </Text>
              </View>
            </View>
          </View>

          {/* Inventory Report Link */}
          <Text style={styles.sectionTitle}>📦 Lagerrapport</Text>
          <View style={styles.chartCard}>
            <View style={styles.infoRow}>
              <Ionicons name="information-circle-outline" size={20} color="#5b8fa8" />
              <Text style={styles.infoText}>Se lagerfliken för lagersaldo, svinn och justeringshistorik</Text>
            </View>
          </View>
        </>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8faf9" },
  content: { padding: 20, gap: 14 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  title: { fontSize: 26, fontWeight: "700", color: "#2c3e35" },
  subtitle: { fontSize: 13, color: "#6b7c74", marginTop: 2 },
  exportBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#2d6b5a", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  exportBtnText: { color: "#fff", fontSize: 13, fontWeight: "600" },

  periodScroll: { marginVertical: 4 },
  periodRow: { flexDirection: "row", gap: 8 },
  periodBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: "#fff", borderWidth: 1, borderColor: "#e0e0e0" },
  periodBtnActive: { backgroundColor: "#2d6b5a", borderColor: "#2d6b5a" },
  periodBtnText: { fontSize: 13, color: "#666" },
  periodBtnTextActive: { color: "#fff", fontWeight: "600" },

  tabRow: { flexDirection: "row", gap: 4, backgroundColor: "#e8ebe9", borderRadius: 10, padding: 3 },
  tabBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: "center" },
  tabBtnActive: { backgroundColor: "#fff" },
  tabBtnText: { fontSize: 13, color: "#6b7c74" },
  tabBtnTextActive: { color: "#2c3e35", fontWeight: "600" },

  summaryRow: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  summaryCard: { minWidth: "22%", flex: 1, padding: 14, borderRadius: 12, gap: 4 },
  summaryLabel: { fontSize: 11, color: "#6b7c74" },
  summaryValue: { fontSize: 22, fontWeight: "700" },
  pctChange: { fontSize: 12, fontWeight: "600" },

  sectionTitle: { fontSize: 17, fontWeight: "600", color: "#2c3e35", marginTop: 8 },
  chartCard: { backgroundColor: "#fff", borderRadius: 12, padding: 14, borderWidth: 1, borderColor: "#f0f0f0" },
  emptyText: { textAlign: "center", color: "#8a9b93", fontStyle: "italic", padding: 20 },

  barChart: { flexDirection: "row", alignItems: "flex-end", gap: 6, height: 170, paddingTop: 20 },
  barCol: { flex: 1, alignItems: "center", gap: 2 },
  bar: { width: "80%", borderRadius: 4, minWidth: 12 },
  barValue: { fontSize: 9, color: "#6b7c74" },
  barLabel: { fontSize: 9, color: "#8a9b93" },
  barOrders: { fontSize: 8, color: "#aaa" },

  heatmapGrid: { flexDirection: "row", flexWrap: "wrap", gap: 3 },
  heatCell: { width: "11.5%", aspectRatio: 1, borderRadius: 6, justifyContent: "center", alignItems: "center" },
  heatHour: { fontSize: 10, fontWeight: "600" },
  heatVal: { fontSize: 8 },

  catRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#f5f5f5" },
  catInfo: { flexDirection: "row", alignItems: "center", gap: 6, width: 100 },
  catDot: { width: 10, height: 10, borderRadius: 5 },
  catName: { fontSize: 13, color: "#2c3e35" },
  catBarBg: { flex: 1, height: 8, backgroundColor: "#f0f0f0", borderRadius: 4 },
  catBar: { height: 8, borderRadius: 4 },
  catValue: { fontSize: 12, color: "#6b7c74", width: 110, textAlign: "right" },

  payGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  payCard: { flex: 1, minWidth: "45%", backgroundColor: "#f8faf9", borderRadius: 10, padding: 14, alignItems: "center", gap: 4 },
  payMethod: { fontSize: 14, fontWeight: "600", color: "#2c3e35", textTransform: "capitalize" },
  payRevenue: { fontSize: 18, fontWeight: "700", color: "#2d6b5a" },
  payCount: { fontSize: 12, color: "#6b7c74" },
  payPct: { fontSize: 13, fontWeight: "600", color: "#5b8fa8" },

  abcLegend: { flexDirection: "row", gap: 16, flexWrap: "wrap" },
  abcItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  abcDot: { width: 10, height: 10, borderRadius: 5 },
  abcText: { fontSize: 12, color: "#6b7c74" },

  tableHeader: { flexDirection: "row", paddingVertical: 8, borderBottomWidth: 2, borderBottomColor: "#e0e0e0" },
  tableHeaderText: { fontSize: 12, fontWeight: "700", color: "#6b7c74", textTransform: "uppercase" },
  tableRow: { flexDirection: "row", alignItems: "center", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#f5f5f5" },
  tableCell: { fontSize: 13, color: "#2c3e35" },

  abcBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  abcBadgeText: { fontSize: 11, fontWeight: "700", color: "#fff" },

  returnRow: { flexDirection: "row", gap: 14 },
  returnStat: { flex: 1, alignItems: "center", gap: 4, padding: 12 },
  returnLabel: { fontSize: 12, color: "#6b7c74" },
  returnValue: { fontSize: 22, fontWeight: "700", color: "#2c3e35" },

  infoRow: { flexDirection: "row", alignItems: "center", gap: 8, padding: 8 },
  infoText: { fontSize: 13, color: "#5b8fa8", flex: 1 },
});
