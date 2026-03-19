/**
 * Mode select screen — choose Kiosk or Admin mode
 */

import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/hooks/useAuth";
import { Ionicons } from "@expo/vector-icons";

export default function ModeSelectScreen() {
  const router = useRouter();
  const { email, kioskId, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>Välkommen tillbaka</Text>
          <Text style={styles.emailText}>{email}</Text>
          <Text style={styles.kioskIdText}>Kiosk-ID: {kioskId}</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#6b7c74" />
          <Text style={styles.logoutText}>Logga ut</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.title}>Välj läge</Text>
      <Text style={styles.subtitle}>
        Hur vill du använda denna enhet?
      </Text>

      <View style={styles.cardRow}>
        {/* Kiosk Mode */}
        <TouchableOpacity
          style={[styles.modeCard, styles.kioskCard]}
          onPress={() => router.push("/(kiosk)")}
          activeOpacity={0.8}
        >
          <View style={styles.iconCircle}>
            <Ionicons name="storefront-outline" size={48} color="#2c3e35" />
          </View>
          <Text style={styles.modeTitle}>Kiosk-läge</Text>
          <Text style={styles.modeDesc}>
            Kundvyn — visar produkter, kundvagn och betalning.
            Fullskärm för kunder.
          </Text>
          <View style={styles.modeTagRow}>
            <View style={styles.modeTag}>
              <Text style={styles.modeTagText}>Kundinriktad</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Admin Mode */}
        <TouchableOpacity
          style={[styles.modeCard, styles.adminCard]}
          onPress={() => router.push("/(admin)")}
          activeOpacity={0.8}
        >
          <View style={styles.iconCircle}>
            <Ionicons name="settings-outline" size={48} color="#2c3e35" />
          </View>
          <Text style={styles.modeTitle}>Admin-läge</Text>
          <Text style={styles.modeDesc}>
            Hantera produkter, kategorier, inställningar,
            kvitton och rapporter.
          </Text>
          <View style={styles.modeTagRow}>
            <View style={[styles.modeTag, styles.adminTag]}>
              <Text style={styles.modeTagText}>Ägare / Personal</Text>
            </View>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#e8f0ec",
    padding: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    position: "absolute",
    top: 20,
    left: 28,
    right: 28,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  welcomeText: {
    fontSize: 14,
    color: "#6b7c74",
  },
  emailText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2c3e35",
  },
  kioskIdText: {
    fontSize: 13,
    color: "#8a9b93",
    marginTop: 2,
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#ffffff",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#d1d5db",
  },
  logoutText: {
    fontSize: 14,
    color: "#6b7c74",
  },
  title: {
    fontSize: 42,
    fontWeight: "700",
    color: "#2c3e35",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: "#6b7c74",
    marginBottom: 40,
  },
  cardRow: {
    flexDirection: "row",
    gap: 24,
  },
  modeCard: {
    width: 340,
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: 32,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 8,
    borderWidth: 2,
    borderColor: "transparent",
  },
  kioskCard: {
    borderColor: "#2d6b5a20",
  },
  adminCard: {
    borderColor: "#d4a57420",
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#f0f7f4",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  modeTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#2c3e35",
    marginBottom: 8,
  },
  modeDesc: {
    fontSize: 15,
    color: "#6b7c74",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 16,
  },
  modeTagRow: {
    flexDirection: "row",
  },
  modeTag: {
    backgroundColor: "#e8f0ec",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  adminTag: {
    backgroundColor: "#f5ede4",
  },
  modeTagText: {
    fontSize: 13,
    color: "#2c3e35",
    fontWeight: "600",
  },
});
