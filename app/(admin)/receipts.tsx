/**
 * Admin Receipts — kiosk-admin standard
 * Sök, filter, expanderbara rader, retur, print, CSV-export
 */

import { useState, useMemo } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Modal, Alert, Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useReceipts } from "@/hooks/useReceipts";

type StatusFilter = "all" | "registrerad" | "ej_registrerad" | "retur";
type PayFilter = "all" | "Swish" | "Kort" | "Kontant" | "QR";

function getPayIcon(m: string): string {
  const lower = (m || "").toLowerCase();
  if (lower.includes("swish")) return "phone-portrait-outline";
  if (lower.includes("kort") || lower.includes("card")) return "card-outline";
  if (lower.includes("kontant") || lower.includes("cash")) return "cash-outline";
  if (lower.includes("qr")) return "qr-code-outline";
  return "card-outline";
}

export default function ReceiptsPage() {
  const { receipts, loading, todayRevenue, todayCount, refresh, update } = useReceipts();

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [payFilter, setPayFilter] = useState<PayFilter>("all");

  // Expandable row
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Return modal
  const [showReturn, setShowReturn] = useState(false);
  const [returnReceipt, setReturnReceipt] = useState<any>(null);
  const [returnReason, setReturnReason] = useState("Kundreturn");
  const [returnNote, setReturnNote] = useState("");

  // Filtered receipts
  const filtered = useMemo(() => {
    return receipts.filter((r) => {
      if (search) {
        const q = search.toLowerCase();
        const matchNum = r.kvittoNummer?.toLowerCase().includes(q);
        const matchItem = (r.items || []).some((i: any) => i.namn?.toLowerCase().includes(q));
        const matchTotal = String(r.total).includes(q);
        if (!matchNum && !matchItem && !matchTotal) return false;
      }
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (payFilter !== "all" && r.betalning !== payFilter) return false;
      return true;
    });
  }, [receipts, search, statusFilter, payFilter]);

  // Stats
  const stats = useMemo(() => ({
    count: filtered.length,
    total: filtered.reduce((s, r) => s + (r.total || 0), 0),
    avg: filtered.length > 0 ? filtered.reduce((s, r) => s + (r.total || 0), 0) / filtered.length : 0,
    tagged: filtered.filter((r) => r.tagged).length,
  }), [filtered]);

  // Actions
  const handleReturn = async () => {
    if (!returnReceipt) return;
    await update(returnReceipt.id, { status: "retur" as any });
    setShowReturn(false);
    setReturnReceipt(null);
    setReturnReason("Kundreturn");
    setReturnNote("");
    Alert.alert("Retur registrerad", `Kvitto ${returnReceipt.kvittoNummer} markerat som retur.`);
    refresh();
  };

  const handlePrint = (receipt: any) => {
    if (Platform.OS === "web") {
      const win = window.open("", "_blank", "width=400,height=600");
      if (!win) return;
      const itemRows = (receipt.items || []).map((i: any) =>
        `<tr><td>${i.antal}x ${i.namn}</td><td style="text-align:right">${i.prisTotal} kr</td></tr>`
      ).join("");
      win.document.write(`
        <html><head><title>Kvitto ${receipt.kvittoNummer}</title>
        <style>body{font-family:monospace;padding:20px;max-width:300px;margin:auto}table{width:100%;border-collapse:collapse}
        td{padding:4px 0}hr{border:none;border-top:1px dashed #ccc;margin:10px 0}.total{font-size:1.3em;font-weight:bold}</style></head>
        <body><h3 style="text-align:center">KVITTO</h3>
        <p><strong>${receipt.kvittoNummer}</strong><br>${receipt.datum} ${receipt.tid}<br>Betalning: ${receipt.betalning}</p>
        <hr><table>${itemRows}</table><hr>
        <p class="total">TOTALT: ${receipt.total} kr</p>
        <p style="text-align:center;color:#888;font-size:0.9em">Tack för ditt köp!</p>
        <script>window.print()</script></body></html>
      `);
      win.document.close();
    } else {
      Alert.alert("Skriv ut", `Kvitto ${receipt.kvittoNummer}\nTotal: ${receipt.total} kr\n\nPrint är tillgängligt via webben.`);
    }
  };

  const handleExportCSV = () => {
    const header = "KvittoNr,Datum,Tid,Artiklar,Total,Betalning,Status";
    const rows = filtered.map((r) => `${r.kvittoNummer},${r.datum},${r.tid},${(r.items || []).length},${r.total},${r.betalning},${r.status}`);
    const csv = [header, ...rows].join("\n");
    if (Platform.OS === "web") {
      try {
        const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a"); a.href = url; a.download = `kvitton-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
        URL.revokeObjectURL(url);
      } catch {}
    }
    Alert.alert("Exporterad", `${filtered.length} kvitton exporterade som CSV.`);
  };

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.title}>Kvitton</Text>
          <Text style={s.subtitle}>{receipts.length} kvitton totalt</Text>
        </View>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <TouchableOpacity style={s.actionBtn} onPress={handleExportCSV}>
            <Ionicons name="download-outline" size={16} color="#fff" />
            <Text style={s.actionBtnText}>CSV</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.actionBtn, { backgroundColor: "#5b8fa8" }]} onPress={refresh}>
            <Ionicons name="refresh-outline" size={16} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats */}
      <View style={s.statsRow}>
        <View style={[s.statCard, { backgroundColor: "#e8f5ee" }]}>
          <Text style={s.statLabel}>Kvitton</Text>
          <Text style={[s.statValue, { color: "#2d6b5a" }]}>{stats.count}</Text>
        </View>
        <View style={[s.statCard, { backgroundColor: "#fdf4e8" }]}>
          <Text style={s.statLabel}>Total</Text>
          <Text style={[s.statValue, { color: "#c47a3a" }]}>{stats.total} kr</Text>
        </View>
        <View style={[s.statCard, { backgroundColor: "#e8f0fa" }]}>
          <Text style={s.statLabel}>Snittorder</Text>
          <Text style={[s.statValue, { color: "#5b8fa8" }]}>{Math.round(stats.avg)} kr</Text>
        </View>
        <View style={[s.statCard, { backgroundColor: "#f0e8fa" }]}>
          <Text style={s.statLabel}>Idag</Text>
          <Text style={[s.statValue, { color: "#9b59b6" }]}>{todayRevenue} kr</Text>
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
            placeholder="Sök kvittonr, produkt, belopp..."
            placeholderTextColor="#b0b8b3"
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Ionicons name="close-circle" size={16} color="#8a9b93" />
            </TouchableOpacity>
          ) : null}
        </View>
        <View style={s.filterGroup}>
          {(["all", "registrerad", "ej_registrerad", "retur"] as StatusFilter[]).map((f) => (
            <TouchableOpacity
              key={f}
              style={[s.filterBtn, statusFilter === f && s.filterBtnActive]}
              onPress={() => setStatusFilter(f)}
            >
              <Text style={[s.filterBtnText, statusFilter === f && s.filterBtnTextActive]}>
                {f === "all" ? "Alla" : f === "registrerad" ? "Reg" : f === "ej_registrerad" ? "Ej reg" : "Returer"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={s.filterGroup}>
          {(["all", "Swish", "Kort", "Kontant"] as PayFilter[]).map((f) => (
            <TouchableOpacity
              key={f}
              style={[s.filterBtn, payFilter === f && s.filterBtnActive]}
              onPress={() => setPayFilter(f)}
            >
              <Text style={[s.filterBtnText, payFilter === f && s.filterBtnTextActive]}>
                {f === "all" ? "Alla" : f}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Table Header */}
      <View style={s.tableHeader}>
        <Text style={[s.th, { flex: 1.2 }]}>Kvitto-nr</Text>
        <Text style={[s.th, { flex: 1 }]}>Datum</Text>
        <Text style={[s.th, { flex: 0.7 }]}>Tid</Text>
        <Text style={[s.th, { width: 60, textAlign: "center" }]}>Varor</Text>
        <Text style={[s.th, { width: 90, textAlign: "right" }]}>Total</Text>
        <Text style={[s.th, { width: 80 }]}>Betalning</Text>
        <Text style={[s.th, { width: 90 }]}>Status</Text>
        <Text style={[s.th, { width: 100, textAlign: "center" }]}>Åtgärder</Text>
      </View>

      {/* Table Body */}
      <ScrollView style={s.tableBody}>
        {filtered.length === 0 ? (
          <View style={s.emptyState}>
            <Ionicons name="receipt-outline" size={40} color="#d1d5db" />
            <Text style={s.emptyTitle}>Inga kvitton matchar</Text>
            <Text style={s.emptyText}>Ändra filter eller sökord</Text>
          </View>
        ) : filtered.map((r) => {
          const isExpanded = expandedId === r.id;
          return (
            <View key={r.id}>
              <TouchableOpacity
                style={[s.row, isExpanded && { backgroundColor: "#f9fafb" }]}
                onPress={() => setExpandedId(isExpanded ? null : r.id)}
                activeOpacity={0.7}
              >
                <Text style={[s.td, { flex: 1.2, fontWeight: "600" }]}>{r.kvittoNummer}</Text>
                <Text style={[s.td, { flex: 1 }]}>{r.datum}</Text>
                <Text style={[s.td, { flex: 0.7 }]}>{r.tid}</Text>
                <Text style={[s.td, { width: 60, textAlign: "center" }]}>{(r.items || []).length}</Text>
                <Text style={[s.td, { width: 90, textAlign: "right", fontWeight: "700" }]}>{r.total} kr</Text>
                <View style={{ width: 80, flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <Ionicons name={getPayIcon(r.betalning) as any} size={14} color="#6b7c74" />
                  <Text style={s.td}>{r.betalning}</Text>
                </View>
                <View style={{ width: 90 }}>
                  <View style={[s.statusBadge, {
                    backgroundColor: r.status === "registrerad" ? "#e8f5ee" : r.status === "retur" ? "#fde8e8" : "#fdf4e8"
                  }]}>
                    <Text style={[s.statusText, {
                      color: r.status === "registrerad" ? "#2d6b5a" : r.status === "retur" ? "#e74c3c" : "#c47a3a"
                    }]}>
                      {r.status === "registrerad" ? "Registrerad" : r.status === "retur" ? "Retur" : "Ej reg"}
                    </Text>
                  </View>
                </View>
                <View style={{ width: 100, flexDirection: "row", justifyContent: "center", gap: 6 }}>
                  <TouchableOpacity
                    style={s.iconBtn}
                    onPress={(e) => { e.stopPropagation?.(); handlePrint(r); }}
                  >
                    <Ionicons name="print-outline" size={16} color="#5b8fa8" />
                  </TouchableOpacity>
                  {r.status !== "retur" && (
                    <TouchableOpacity
                      style={s.iconBtn}
                      onPress={(e) => { e.stopPropagation?.(); setReturnReceipt(r); setShowReturn(true); }}
                    >
                      <Ionicons name="return-down-back-outline" size={16} color="#c47a3a" />
                    </TouchableOpacity>
                  )}
                  <Ionicons name={isExpanded ? "chevron-up-outline" : "chevron-down-outline"} size={16} color="#8a9b93" />
                </View>
              </TouchableOpacity>

              {/* Expanded details */}
              {isExpanded && (
                <View style={s.expanded}>
                  <View style={s.expandedHeader}>
                    <View style={s.expandedInfo}>
                      <Text style={s.expandedLabel}>Kvittonr</Text>
                      <Text style={s.expandedValue}>{r.kvittoNummer}</Text>
                    </View>
                    <View style={s.expandedInfo}>
                      <Text style={s.expandedLabel}>Datum</Text>
                      <Text style={s.expandedValue}>{r.datum} {r.tid}</Text>
                    </View>
                    <View style={s.expandedInfo}>
                      <Text style={s.expandedLabel}>Betalning</Text>
                      <Text style={s.expandedValue}>{r.betalning}</Text>
                    </View>
                    <View style={s.expandedInfo}>
                      <Text style={s.expandedLabel}>Status</Text>
                      <Text style={s.expandedValue}>{r.status}</Text>
                    </View>
                  </View>

                  {/* Items table */}
                  <View style={s.itemsTable}>
                    <View style={s.itemsHeader}>
                      <Text style={[s.itemTh, { flex: 2 }]}>Artikel</Text>
                      <Text style={[s.itemTh, { flex: 1, textAlign: "center" }]}>Antal</Text>
                      <Text style={[s.itemTh, { flex: 1, textAlign: "right" }]}>Styckpris</Text>
                      <Text style={[s.itemTh, { flex: 1, textAlign: "right" }]}>Total</Text>
                    </View>
                    {(r.items || []).map((item: any, idx: number) => (
                      <View key={idx} style={s.itemRow}>
                        <Text style={[s.itemTd, { flex: 2 }]}>{item.namn}</Text>
                        <Text style={[s.itemTd, { flex: 1, textAlign: "center" }]}>{item.antal}</Text>
                        <Text style={[s.itemTd, { flex: 1, textAlign: "right" }]}>{item.prisStyck} kr</Text>
                        <Text style={[s.itemTd, { flex: 1, textAlign: "right", fontWeight: "600" }]}>{item.prisTotal} kr</Text>
                      </View>
                    ))}
                    <View style={[s.itemRow, { borderTopWidth: 2, borderTopColor: "#e5e7eb" }]}>
                      <Text style={[s.itemTd, { flex: 2, fontWeight: "700", fontSize: 15 }]}>TOTALT</Text>
                      <Text style={{ flex: 1 }} />
                      <Text style={{ flex: 1 }} />
                      <Text style={[s.itemTd, { flex: 1, textAlign: "right", fontWeight: "700", fontSize: 15, color: "#2d6b5a" }]}>{r.total} kr</Text>
                    </View>
                  </View>

                  {/* Action buttons */}
                  <View style={s.expandedActions}>
                    <TouchableOpacity style={[s.expandedBtn, { backgroundColor: "#5b8fa8" }]} onPress={() => handlePrint(r)}>
                      <Ionicons name="print-outline" size={16} color="#fff" />
                      <Text style={s.expandedBtnText}>Skriv ut</Text>
                    </TouchableOpacity>
                    {r.status !== "retur" && (
                      <TouchableOpacity style={[s.expandedBtn, { backgroundColor: "#c47a3a" }]} onPress={() => { setReturnReceipt(r); setShowReturn(true); }}>
                        <Ionicons name="return-down-back-outline" size={16} color="#fff" />
                        <Text style={s.expandedBtnText}>Retur</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>

      {/* Return Modal */}
      <Modal visible={showReturn} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={s.modal}>
            <Text style={s.modalTitle}>Registrera retur</Text>
            <Text style={s.modalSub}>Kvitto: {returnReceipt?.kvittoNummer} — {returnReceipt?.total} kr</Text>

            <Text style={s.formLabel}>Anledning</Text>
            <View style={s.reasonRow}>
              {["Kundreturn", "Defekt", "Fel order", "Ångerrätt", "Övrigt"].map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[s.reasonBtn, returnReason === r && s.reasonBtnActive]}
                  onPress={() => setReturnReason(r)}
                >
                  <Text style={[s.reasonBtnText, returnReason === r && { color: "#fff" }]}>{r}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.formLabel}>Anteckning</Text>
            <TextInput
              style={s.noteInput}
              value={returnNote}
              onChangeText={setReturnNote}
              placeholder="Valfri anteckning..."
              multiline
            />

            <View style={s.modalActions}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => { setShowReturn(false); setReturnReceipt(null); }}>
                <Text style={s.cancelBtnText}>Avbryt</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.returnBtn} onPress={handleReturn}>
                <Text style={s.returnBtnText}>Registrera retur</Text>
              </TouchableOpacity>
            </View>
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
  filterRow: { flexDirection: "row", gap: 10, marginBottom: 14, alignItems: "center" },
  searchBox: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#fff", borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 8, paddingHorizontal: 10, height: 38 },
  searchInput: { flex: 1, fontSize: 13, color: "#2c3e35" },
  filterGroup: { flexDirection: "row", gap: 4 },
  filterBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, backgroundColor: "#f0f0f0" },
  filterBtnActive: { backgroundColor: "#2d6b5a" },
  filterBtnText: { fontSize: 11, fontWeight: "600", color: "#6b7c74" },
  filterBtnTextActive: { color: "#fff" },

  // Table
  tableHeader: { flexDirection: "row", backgroundColor: "#f9fafb", paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8 },
  th: { fontSize: 11, fontWeight: "600", color: "#6b7c74", textTransform: "uppercase", letterSpacing: 0.3 },
  tableBody: { flex: 1, marginTop: 2 },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 12, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: "#f0f0f0", backgroundColor: "#fff" },
  td: { fontSize: 13, color: "#2c3e35" },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, alignSelf: "flex-start" },
  statusText: { fontSize: 10, fontWeight: "600" },
  iconBtn: { padding: 6, borderRadius: 6, backgroundColor: "#f5f5f5" },

  // Expanded
  expanded: { backgroundColor: "#f9fafb", paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: "#e5e7eb" },
  expandedHeader: { flexDirection: "row", gap: 24, marginBottom: 14 },
  expandedInfo: {},
  expandedLabel: { fontSize: 10, color: "#8a9b93", textTransform: "uppercase", marginBottom: 2 },
  expandedValue: { fontSize: 13, fontWeight: "600", color: "#2c3e35" },

  itemsTable: { backgroundColor: "#fff", borderRadius: 8, overflow: "hidden", borderWidth: 1, borderColor: "#f0f0f0", marginBottom: 12 },
  itemsHeader: { flexDirection: "row", backgroundColor: "#f0f0f0", paddingVertical: 8, paddingHorizontal: 12 },
  itemTh: { fontSize: 10, fontWeight: "600", color: "#6b7c74", textTransform: "uppercase" },
  itemRow: { flexDirection: "row", paddingVertical: 8, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: "#f5f5f5" },
  itemTd: { fontSize: 13, color: "#2c3e35" },

  expandedActions: { flexDirection: "row", gap: 8 },
  expandedBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  expandedBtnText: { color: "#fff", fontSize: 13, fontWeight: "600" },

  // Empty
  emptyState: { alignItems: "center", paddingVertical: 40 },
  emptyTitle: { fontSize: 15, fontWeight: "600", color: "#2c3e35", marginTop: 12 },
  emptyText: { fontSize: 13, color: "#8a9b93" },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.3)", justifyContent: "center", alignItems: "center" },
  modal: { backgroundColor: "#fff", borderRadius: 16, padding: 28, width: 460, elevation: 10 },
  modalTitle: { fontSize: 22, fontWeight: "700", color: "#2c3e35", marginBottom: 4 },
  modalSub: { fontSize: 14, color: "#6b7c74", marginBottom: 18 },
  formLabel: { fontSize: 12, fontWeight: "600", color: "#6b7c74", marginBottom: 6, marginTop: 10 },
  reasonRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  reasonBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 6, backgroundColor: "#f0f0f0" },
  reasonBtnActive: { backgroundColor: "#2d6b5a" },
  reasonBtnText: { fontSize: 12, fontWeight: "600", color: "#6b7c74" },
  noteInput: { height: 60, borderWidth: 1, borderColor: "#d1d5db", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, color: "#2c3e35", textAlignVertical: "top", marginTop: 4 },
  modalActions: { flexDirection: "row", gap: 12, marginTop: 20 },
  cancelBtn: { flex: 1, height: 44, borderWidth: 1, borderColor: "#d1d5db", borderRadius: 10, justifyContent: "center", alignItems: "center" },
  cancelBtnText: { fontSize: 15, color: "#6b7c74" },
  returnBtn: { flex: 1, height: 44, backgroundColor: "#c47a3a", borderRadius: 10, justifyContent: "center", alignItems: "center" },
  returnBtnText: { fontSize: 15, fontWeight: "600", color: "#fff" },
});
