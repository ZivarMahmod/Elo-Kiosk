/**
 * Login screen — email + password → creates/links kiosk
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

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError("");
    setLoading(true);

    try {
      const result = await login(email, password);
      if (result.success) {
        router.replace("/mode-select");
      } else {
        setError(result.error || "Inloggningen misslyckades");
      }
    } catch (err: any) {
      setError(err.message || "Ett fel uppstod");
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
          <Text style={styles.subtitle}>
            Logga in eller skapa ett nytt konto
          </Text>
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
            placeholder="Ditt lösenord"
            placeholderTextColor="#a0a0a0"
            secureTextEntry
          />

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

          <Text style={styles.hint}>
            Första gången? Ett nytt kioskkonto skapas automatiskt.
          </Text>
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
});
