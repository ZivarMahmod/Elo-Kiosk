/**
 * Admin Dashboard — full kiosk-admin standard
 * Stats med jämförelse, 7-dagars chart, senaste ordrar, kategori/betalning,
 * toppprodukter, lagervarningar, snabbåtgärder, kioskstatus
 */

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Switch, Alert, Platform, useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useProducts } from "@/hooks/useProducts";
import { useCategories } from "@/hooks/useCategories";
import { useReceipts } from "@/hooks/useReceipts";
import { useSettings } from "@/hooks/useSettings";
import { useInventory } from "@/hooks/useInventory";
import { getWishCount } from "@/core/database/wishes";
import { getAllOffers } from "@/core/database/offers";

// ═══ Helpers ═══
function fmt(n: number) { return n.toLocaleString("sv-SE", { maximumFractionDigits: 0 }); }
function fmtKr(n: number) { return `${fmt(n)} kr`; }
function dateStr(d: Date) { return d.toISOString().split("T")[0]; }
function daysAgo(n: number) { const d = new Date(); d.setDate(d.getDate() - n); return dateStr(d); }
function pctChange(curr: number, prev: number) {
  if (prev === 0) return curr > 0 ? 999 : 0;
  return ((curr - prev) / prev) * 100;
}

// ═══ Accent colors ═══
const ACCENTS = {
  emerald: { bg: "#e8f5ee", icon: "#2d6b5a", text: "#2d6b5a" },
  sky: { bg: "#e8f0fa", icon: "#5b8fa8", text: "#5b8fa8" },
  violet: { bg: "#f0e8fa", icon: "#9b59b6", text: "#9b59b6" },
  orange: { bg: "#fdf4e8", icon: "#c47a3a", text: "#c47a3a" },
  rose: { bg: "#fde8e8", icon: "#e74c3c", text: "#e74c3c" },
  amber: { bg: "#fdf8e8", icon: "#d4a017", text: "#d4a017" },
};
const CAT_COLORS = ["#2d6b5a", "#5b8fa8", "#9b59b6", "#c47a3a", "#e74c3c", "#d4a017"];
const PAY_COLORS: Record<string, string> = { swish: "#2d6b5a", kort: "#5b8fa8", card: "#5b8fa8", kontant: "#d4a017", cash: "#d4a017", qr: "#9b59b6" };

function getPayColor(method: string) {
  const lower = method.toLowerCase();
  for (const [key, color] of Object.entries(PAY_COLORS)) { if (lower.includes(key)) return color; }
  return "#888";
}
function getPayIcon(method: string): string {
  const lower = method.toLowerCase();
  if (lower.includes("swish")) return "phone-portrait-outline";
  if (lower.includes("kort") || lower.includes("card")) return "card-outline";
  if (lower.includes("kontant") || lower.includes("cash")) return "cash-outline";
  if (lower.includes("qr")) return "qr-code-outline";
  return "card-outline";
}

export default function AdminDashboard() {
  const { products, count: productCount, loading: prodLoading } = useProducts();
  const { categories, count: categoryCount } = useCategories();
  const { receipts, count: receiptCount, todayRevenue, todayCount, refresh: refreshReceipts } = useReceipts();
  const { settings, save } = useSettings();
  const { warehouses } = useInventory();
  const { width } = useWindowDimensions();
  const compact = width < 700;
  const [wishCount, setWishCount] = useState(0);
  const [offerCount, setOfferCount] = useState(0);

  useEffect(() => {
    getWishCount().then(setWishCount).catch(() => {});
    getAllOffers().then((o) => setOfferCount(o.length)).catch(() => {});
  }, []);

  // ═══ Computed dashboard data ═══
  const computed = useMemo(() => {
    const today = dateStr(new Date());
    const yesterday = daysAgo(1);

    const todayReceipts = receipts.filter((r) => r.datum === today);
    const yesterdayReceipts = receipts.filter((r) => r.datum === yesterday);

    const tRevenue = todayReceipts.reduce((s, r) => s + (r.total || 0), 0);
    const yRevenue = yesterdayReceipts.reduce((s, r) => s + (r.total || 0), 0);
    const tOrders = todayReceipts.length;
    const yOrders = yesterdayReceipts.length;
    const avgOrder = tOrders > 0 ? tRevenue / tOrders : 0;
    const yAvgOrder = yOrders > 0 ? yRevenue / yOrders : 0;

    const lowStock = products.filter((p) => (p.quantity || 0) <= 5 && (p.quantity || 0) >= 0);
    const outOfStock = products.filter((p) => (p.quantity || 0) === 0);

    // 7-day chart
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = daysAgo(6 - i);
      const dayReceipts = receipts.filter((r) => r.datum === d);
      const revenue = dayReceipts.reduce((s, r) => s + (r.total || 0), 0);
      const dayDate = new Date(d);
      const dayLabel = dayDate.toLocaleDateString("sv-SE", { weekday: "short" });
      return { date: d, dayLabel, revenue, orders: dayReceipts.length };
    });
    const maxRevenue = Math.max(...last7Days.map((d) => d.revenue), 1);

    // Category distribution (today)
    const categoryMap = new Map<string, { name: string; revenue: number; count: number }>();
    for (const r of todayReceipts) {
      for (const item of r.items || []) {
        const product = products.find((p) => p.name === item.namn);
        const catId = product?.categoryId || "okand";
        const cat = categories.find((c) => c.id === catId);
        const catName = cat?.name || "Okategoriserad";
        const existing = categoryMap.get(catId);
        if (existing) { existing.revenue += item.prisTotal || 0; existing.count += item.antal || 0; }
        else { categoryMap.set(catId, { name: catName, revenue: item.prisTotal || 0, count: item.antal || 0 }); }
      }
    }
    const categoryDist = Array.from(categoryMap.values()).sort((a, b) => b.revenue - a.revenue);
    const maxCatRevenue = Math.max(...categoryDist.map((c) => c.revenue), 1);

    // Payment methods (today)
    const payMap: Record<string, { count: number; total: number }> = {};
    for (const r of todayReceipts) {
      const method = r.betalning || "Okänd";
      if (!payMap[method]) payMap[method] = { count: 0, total: 0 };
      payMap[method].count++;
      payMap[method].total += r.total || 0;
    }
    const paymentMethods = Object.entries(payMap).map(([method, data]) => ({ method, ...data })).sort((a, b) => b.total - a.total);
    const totalPayments = paymentMethods.reduce((s, p) => s + p.total, 0);

    // Top products
    const productSalesMap = new Map<string, { name: string; count: number; revenue: number }>();
    for (const r of receipts) {
      for (const item of r.items || []) {
        const existing = productSalesMap.get(item.namn);
        if (existing) { existing.count += item.antal || 0; existing.revenue += item.prisTotal || 0; }
        else { productSalesMap.set(item.namn, { name: item.namn, count: item.antal || 0, revenue: item.prisTotal || 0 }); }
      }
    }
    const topProducts = Array.from(productSalesMap.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

    // Recent receipts
    const recentReceipts = [...receipts]
      .sort((a, b) => `${b.datum} ${b.tid}`.localeCompare(`${a.datum} ${a.tid}`))
      .slice(0, 10);

    return {
      tRevenue, tOrders, avgOrder,
      revenueChange: pctChange(tRevenue, yRevenue),
      ordersChange: pctChange(tOrders, yOrders),
      avgChange: pctChange(avgOrder, yAvgOrder),
      lowStock, outOfStock,
      last7Days, maxRevenue,
      categoryDist, maxCatRevenue,
      paymentMethods, totalPayments,
      topProducts, recentReceipts,
    };
  }, [receipts, products, categories]);

  // ═══ Actions ═══
  const handlePauseToggle = async (value: boolean) => {
    await save({ ordersPaused: value });
    Alert.alert(value ? "Pausat" : "Aktivt", value ? "Kiosken tar inte emot ordrar." : "Kiosken tar emot ordrar igen.");
  };

  const handleExportCSV = () => {
    const today = dateStr(new Date());
    const todayR = receipts.filter((r) => r.datum === today);
    if (todayR.length === 0) { Alert.alert("Ingen data", "Inga kvitton idag."); return; }
    const header = "Kvittonummer,Datum,Tid,Total,Betalning,Status";
    const rows = todayR.map((r) => `${r.kvittoNummer},${r.datum},${r.tid},${r.total},${r.betalning || ""},${r.status}`);
    const csv = [header, ...rows].join("\n");
    if (Platform.OS === "web") {
      try {
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a"); a.href = url; a.download = `rapport-${today}.csv`; a.click();
        URL.revokeObjectURL(url);
      } catch {}
    }
    Alert.alert("Exporterad", `${todayR.length} kvitton exporterade.`);
  };

  const { tRevenue, tOrders, avgOrder, revenueChange, ordersChange, avgChange,
    lowStock, last7Days, maxRevenue, categoryDist, maxCatRevenue,
    paymentMethods, totalPayments, topProducts, recentReceipts } = computed;

  return (
    <ScrollView style={st.container} contentContainerStyle={st.content}>
      {/* Header */}
      <View style={st.header}>
        <View style={{ flex: 1 }}>
          <Text style={st.title}>Dashboard</Text>
          <Text style={st.subtitle}>
            {new Date().toLocaleDateString("sv-SE", { weekday: "long", year: "numeric", month: "long", day: "numeric" })} — Översikt
          </Text>
        </View>
        <View style={st.headerRight}>
          <View style={st.liveBadge}>
            <View style={st.liveDot} />
            <Text style={st.liveText}>Live</Text>
          </View>
          <TouchableOpacity style={st.refreshBtn} onPress={refreshReceipts}>
            <Ionicons name="refresh-outline" size={18} color="#6b7c74" />
          </TouchableOpacity>
        </View>
      </View>

      {/* ═══ 1. STATS ROW ═══ */}
      <View style={[st.statsRow, compact && { flexWrap: "wrap" }]}>
        <StatCard label="Dagens försäljning" value={fmtKr(tRevenue)} icon="trending-up-outline" accent="emerald" change={revenueChange} />
        <StatCard label="Ordrar idag" value={String(tOrders)} icon="cart-outline" accent="sky" change={ordersChange} />
        <StatCard label="Snittordervärde" value={fmtKr(avgOrder)} icon="bar-chart-outline" accent="violet" change={avgChange} />
        <StatCard label="Produkter i lager" value={String(productCount)} icon="cube-outline" accent="orange" />
        <StatCard label="Lagervarningar" value={String(lowStock.length)} icon="warning-outline" accent={lowStock.length > 0 ? "rose" : "emerald"} />
      </View>

      {/* ═══ 2. SALES CHART + RECENT ORDERS ═══ */}
      <View style={st.twoColRow}>
        {/* 7-day chart */}
        <View style={[st.card, { flex: 2 }]}>
          <View style={st.cardHeader}>
            <Text style={st.cardTitle}>Försäljning senaste 7 dagar</Text>
            <Text style={st.cardMeta}>Totalt: {fmtKr(last7Days.reduce((s, d) => s + d.revenue, 0))}</Text>
          </View>
          <View style={st.chartContainer}>
            {last7Days.map((day, i) => {
              const heightPct = maxRevenue > 0 ? (day.revenue / maxRevenue) * 100 : 0;
              const isToday = i === 6;
              return (
                <View key={day.date} style={st.chartBar}>
                  <View style={st.barWrapper}>
                    <View style={[st.bar, {
                      height: `${Math.max(heightPct, 3)}%`,
                      backgroundColor: isToday ? "#2d6b5a" : "#5b8fa870",
                    }]} />
                  </View>
                  <Text style={[st.barLabel, isToday && { color: "#2d6b5a", fontWeight: "700" }]}>{day.dayLabel}</Text>
                  <Text style={st.barSub}>{day.orders} st</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Recent orders */}
        <View style={[st.card, { flex: 1 }]}>
          <View style={st.cardHeader}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Ionicons name="pulse-outline" size={16} color="#2d6b5a" />
              <Text style={st.cardTitle}>Senaste ordrar</Text>
            </View>
            <View style={st.badge}><Text style={st.badgeText}>{recentReceipts.length}</Text></View>
          </View>
          <ScrollView style={{ maxHeight: 300 }}>
            {recentReceipts.length === 0 ? (
              <Text style={st.emptyText}>Inga kvitton ännu.</Text>
            ) : recentReceipts.map((r) => (
              <View key={r.id || r.kvittoNummer} style={st.orderRow}>
                <View style={st.orderIcon}>
                  <Ionicons name={getPayIcon(r.betalning || "") as any} size={14} color="#6b7c74" />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Text style={st.orderNum}>{r.kvittoNummer}</Text>
                    <View style={[st.statusBadge, r.status === "registrerad" && st.statusReg]}>
                      <Text style={[st.statusText, r.status === "registrerad" && { color: "#fff" }]}>
                        {r.status === "registrerad" ? "Reg" : "Ej reg"}
                      </Text>
                    </View>
                  </View>
                  <Text style={st.orderMeta}>{r.tid} · {(r.items || []).length} varor · {r.betalning || "Okänd"}</Text>
                </View>
                <Text style={st.orderTotal}>{fmtKr(r.total || 0)}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      </View>

      {/* ═══ 3. CATEGORY + PAYMENT ═══ */}
      <View style={st.twoColRow}>
        {/* Category distribution */}
        <View style={[st.card, { flex: 1 }]}>
          <Text style={st.cardTitle}>Försäljning per kategori (idag)</Text>
          {categoryDist.length === 0 ? (
            <Text style={st.emptyText}>Ingen försäljning idag ännu.</Text>
          ) : categoryDist.map((cat, i) => {
            const widthPct = maxCatRevenue > 0 ? (cat.revenue / maxCatRevenue) * 100 : 0;
            return (
              <View key={cat.name} style={{ marginTop: 10 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                  <Text style={st.catName}>{cat.name}</Text>
                  <Text style={st.catMeta}>{fmtKr(cat.revenue)} ({cat.count} st)</Text>
                </View>
                <View style={st.progressTrack}>
                  <View style={[st.progressFill, { width: `${Math.max(widthPct, 2)}%`, backgroundColor: CAT_COLORS[i % CAT_COLORS.length] }]} />
                </View>
              </View>
            );
          })}
        </View>

        {/* Payment methods */}
        <View style={[st.card, { flex: 1 }]}>
          <Text style={st.cardTitle}>Betalmetoder (idag)</Text>
          {paymentMethods.length === 0 ? (
            <Text style={st.emptyText}>Ingen data idag ännu.</Text>
          ) : (
            <>
              {/* Segmented bar */}
              <View style={st.segmentedBar}>
                {paymentMethods.map((pm) => {
                  const pct = totalPayments > 0 ? (pm.total / totalPayments) * 100 : 0;
                  return <View key={pm.method} style={[st.segment, { width: `${Math.max(pct, 3)}%`, backgroundColor: getPayColor(pm.method) }]} />;
                })}
              </View>
              {/* Legend */}
              <View style={st.payGrid}>
                {paymentMethods.map((pm) => {
                  const pct = totalPayments > 0 ? (pm.total / totalPayments) * 100 : 0;
                  return (
                    <View key={pm.method} style={st.payItem}>
                      <View style={[st.payIconBox, { backgroundColor: getPayColor(pm.method) + "20" }]}>
                        <Ionicons name={getPayIcon(pm.method) as any} size={16} color={getPayColor(pm.method)} />
                      </View>
                      <View>
                        <Text style={st.payMethod}>{pm.method}</Text>
                        <Text style={st.payMeta}>{fmtKr(pm.total)} · {pct.toFixed(0)}% · {pm.count} st</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </>
          )}
        </View>
      </View>

      {/* ═══ 4. TOP PRODUCTS + LOW STOCK ═══ */}
      <View style={st.twoColRow}>
        {/* Top products */}
        <View style={[st.card, { flex: 1 }]}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 12 }}>
            <Ionicons name="star-outline" size={16} color="#d4a017" />
            <Text style={st.cardTitle}>Toppsäljande produkter</Text>
          </View>
          {topProducts.length === 0 ? (
            <Text style={st.emptyText}>Inga försäljningsdata.</Text>
          ) : topProducts.map((p, i) => {
            const medalColors = ["#d4a017", "#9ca3af", "#cd7f32", "#6b7c74", "#6b7c74"];
            return (
              <View key={p.name} style={st.topRow}>
                <View style={[st.topRank, { backgroundColor: medalColors[i] + "25" }]}>
                  <Text style={[st.topRankText, { color: medalColors[i] }]}>#{i + 1}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={st.topName}>{p.name}</Text>
                  <Text style={st.topSub}>{p.count} sålda</Text>
                </View>
                <Text style={st.topRevenue}>{fmtKr(p.revenue)}</Text>
              </View>
            );
          })}
        </View>

        {/* Low stock warnings */}
        <View style={[st.card, { flex: 1 }]}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Ionicons name="warning-outline" size={16} color="#d4a017" />
              <Text style={st.cardTitle}>Lagervarningar</Text>
            </View>
            <View style={[st.badge, lowStock.length > 0 && { backgroundColor: "#fde8e8" }]}>
              <Text style={[st.badgeText, lowStock.length > 0 && { color: "#e74c3c" }]}>{lowStock.length} produkter</Text>
            </View>
          </View>
          {lowStock.length === 0 ? (
            <View style={{ alignItems: "center", paddingVertical: 24 }}>
              <View style={[st.emptyIcon, { backgroundColor: "#e8f5ee" }]}>
                <Ionicons name="cube-outline" size={28} color="#2d6b5a" />
              </View>
              <Text style={st.emptyTitle}>Alla produkter har bra lagernivå</Text>
              <Text style={st.emptyText}>Ingen produkt under 5 i lager</Text>
            </View>
          ) : (
            <ScrollView style={{ maxHeight: 280 }}>
              {lowStock.sort((a, b) => (a.quantity || 0) - (b.quantity || 0)).map((p) => {
                const qty = p.quantity || 0;
                const color = qty === 0 ? "#e74c3c" : qty <= 2 ? "#c47a3a" : "#d4a017";
                return (
                  <View key={p.id} style={[st.stockRow, { borderColor: color + "30", backgroundColor: color + "08" }]}>
                    <View style={[st.stockDot, { backgroundColor: color }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={[st.stockName, { color }]}>{p.name}</Text>
                      <Text style={st.stockSku}>SKU: {p.sku}</Text>
                    </View>
                    <Text style={[st.stockQty, { color }]}>{qty === 0 ? "Slut" : `${qty} kvar`}</Text>
                  </View>
                );
              })}
            </ScrollView>
          )}
        </View>
      </View>

      {/* ═══ 5. QUICK ACTIONS + KIOSK STATUS ═══ */}
      <View style={st.twoColRow}>
        {/* Quick actions */}
        <View style={[st.card, { flex: 2 }]}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 12 }}>
            <Ionicons name="flash-outline" size={16} color="#d4a017" />
            <Text style={st.cardTitle}>Snabbåtgärder</Text>
          </View>
          <View style={st.actionsGrid}>
            {/* Pause orders */}
            <View style={st.actionCard}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
                <View style={[st.actionIcon, { backgroundColor: "#c47a3a15" }]}>
                  <Ionicons name="pause-circle-outline" size={22} color="#c47a3a" />
                </View>
                <View>
                  <Text style={st.actionLabel}>Pausa beställningar</Text>
                  <Text style={st.actionMeta}>{settings.ordersPaused ? "Pausad" : "Aktiv"}</Text>
                </View>
              </View>
              <Switch
                value={settings.ordersPaused}
                onValueChange={handlePauseToggle}
                trackColor={{ false: "#d1d5db", true: "#2d6b5a40" }}
                thumbColor={settings.ordersPaused ? "#2d6b5a" : "#f4f3f4"}
              />
            </View>

            {/* Emergency */}
            <TouchableOpacity style={st.actionCard} onPress={() => Alert.alert("Nödmeddelande", "Meddelande skickat till kiosken.")}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View style={[st.actionIcon, { backgroundColor: "#e74c3c15" }]}>
                  <Ionicons name="megaphone-outline" size={22} color="#e74c3c" />
                </View>
                <View>
                  <Text style={st.actionLabel}>Nödmeddelande</Text>
                  <Text style={st.actionMeta}>Skicka till kiosken</Text>
                </View>
              </View>
            </TouchableOpacity>

            {/* Sync */}
            <TouchableOpacity style={st.actionCard} onPress={() => { refreshReceipts(); Alert.alert("Synkar", "All data uppdateras."); }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View style={[st.actionIcon, { backgroundColor: "#5b8fa815" }]}>
                  <Ionicons name="sync-outline" size={22} color="#5b8fa8" />
                </View>
                <View>
                  <Text style={st.actionLabel}>Synka data</Text>
                  <Text style={st.actionMeta}>Uppdatera all data</Text>
                </View>
              </View>
            </TouchableOpacity>

            {/* Export */}
            <TouchableOpacity style={st.actionCard} onPress={handleExportCSV}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View style={[st.actionIcon, { backgroundColor: "#9b59b615" }]}>
                  <Ionicons name="download-outline" size={22} color="#9b59b6" />
                </View>
                <View>
                  <Text style={st.actionLabel}>Exportera rapport</Text>
                  <Text style={st.actionMeta}>Ladda ner dagens CSV</Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Kiosk status */}
        <View style={[st.card, { flex: 1 }]}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 12 }}>
            <Ionicons name="wifi-outline" size={16} color="#2d6b5a" />
            <Text style={st.cardTitle}>Kioskstatus</Text>
          </View>

          {/* Online indicator */}
          <View style={st.onlineBox}>
            <View style={st.onlineDot} />
            <View>
              <Text style={st.onlineText}>Online</Text>
              <Text style={st.onlineSub}>Kiosken är ansluten</Text>
            </View>
          </View>

          {/* Details */}
          <View style={st.statusDetails}>
            <StatusRow label="Senaste ping" value={new Date().toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit", second: "2-digit" })} />
            <StatusRow label="Butiksnamn" value={settings.storeName} />
            <StatusRow label="Lås på kiosken" value={settings.kioskLocked ? "Låst" : "Olåst"} highlight={settings.kioskLocked} />
            <StatusRow label="Erbjudanden" value={settings.offersEnabled ? "På" : "Av"} highlight={settings.offersEnabled} />
            <StatusRow label="Lagerplatser" value={`${(warehouses || []).length} st`} />
            <StatusRow label="Swish" value={settings.swishNumber || "Ej konfigurerat"} />
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

// ═══ Sub-components ═══

function StatCard({ label, value, icon, accent, change }: {
  label: string; value: string; icon: string; accent: keyof typeof ACCENTS; change?: number;
}) {
  const a = ACCENTS[accent];
  return (
    <View style={[st.statCard, { backgroundColor: a.bg }]}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
        <View style={{ flex: 1 }}>
          <Text style={st.statLabel}>{label}</Text>
          <Text style={[st.statValue, { color: a.text }]}>{value}</Text>
          {change !== undefined && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 3, marginTop: 4 }}>
              <Ionicons
                name={change > 0 ? "arrow-up-outline" : change < 0 ? "arrow-down-outline" : "remove-outline"}
                size={12}
                color={change > 0 ? "#2d6b5a" : change < 0 ? "#e74c3c" : "#888"}
              />
              <Text style={{ fontSize: 11, fontWeight: "600", color: change > 0 ? "#2d6b5a" : change < 0 ? "#e74c3c" : "#888" }}>
                {change > 0 ? "+" : ""}{change === 999 || change === -999 ? "N/A" : `${change.toFixed(0)}%`}
              </Text>
              <Text style={{ fontSize: 10, color: "#8a9b93" }}>vs igår</Text>
            </View>
          )}
        </View>
        <View style={[st.statIconBox, { backgroundColor: a.icon + "20" }]}>
          <Ionicons name={icon as any} size={20} color={a.icon} />
        </View>
      </View>
    </View>
  );
}

function StatusRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View style={st.statusRow}>
      <Text style={st.statusLabel}>{label}</Text>
      {highlight !== undefined ? (
        <View style={[st.statusBadge2, highlight && st.statusBadge2Active]}>
          <Text style={[st.statusBadge2Text, highlight && { color: "#fff" }]}>{value}</Text>
        </View>
      ) : (
        <Text style={st.statusValue}>{value}</Text>
      )}
    </View>
  );
}

// ═══ Styles ═══

const st = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 40, gap: 16, maxWidth: 1400 },

  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 },
  title: { fontSize: 28, fontWeight: "700", color: "#2c3e35" },
  subtitle: { fontSize: 13, color: "#6b7c74", marginTop: 3 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  liveBadge: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#e8f5ee", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: "#2d6b5a30" },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#2d6b5a" },
  liveText: { fontSize: 12, fontWeight: "600", color: "#2d6b5a" },
  refreshBtn: { padding: 10, backgroundColor: "#fff", borderRadius: 10, borderWidth: 1, borderColor: "#e5e7eb" },

  // Stats row
  statsRow: { flexDirection: "row", gap: 12 },
  statCard: { flex: 1, minWidth: 140, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: "rgba(0,0,0,0.04)" },
  statLabel: { fontSize: 10, fontWeight: "600", color: "#6b7c74", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 },
  statValue: { fontSize: 24, fontWeight: "700" },
  statIconBox: { width: 40, height: 40, borderRadius: 10, justifyContent: "center", alignItems: "center" },

  // Cards
  card: { backgroundColor: "#fff", borderRadius: 14, padding: 18, borderWidth: 1, borderColor: "#f0f0f0", minWidth: 280 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  cardTitle: { fontSize: 15, fontWeight: "600", color: "#2c3e35" },
  cardMeta: { fontSize: 11, color: "#8a9b93" },
  twoColRow: { flexDirection: "row", gap: 14, flexWrap: "wrap" },

  badge: { backgroundColor: "#f0f0f0", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText: { fontSize: 11, fontWeight: "600", color: "#6b7c74" },

  // Chart
  chartContainer: { flexDirection: "row", alignItems: "flex-end", gap: 6, height: 160 },
  chartBar: { flex: 1, alignItems: "center", gap: 3 },
  barWrapper: { width: "100%", height: 130, justifyContent: "flex-end" },
  bar: { width: "100%", borderTopLeftRadius: 4, borderTopRightRadius: 4, minHeight: 4 },
  barLabel: { fontSize: 10, color: "#8a9b93" },
  barSub: { fontSize: 9, color: "#b0b8b3" },

  // Orders
  orderRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#f5f5f5" },
  orderIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#f5f5f5", justifyContent: "center", alignItems: "center" },
  orderNum: { fontSize: 13, fontWeight: "600", color: "#2c3e35" },
  orderMeta: { fontSize: 11, color: "#8a9b93", marginTop: 1 },
  orderTotal: { fontSize: 13, fontWeight: "700", color: "#2c3e35" },
  statusBadge: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4, backgroundColor: "#f0f0f0" },
  statusReg: { backgroundColor: "#2d6b5a" },
  statusText: { fontSize: 9, fontWeight: "600", color: "#6b7c74" },

  // Category
  catName: { fontSize: 13, fontWeight: "600", color: "#2c3e35" },
  catMeta: { fontSize: 11, color: "#8a9b93" },
  progressTrack: { height: 8, backgroundColor: "#f0f0f0", borderRadius: 4, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 4 },

  // Payment
  segmentedBar: { height: 20, borderRadius: 10, overflow: "hidden", flexDirection: "row", marginBottom: 14, marginTop: 8 },
  segment: { height: "100%" },
  payGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  payItem: { flexDirection: "row", alignItems: "center", gap: 10, width: "47%", padding: 10, borderRadius: 10, backgroundColor: "#f9fafb" },
  payIconBox: { width: 36, height: 36, borderRadius: 8, justifyContent: "center", alignItems: "center" },
  payMethod: { fontSize: 13, fontWeight: "600", color: "#2c3e35", textTransform: "capitalize" },
  payMeta: { fontSize: 10, color: "#8a9b93" },

  // Top products
  topRow: { flexDirection: "row", alignItems: "center", gap: 10, padding: 10, borderRadius: 10, backgroundColor: "#f9fafb", marginBottom: 8 },
  topRank: { width: 32, height: 32, borderRadius: 8, justifyContent: "center", alignItems: "center" },
  topRankText: { fontSize: 12, fontWeight: "700" },
  topName: { fontSize: 13, fontWeight: "600", color: "#2c3e35" },
  topSub: { fontSize: 11, color: "#8a9b93" },
  topRevenue: { fontSize: 13, fontWeight: "700", color: "#2c3e35" },

  // Low stock
  stockRow: { flexDirection: "row", alignItems: "center", gap: 10, padding: 10, borderRadius: 10, borderWidth: 1, marginBottom: 6 },
  stockDot: { width: 8, height: 8, borderRadius: 4 },
  stockName: { fontSize: 13, fontWeight: "600" },
  stockSku: { fontSize: 10, color: "#8a9b93" },
  stockQty: { fontSize: 13, fontWeight: "700" },

  // Actions
  actionsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  actionCard: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", minWidth: 220, flex: 1, padding: 14, borderRadius: 12, backgroundColor: "#f9fafb", borderWidth: 1, borderColor: "#f0f0f0" },
  actionIcon: { width: 42, height: 42, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  actionLabel: { fontSize: 13, fontWeight: "600", color: "#2c3e35" },
  actionMeta: { fontSize: 11, color: "#8a9b93" },

  // Kiosk status
  onlineBox: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderRadius: 10, backgroundColor: "#e8f5ee", borderWidth: 1, borderColor: "#2d6b5a20", marginBottom: 14 },
  onlineDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#2d6b5a" },
  onlineText: { fontSize: 14, fontWeight: "700", color: "#2d6b5a" },
  onlineSub: { fontSize: 11, color: "#8a9b93" },
  statusDetails: { gap: 8 },
  statusRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  statusLabel: { fontSize: 12, color: "#8a9b93" },
  statusValue: { fontSize: 12, fontWeight: "600", color: "#2c3e35" },
  statusBadge2: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, backgroundColor: "#f0f0f0" },
  statusBadge2Active: { backgroundColor: "#2d6b5a" },
  statusBadge2Text: { fontSize: 10, fontWeight: "600", color: "#6b7c74" },

  // Empty states
  emptyText: { fontSize: 13, color: "#8a9b93", paddingVertical: 12 },
  emptyIcon: { width: 56, height: 56, borderRadius: 28, justifyContent: "center", alignItems: "center", marginBottom: 10 },
  emptyTitle: { fontSize: 14, fontWeight: "600", color: "#2c3e35", marginBottom: 4 },
});
