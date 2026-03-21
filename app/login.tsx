/**
 * Login screen — authenticates against PocketBase users collection
 * Includes "forgot password" link that sends reset email via PocketBase
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
import { useAuth } from "@/hooks/useAuth";
import { useTenantBranding } from "@/hooks/useTenantBranding";
import pb from "@/core/sync/pocketbase";

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const { branding } = useTenantBranding();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const handleLogin = async () => {
    setError("");
    setLoading(true);

    try {
      const result = await login(email, password);
      if (result.success) {
        router.replace(Platform.OS === "android" ? "/(kiosk)" : "/mode-select");
      } else {
        setError(result.error || "Inloggningen misslyckades");
      }
    } catch (err: any) {
      setError(err.message || "Ett fel uppstod");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      setError("Ange din e-postadress först");
      return;
    }

    try {
      await pb.collection("users").requestPasswordReset(trimmedEmail);
      setResetSent(true);
      setError("");
    } catch (err: any) {
      // PocketBase returns 400 even if email doesn't exist (security)
      // Show success anyway to avoid email enumeration
      setResetSent(true);
      setError("");
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
            <Text style={styles.logoText}>CR</Text>
          </View>
          <Text style={styles.title}>{branding.companyName}</Text>
          {branding.showCobranding && (
            <Text style={[styles.subtitle, { marginBottom: 4 }]}>Powered by Corevo</Text>
          )}
          <Text style={styles.subtitle}>Logga in med ditt konto</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <Text style={styles.label}>E-postadress</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={(t) => { setEmail(t); setResetSent(false); }}
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
            placeholder="Ditt lösenord"
            placeholderTextColor="#a0a0a0"
            secureTextEntry
          />

          {/* Forgot password */}
          <TouchableOpacity onPress={handleForgotPassword}>
            <Text style={styles.forgotLink}>Glömt lösenord?</Text>
          </TouchableOpacity>

          {resetSent && (
            <Text style={styles.success}>
              Ett återställningsmail har skickats till {email.trim()}.
            </Text>
          )}

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Logga in</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.replace("/register")}>
            <Text style={styles.hint}>
              Inget konto? <Text style={styles.hintLink}>Skapa ett här</Text>
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
  forgotLink: {
    fontSize: 13,
    color: "#2d6b5a",
    textAlign: "right",
    marginTop: 8,
    fontWeight: "600",
  },
  success: {
    color: "#16a34a",
    fontSize: 13,
    marginTop: 8,
    textAlign: "center",
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
