/**
 * License activation screen
 * Shown on first launch — user enters an 8-character license key.
 * Validates against PocketBase licenses collection.
 * On success, links kiosk to the correct tenant.
 */

import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import pb, { saveLicenseData } from "@/core/sync/pocketbase";

export default function ActivateScreen() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleActivate = async () => {
    const trimmed = code.trim().toUpperCase();

    if (trimmed.length !== 8) {
      setError("Licenskoden måste vara 8 tecken");
      return;
    }

    setError("");
    setLoading(true);

    try {
      // Find license by key
      const license = await pb.collection("licenses").getFirstListItem(
        `licenseKey = "${trimmed}"`
      );

      if (!license) {
        setError("Ogiltig licenskod");
        setLoading(false);
        return;
      }

      if (license.status !== "active") {
        setError("Licensen är inte aktiv. Kontakta support.");
        setLoading(false);
        return;
      }

      // Find or create the kiosk record
      let kiosk;
      try {
        // Check if a kiosk already exists for this license
        kiosk = await pb.collection("kiosks").getFirstListItem(
          `tenantId = "${license.tenantId}"`
        );
        // Update the kiosk with device info
        kiosk = await pb.collection("kiosks").update(kiosk.id, {
          status: "active",
          lastSeen: new Date().toISOString(),
        });
      } catch {
        // No kiosk exists — create one
        kiosk = await pb.collection("kiosks").create({
          tenantId: license.tenantId,
          name: `Kiosk ${trimmed.slice(-4)}`,
          licenseKey: trimmed,
          status: "active",
          lastSeen: new Date().toISOString(),
        });
      }

      // Persist license data locally
      await saveLicenseData(trimmed, license.tenantId, kiosk.id);

      // Navigate to auth choice (login or register)
      router.replace("/auth-choice");
    } catch (err: any) {
      console.error("[Activate] Error:", err);

      if (err?.status === 404) {
        setError("Ogiltig licenskod");
      } else if (err?.status === 0 || err?.message?.includes("fetch")) {
        setError("Kunde inte ansluta till servern. Kontrollera internetanslutningen.");
      } else {
        setError("Något gick fel. Försök igen.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.card}>
        {/* Logo */}
        <View style={styles.logoArea}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>EK</Text>
          </View>
          <Text style={styles.title}>Elo Kiosk</Text>
          <Text style={styles.subtitle}>Aktivera din kiosk</Text>
        </View>

        {/* License input */}
        <View style={styles.form}>
          <Text style={styles.label}>Licenskod</Text>
          <TextInput
            style={styles.input}
            value={code}
            onChangeText={(t) => setCode(t.toUpperCase().slice(0, 8))}
            placeholder="XXXXXXXX"
            placeholderTextColor="#a0a0a0"
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={8}
          />
          <Text style={styles.hint}>
            Ange den 8-siffriga licenskoden du fått via e-post.
          </Text>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleActivate}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Aktivera</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#e8f0ec",
  },
  card: {
    width: 420,
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: 40,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 8,
  },
  logoArea: {
    alignItems: "center",
    marginBottom: 32,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#2d6b5a",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  logoText: {
    fontSize: 28,
    fontWeight: "700",
    color: "#ffffff",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#2c3e35",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    color: "#6b7c74",
  },
  form: {
    gap: 4,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2c3e35",
    marginBottom: 4,
  },
  input: {
    height: 56,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 24,
    fontWeight: "700",
    color: "#1a1a1a",
    backgroundColor: "#f9fafb",
    textAlign: "center",
    letterSpacing: 6,
  },
  hint: {
    fontSize: 13,
    color: "#8a9b93",
    textAlign: "center",
    marginTop: 8,
  },
  error: {
    color: "#dc2626",
    fontSize: 14,
    marginTop: 8,
    textAlign: "center",
  },
  button: {
    height: 52,
    backgroundColor: "#2d6b5a",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "700",
  },
});
