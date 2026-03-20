/**
 * Register screen — creates a new user in PocketBase
 * Automatically links to the saved license/tenant
 */

import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import pb, { saveAuthStore, getLicenseData } from "@/core/sync/pocketbase";

export default function RegisterScreen() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail) {
      setError("E-postadress krävs");
      return;
    }
    if (password.length < 8) {
      setError("Lösenordet måste vara minst 8 tecken");
      return;
    }
    if (password !== confirmPassword) {
      setError("Lösenorden matchar inte");
      return;
    }

    setError("");
    setLoading(true);

    try {
      // Get the saved license data to link user to tenant
      const license = await getLicenseData();

      // Create user in PocketBase — password is hashed automatically by PB
      await pb.collection("users").create({
        email: trimmedEmail,
        password: password,
        passwordConfirm: confirmPassword,
        emailVisibility: true,
        tenantId: license.tenantId || "",
      });

      // Auto-login after registration
      await pb.collection("users").authWithPassword(trimmedEmail, password);
      await saveAuthStore();

      // Go directly to mode-select
      router.replace("/mode-select");
    } catch (err: any) {
      console.error("[Register] Error:", err);

      if (err?.data?.data?.email?.code === "validation_invalid_unique") {
        setError("E-postadressen är redan registrerad");
      } else if (err?.data?.data?.password?.message) {
        setError(err.data.data.password.message);
      } else if (err?.status === 0 || err?.message?.includes("fetch")) {
        setError("Kunde inte ansluta till servern");
      } else {
        setError("Registreringen misslyckades. Försök igen.");
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
        {/* Logo area */}
        <View style={styles.logoArea}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>EK</Text>
          </View>
          <Text style={styles.title}>Elo Kiosk</Text>
          <Text style={styles.subtitle}>Skapa ett nytt konto</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <Text style={styles.label}>E-postadress</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="namn@foretag.se"
            placeholderTextColor="#a0a0a0"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={styles.label}>Lösenord</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="Minst 8 tecken"
            placeholderTextColor="#a0a0a0"
            secureTextEntry
          />

          <Text style={styles.label}>Bekräfta lösenord</Text>
          <TextInput
            style={styles.input}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Skriv lösenordet igen"
            placeholderTextColor="#a0a0a0"
            secureTextEntry
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Skapa konto</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.replace("/login")}>
            <Text style={styles.hint}>
              Har du redan ett konto? <Text style={styles.hintLink}>Logga in</Text>
            </Text>
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
    backgroundColor: "#f0f7f4",
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
    marginTop: 12,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 16,
    color: "#1a1a1a",
    backgroundColor: "#f9fafb",
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
  hint: {
    fontSize: 13,
    color: "#8a9b93",
    textAlign: "center",
    marginTop: 16,
  },
  hintLink: {
    color: "#2d6b5a",
    fontWeight: "600",
  },
});
