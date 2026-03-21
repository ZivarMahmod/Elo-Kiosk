/**
 * Admin layout — responsive sidebar navigation
 * Desktop (>768px): permanent sidebar
 * Tablet (>480px): collapsible sidebar (icons only, expand on hover/tap)
 * Mobile (<480px): bottom tab bar + hamburger drawer
 */

import { useState, useCallback } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  useWindowDimensions, Modal, Pressable,
} from "react-native";
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
  { path: "/(admin)/integrations", label: "Integrationer", icon: "extension-puzzle-outline" as const },
  { path: "/(admin)/settings", label: "Inställningar", icon: "settings-outline" as const },
];

// Bottom tab items (mobile) — show 4 most important + "Mer"
const BOTTOM_TABS = [
  { path: "/(admin)", label: "Hem", icon: "grid-outline" as const },
  { path: "/(admin)/products", label: "Produkter", icon: "cube-outline" as const },
  { path: "/(admin)/receipts", label: "Kvitton", icon: "receipt-outline" as const },
  { path: "/(admin)/reports", label: "Rapporter", icon: "bar-chart-outline" as const },
];

export default function AdminLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const isDesktop = width >= 768;
  const isTablet = width >= 480 && width < 768;
  const isMobile = width < 480;

  const isActive = useCallback((path: string) => {
    return pathname === path ||
      (path === "/(admin)" && pathname === "/") ||
      (path !== "/(admin)" && pathname.startsWith(path));
  }, [pathname]);

  const navigate = useCallback((path: string) => {
    router.push(path as any);
    setDrawerOpen(false);
  }, [router]);

  // ═══ MOBILE LAYOUT ═══
  if (isMobile) {
    return (
      <View style={s.mobileContainer}>
        {/* Top bar */}
        <View style={s.mobileTopBar}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <View style={s.miniLogo}><Text style={s.miniLogoText}>CR</Text></View>
            <Text style={s.mobileTitle}>Corevo Admin</Text>
          </View>
          <TouchableOpacity style={s.hamburger} onPress={() => setDrawerOpen(true)}>
            <Ionicons name="menu-outline" size={24} color="#2c3e35" />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View style={s.mobileContent}>
          <Slot />
        </View>

        {/* Bottom tab bar */}
        <View style={s.bottomBar}>
          {BOTTOM_TABS.map((item) => {
            const active = isActive(item.path);
            return (
              <TouchableOpacity
                key={item.path}
                style={s.bottomTab}
                onPress={() => navigate(item.path)}
              >
                <Ionicons name={item.icon} size={22} color={active ? "#2d6b5a" : "#8a9b93"} />
                <Text style={[s.bottomTabLabel, active && s.bottomTabLabelActive]}>{item.label}</Text>
              </TouchableOpacity>
            );
          })}
          <TouchableOpacity style={s.bottomTab} onPress={() => setDrawerOpen(true)}>
            <Ionicons name="ellipsis-horizontal-outline" size={22} color="#8a9b93" />
            <Text style={s.bottomTabLabel}>Mer</Text>
          </TouchableOpacity>
        </View>

        {/* Drawer */}
        <Modal visible={drawerOpen} transparent animationType="fade">
          <Pressable style={s.drawerOverlay} onPress={() => setDrawerOpen(false)}>
            <Pressable style={s.drawer} onPress={(e) => e.stopPropagation()}>
              <View style={s.drawerHeader}>
                <View style={s.logoCircle}><Text style={s.logoText}>CR</Text></View>
                <Text style={s.brandText}>Corevo Admin</Text>
                <Text style={s.modeText}>Admin-läge</Text>
              </View>
              <ScrollView style={s.drawerNav}>
                {NAV_ITEMS.map((item) => {
                  const active = isActive(item.path);
                  return (
                    <TouchableOpacity
                      key={item.path}
                      style={[s.drawerItem, active && s.drawerItemActive]}
                      onPress={() => navigate(item.path)}
                    >
                      <Ionicons name={item.icon} size={20} color={active ? "#2d6b5a" : "#6b7c74"} />
                      <Text style={[s.drawerLabel, active && s.drawerLabelActive]}>{item.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              <TouchableOpacity style={s.drawerExit} onPress={() => { setDrawerOpen(false); router.replace("/mode-select"); }}>
                <Ionicons name="exit-outline" size={20} color="#6b7c74" />
                <Text style={s.drawerExitText}>Byt läge</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.drawerClose} onPress={() => setDrawerOpen(false)}>
                <Ionicons name="close-outline" size={24} color="#6b7c74" />
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        </Modal>
      </View>
    );
  }

  // ═══ TABLET LAYOUT ═══
  if (isTablet) {
    return (
      <View style={s.container}>
        <View style={s.tabletSidebar}>
          <View style={{ alignItems: "center", paddingVertical: 12 }}>
            <View style={s.miniLogo}><Text style={s.miniLogoText}>CR</Text></View>
          </View>
          <ScrollView style={s.navList}>
            {NAV_ITEMS.map((item) => {
              const active = isActive(item.path);
              return (
                <TouchableOpacity
                  key={item.path}
                  style={[s.tabletNavItem, active && s.navItemActive]}
                  onPress={() => navigate(item.path)}
                >
                  <Ionicons name={item.icon} size={20} color={active ? "#2d6b5a" : "#6b7c74"} />
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <TouchableOpacity style={s.tabletNavItem} onPress={() => router.replace("/mode-select")}>
            <Ionicons name="exit-outline" size={20} color="#6b7c74" />
          </TouchableOpacity>
        </View>
        <View style={s.content}><Slot /></View>
      </View>
    );
  }

  // ═══ DESKTOP LAYOUT ═══
  return (
    <View style={s.container}>
      <View style={s.sidebar}>
        <View style={s.sidebarHeader}>
          <View style={s.logoCircle}><Text style={s.logoText}>CR</Text></View>
          <Text style={s.brandText}>Corevo Admin</Text>
          <Text style={s.modeText}>Admin-läge</Text>
        </View>

        <ScrollView style={s.navList}>
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.path);
            return (
              <TouchableOpacity
                key={item.path}
                style={[s.navItem, active && s.navItemActive]}
                onPress={() => navigate(item.path)}
              >
                <Ionicons name={item.icon} size={20} color={active ? "#2d6b5a" : "#6b7c74"} />
                <Text style={[s.navLabel, active && s.navLabelActive]}>{item.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <TouchableOpacity style={s.exitButton} onPress={() => router.replace("/mode-select")}>
          <Ionicons name="exit-outline" size={20} color="#6b7c74" />
          <Text style={s.exitText}>Byt läge</Text>
        </TouchableOpacity>
      </View>

      <View style={s.content}><Slot /></View>
    </View>
  );
}

const s = StyleSheet.create({
  // ═══ SHARED ═══
  container: { flex: 1, flexDirection: "row", backgroundColor: "#f4f7f5" },
  content: { flex: 1 },
  logoCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: "#2d6b5a", justifyContent: "center", alignItems: "center", marginBottom: 8 },
  logoText: { fontSize: 18, fontWeight: "700", color: "#fff" },
  brandText: { fontSize: 16, fontWeight: "700", color: "#2c3e35" },
  modeText: { fontSize: 12, color: "#8a9b93", marginTop: 2 },
  miniLogo: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#2d6b5a", justifyContent: "center", alignItems: "center" },
  miniLogoText: { fontSize: 14, fontWeight: "700", color: "#fff" },
  navList: { flex: 1, marginTop: 8 },

  // ═══ DESKTOP SIDEBAR ═══
  sidebar: { width: 220, backgroundColor: "#ffffff", borderRightWidth: 1, borderRightColor: "#e5e7eb", paddingVertical: 16 },
  sidebarHeader: { alignItems: "center", paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: "#f0f0f0", marginHorizontal: 12 },
  navItem: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, paddingHorizontal: 16, marginHorizontal: 8, borderRadius: 8 },
  navItemActive: { backgroundColor: "#e8f5ee" },
  navLabel: { fontSize: 14, color: "#6b7c74" },
  navLabelActive: { color: "#2d6b5a", fontWeight: "600" },
  exitButton: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 12, paddingHorizontal: 16, marginHorizontal: 8, borderTopWidth: 1, borderTopColor: "#f0f0f0" },
  exitText: { fontSize: 14, color: "#6b7c74" },

  // ═══ TABLET SIDEBAR (icons only) ═══
  tabletSidebar: { width: 60, backgroundColor: "#ffffff", borderRightWidth: 1, borderRightColor: "#e5e7eb", paddingVertical: 8, alignItems: "center" },
  tabletNavItem: { width: 44, height: 44, borderRadius: 10, justifyContent: "center", alignItems: "center", marginVertical: 2 },

  // ═══ MOBILE ═══
  mobileContainer: { flex: 1, backgroundColor: "#f4f7f5" },
  mobileTopBar: { height: 56, backgroundColor: "#ffffff", borderBottomWidth: 1, borderBottomColor: "#e5e7eb", flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16 },
  mobileTitle: { fontSize: 16, fontWeight: "700", color: "#2c3e35" },
  hamburger: { padding: 8 },
  mobileContent: { flex: 1 },

  // Bottom tab bar
  bottomBar: { height: 60, backgroundColor: "#ffffff", borderTopWidth: 1, borderTopColor: "#e5e7eb", flexDirection: "row", alignItems: "center", justifyContent: "space-around", paddingBottom: 4 },
  bottomTab: { alignItems: "center", justifyContent: "center", paddingVertical: 4, minWidth: 56 },
  bottomTabLabel: { fontSize: 10, color: "#8a9b93", marginTop: 2 },
  bottomTabLabelActive: { color: "#2d6b5a", fontWeight: "600" },

  // Drawer
  drawerOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", flexDirection: "row" },
  drawer: { width: 280, backgroundColor: "#ffffff", flex: 1, paddingTop: 20 },
  drawerHeader: { alignItems: "center", paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: "#f0f0f0", marginHorizontal: 16 },
  drawerNav: { flex: 1, marginTop: 8 },
  drawerItem: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, paddingHorizontal: 20, marginHorizontal: 8, borderRadius: 8 },
  drawerItemActive: { backgroundColor: "#e8f5ee" },
  drawerLabel: { fontSize: 15, color: "#6b7c74" },
  drawerLabelActive: { color: "#2d6b5a", fontWeight: "600" },
  drawerExit: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14, paddingHorizontal: 20, marginHorizontal: 8, borderTopWidth: 1, borderTopColor: "#f0f0f0" },
  drawerExitText: { fontSize: 15, color: "#6b7c74" },
  drawerClose: { position: "absolute", top: 16, right: 16, padding: 8 },
});
