/**
 * Admin layout — sidebar navigation
 */

import { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { Slot, useRouter, usePathname } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

const NAV_ITEMS = [
  { path: "/(admin)", label: "Dashboard", icon: "grid-outline" as const },
  { path: "/(admin)/products", label: "Produkter", icon: "cube-outline" as const },
  { path: "/(admin)/categories", label: "Kategorier", icon: "folder-outline" as const },
  { path: "/(admin)/inventory", label: "Lager", icon: "layers-outline" as const },
  { path: "/(admin)/receipts", label: "Kvitton", icon: "receipt-outline" as const },
  { path: "/(admin)/reports", label: "Rapporter", icon: "bar-chart-outline" as const },
  { path: "/(admin)/offers", label: "Erbjudanden", icon: "pricetag-outline" as const },
  { path: "/(admin)/wishes", label: "Önskemål", icon: "heart-outline" as const },
  { path: "/(admin)/settings", label: "Inställningar", icon: "settings-outline" as const },
];

export default function AdminLayout() {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <View style={styles.container}>
      {/* Sidebar */}
      <View style={styles.sidebar}>
        <View style={styles.sidebarHeader}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>EK</Text>
          </View>
          <Text style={styles.brandText}>Elo Kiosk</Text>
          <Text style={styles.modeText}>Admin-läge</Text>
        </View>

        <ScrollView style={styles.navList}>
          {NAV_ITEMS.map((item) => {
            const isActive =
              pathname === item.path ||
              (item.path === "/(admin)" && pathname === "/") ||
              (item.path !== "/(admin)" && pathname.startsWith(item.path));
            return (
              <TouchableOpacity
                key={item.path}
                style={[styles.navItem, isActive && styles.navItemActive]}
                onPress={() => router.push(item.path as any)}
              >
                <Ionicons
                  name={item.icon}
                  size={20}
                  color={isActive ? "#2d6b5a" : "#6b7c74"}
                />
                <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <TouchableOpacity
          style={styles.exitButton}
          onPress={() => router.replace("/mode-select")}
        >
          <Ionicons name="exit-outline" size={20} color="#6b7c74" />
          <Text style={styles.exitText}>Byt läge</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Slot />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, flexDirection: "row", backgroundColor: "#f4f7f5" },
  sidebar: {
    width: 220,
    backgroundColor: "#ffffff",
    borderRightWidth: 1,
    borderRightColor: "#e5e7eb",
    paddingVertical: 16,
  },
  sidebarHeader: {
    alignItems: "center",
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    marginHorizontal: 12,
  },
  logoCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#2d6b5a",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  logoText: { fontSize: 18, fontWeight: "700", color: "#fff" },
  brandText: { fontSize: 16, fontWeight: "700", color: "#2c3e35" },
  modeText: { fontSize: 12, color: "#8a9b93", marginTop: 2 },
  navList: { flex: 1, marginTop: 8 },
  navItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginHorizontal: 8,
    borderRadius: 8,
  },
  navItemActive: {
    backgroundColor: "#e8f5ee",
  },
  navLabel: { fontSize: 14, color: "#6b7c74" },
  navLabelActive: { color: "#2d6b5a", fontWeight: "600" },
  exitButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: 8,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  exitText: { fontSize: 14, color: "#6b7c74" },
  content: { flex: 1 },
});
