/**
 * Admin Integrations — Plugin-system
 * Enable/disable and configure integrations (email, Swish, webhooks, etc.)
 */

import { useState, useEffect } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Modal, Switch, Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { INTEGRATIONS } from "@/core/integrations/registry";
import type { Integration, IntegrationConfig } from "@/core/integrations/types";
import { getSetting, updateSetting } from "@/core/database/settings";

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>(INTEGRATIONS);
  const [showConfig, setShowConfig] = useState(false);
  const [activeIntegration, setActiveIntegration] = useState<Integration | null>(null);
  const [configValues, setConfigValues] = useState<IntegrationConfig>({});

  // Load saved configs from settings
  useEffect(() => {
    (async () => {
      try {
        const saved = await getSetting("integrations" as any);
        if (saved && typeof saved === "string") {
          const parsed = JSON.parse(saved);
          setIntegrations((prev) =>
            prev.map((i) => ({
              ...i,
              enabled: parsed[i.id]?.enabled ?? i.enabled,
              configured: parsed[i.id]?.configured ?? i.configured,
            }))
          );
        }
      } catch {}
    })();
  }, []);

  // Save integration state
  const saveState = async (updated: Integration[]) => {
    const state: Record<string, { enabled: boolean; configured: boolean }> = {};
    for (const i of updated) {
      state[i.id] = { enabled: i.enabled, configured: i.configured };
    }
    await updateSetting("integrations" as any, JSON.stringify(state) as any);
  };

  const toggleEnabled = async (id: string) => {
    const updated = integrations.map((i) =>
      i.id === id ? { ...i, enabled: !i.enabled } : i
    );
    setIntegrations(updated);
    await saveState(updated);
    const integration = updated.find((i) => i.id === id);
    Alert.alert(
      integration?.enabled ? "Aktiverad" : "Avaktiverad",
      `${integration?.name} är nu ${integration?.enabled ? "aktiverad" : "avaktiverad"}.`
    );
  };

  const openConfig = (integration: Integration) => {
    setActiveIntegration(integration);
    // Load saved config
    const defaults: IntegrationConfig = {};
    for (const field of integration.configFields) {
      defaults[field.key] = field.type === "toggle" ? false : "";
    }
    setConfigValues(defaults);
    setShowConfig(true);
  };

  const saveConfig = async () => {
    if (!activeIntegration) return;
    // Validate required fields
    const missing = activeIntegration.configFields.filter(
      (f) => f.required && !configValues[f.key]
    );
    if (missing.length > 0) {
      Alert.alert("Saknade fält", `Fyll i: ${missing.map((f) => f.label).join(", ")}`);
      return;
    }
    // Save config
    await updateSetting(`integration_${activeIntegration.id}` as any, JSON.stringify(configValues) as any);
    // Mark as configured
    const updated = integrations.map((i) =>
      i.id === activeIntegration.id ? { ...i, configured: true, enabled: true } : i
    );
    setIntegrations(updated);
    await saveState(updated);
    setShowConfig(false);
    Alert.alert("Sparat", `${activeIntegration.name} är nu konfigurerad och aktiverad.`);
  };

  const categoryLabels: Record<string, string> = {
    payment: "Betalning",
    communication: "Kommunikation",
    analytics: "Analys",
    other: "Övrigt",
  };
  const categoryIcons: Record<string, string> = {
    payment: "card-outline",
    communication: "chatbubbles-outline",
    analytics: "analytics-outline",
    other: "extension-puzzle-outline",
  };

  // Group by category
  const grouped = integrations.reduce((acc, i) => {
    if (!acc[i.category]) acc[i.category] = [];
    acc[i.category].push(i);
    return acc;
  }, {} as Record<string, Integration[]>);

  return (
    <ScrollView style={st.container} contentContainerStyle={st.content}>
      <View style={st.header}>
        <View>
          <Text style={st.title}>Integrationer</Text>
          <Text style={st.subtitle}>Aktivera och konfigurera kopplingar till externa tjänster</Text>
        </View>
      </View>

      {/* Stats */}
      <View style={st.statsRow}>
        <View style={[st.statCard, { backgroundColor: "#e8f5ee" }]}>
          <Text style={st.statLabel}>Aktiva</Text>
          <Text style={[st.statValue, { color: "#2d6b5a" }]}>{integrations.filter((i) => i.enabled).length}</Text>
        </View>
        <View style={[st.statCard, { backgroundColor: "#fdf4e8" }]}>
          <Text style={st.statLabel}>Tillgängliga</Text>
          <Text style={[st.statValue, { color: "#c47a3a" }]}>{integrations.length}</Text>
        </View>
        <View style={[st.statCard, { backgroundColor: "#e8f0fa" }]}>
          <Text style={st.statLabel}>Konfigurerade</Text>
          <Text style={[st.statValue, { color: "#5b8fa8" }]}>{integrations.filter((i) => i.configured).length}</Text>
        </View>
      </View>

      {/* Integration cards by category */}
      {Object.entries(grouped).map(([category, items]) => (
        <View key={category}>
          <View style={st.categoryHeader}>
            <Ionicons name={categoryIcons[category] as any || "extension-puzzle-outline"} size={18} color="#6b7c74" />
            <Text style={st.categoryTitle}>{categoryLabels[category] || category}</Text>
          </View>

          {items.map((integration) => (
            <View key={integration.id} style={st.integrationCard}>
              <View style={st.integrationRow}>
                <View style={[st.integrationIcon, { backgroundColor: integration.enabled ? "#e8f5ee" : "#f5f5f5" }]}>
                  <Ionicons name={integration.icon as any} size={24} color={integration.enabled ? "#2d6b5a" : "#8a9b93"} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Text style={st.integrationName}>{integration.name}</Text>
                    {integration.configured && (
                      <View style={st.configuredBadge}>
                        <Ionicons name="checkmark-circle" size={12} color="#2d6b5a" />
                        <Text style={st.configuredText}>Konfigurerad</Text>
                      </View>
                    )}
                  </View>
                  <Text style={st.integrationDesc}>{integration.description}</Text>
                </View>
                <Switch
                  value={integration.enabled}
                  onValueChange={() => toggleEnabled(integration.id)}
                  trackColor={{ false: "#d1d5db", true: "#2d6b5a40" }}
                  thumbColor={integration.enabled ? "#2d6b5a" : "#f4f3f4"}
                />
              </View>
              <View style={st.integrationActions}>
                <TouchableOpacity
                  style={st.configBtn}
                  onPress={() => openConfig(integration)}
                >
                  <Ionicons name="settings-outline" size={14} color="#5b8fa8" />
                  <Text style={st.configBtnText}>Konfigurera</Text>
                </TouchableOpacity>
                {integration.id === "email-receipts" && integration.configured && (
                  <TouchableOpacity
                    style={[st.configBtn, { backgroundColor: "#f0e8fa" }]}
                    onPress={() => Alert.alert("Testmail", "Ett testkvitto skickas till konfigurerad avsändaradress.")}
                  >
                    <Ionicons name="send-outline" size={14} color="#9b59b6" />
                    <Text style={[st.configBtnText, { color: "#9b59b6" }]}>Skicka test</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}
        </View>
      ))}

      {/* Config Modal */}
      <Modal visible={showConfig} transparent animationType="fade">
        <View style={st.modalOverlay}>
          <View style={st.modal}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 20 }}>
              <View style={[st.integrationIcon, { backgroundColor: "#e8f5ee" }]}>
                <Ionicons name={activeIntegration?.icon as any || "settings-outline"} size={24} color="#2d6b5a" />
              </View>
              <View>
                <Text style={st.modalTitle}>{activeIntegration?.name}</Text>
                <Text style={st.modalSub}>{activeIntegration?.description}</Text>
              </View>
            </View>

            <ScrollView style={{ maxHeight: 400 }}>
              {activeIntegration?.configFields.map((field) => (
                <View key={field.key} style={st.formField}>
                  <Text style={st.formLabel}>
                    {field.label} {field.required && <Text style={{ color: "#e74c3c" }}>*</Text>}
                  </Text>
                  {field.type === "toggle" ? (
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                      <Text style={{ fontSize: 14, color: "#6b7c74" }}>
                        {configValues[field.key] ? "Aktiverad" : "Avaktiverad"}
                      </Text>
                      <Switch
                        value={!!configValues[field.key]}
                        onValueChange={(v) => setConfigValues((prev) => ({ ...prev, [field.key]: v }))}
                        trackColor={{ false: "#d1d5db", true: "#2d6b5a40" }}
                        thumbColor={configValues[field.key] ? "#2d6b5a" : "#f4f3f4"}
                      />
                    </View>
                  ) : field.type === "select" ? (
                    <View style={st.selectRow}>
                      {field.options?.map((opt) => (
                        <TouchableOpacity
                          key={opt.value}
                          style={[st.selectBtn, configValues[field.key] === opt.value && st.selectBtnActive]}
                          onPress={() => setConfigValues((prev) => ({ ...prev, [field.key]: opt.value }))}
                        >
                          <Text style={[st.selectBtnText, configValues[field.key] === opt.value && { color: "#fff" }]}>{opt.label}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  ) : (
                    <TextInput
                      style={st.formInput}
                      value={String(configValues[field.key] || "")}
                      onChangeText={(v) => setConfigValues((prev) => ({ ...prev, [field.key]: v }))}
                      placeholder={field.placeholder}
                      placeholderTextColor="#b0b8b3"
                      secureTextEntry={field.type === "password"}
                      keyboardType={field.type === "email" ? "email-address" : field.type === "url" ? "url" : "default"}
                      autoCapitalize="none"
                    />
                  )}
                </View>
              ))}
            </ScrollView>

            <View style={st.modalActions}>
              <TouchableOpacity style={st.cancelBtn} onPress={() => setShowConfig(false)}>
                <Text style={st.cancelBtnText}>Avbryt</Text>
              </TouchableOpacity>
              <TouchableOpacity style={st.saveBtn} onPress={saveConfig}>
                <Ionicons name="save-outline" size={16} color="#fff" />
                <Text style={st.saveBtnText}>Spara</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const st = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  header: { marginBottom: 16 },
  title: { fontSize: 28, fontWeight: "700", color: "#2c3e35" },
  subtitle: { fontSize: 13, color: "#6b7c74", marginTop: 3 },

  statsRow: { flexDirection: "row", gap: 12, marginBottom: 20 },
  statCard: { flex: 1, padding: 14, borderRadius: 12 },
  statLabel: { fontSize: 11, color: "#6b7c74", marginBottom: 4 },
  statValue: { fontSize: 24, fontWeight: "700" },

  categoryHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 16, marginBottom: 10 },
  categoryTitle: { fontSize: 16, fontWeight: "600", color: "#2c3e35" },

  integrationCard: { backgroundColor: "#fff", borderRadius: 14, padding: 16, borderWidth: 1, borderColor: "#f0f0f0", marginBottom: 10 },
  integrationRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  integrationIcon: { width: 48, height: 48, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  integrationName: { fontSize: 16, fontWeight: "600", color: "#2c3e35" },
  integrationDesc: { fontSize: 13, color: "#6b7c74", marginTop: 2 },
  configuredBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#e8f5ee", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  configuredText: { fontSize: 10, fontWeight: "600", color: "#2d6b5a" },

  integrationActions: { flexDirection: "row", gap: 8, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#f5f5f5" },
  configBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, backgroundColor: "#e8f0fa" },
  configBtnText: { fontSize: 12, fontWeight: "600", color: "#5b8fa8" },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.3)", justifyContent: "center", alignItems: "center" },
  modal: { backgroundColor: "#fff", borderRadius: 16, padding: 28, width: 460, maxHeight: "80%", elevation: 10 },
  modalTitle: { fontSize: 20, fontWeight: "700", color: "#2c3e35" },
  modalSub: { fontSize: 12, color: "#6b7c74", marginTop: 2 },

  formField: { marginBottom: 16 },
  formLabel: { fontSize: 13, fontWeight: "600", color: "#6b7c74", marginBottom: 6 },
  formInput: { height: 44, borderWidth: 1, borderColor: "#d1d5db", borderRadius: 8, paddingHorizontal: 12, fontSize: 14, color: "#2c3e35" },
  selectRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  selectBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: "#f0f0f0" },
  selectBtnActive: { backgroundColor: "#2d6b5a" },
  selectBtnText: { fontSize: 13, fontWeight: "600", color: "#6b7c74" },

  modalActions: { flexDirection: "row", gap: 12, marginTop: 20 },
  cancelBtn: { flex: 1, height: 44, borderWidth: 1, borderColor: "#d1d5db", borderRadius: 10, justifyContent: "center", alignItems: "center" },
  cancelBtnText: { fontSize: 15, color: "#6b7c74" },
  saveBtn: { flex: 1, height: 44, backgroundColor: "#2d6b5a", borderRadius: 10, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 6 },
  saveBtnText: { fontSize: 15, fontWeight: "600", color: "#fff" },
});
