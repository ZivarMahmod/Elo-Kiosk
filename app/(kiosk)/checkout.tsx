/**
 * Checkout screen (placeholder for Phase 2 expanded checkout flow)
 */

import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";

export default function CheckoutScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Checkout</Text>
      <Text style={styles.subtitle}>Utökad betalningsvy kommer i fas 2</Text>
      <TouchableOpacity style={styles.button} onPress={() => router.back()}>
        <Text style={styles.buttonText}>Tillbaka</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f0f7f4" },
  title: { fontSize: 32, fontWeight: "700", color: "#2c3e35", marginBottom: 8 },
  subtitle: { fontSize: 16, color: "#6b7c74", marginBottom: 24 },
  button: { backgroundColor: "#2d6b5a", paddingHorizontal: 32, paddingVertical: 14, borderRadius: 12 },
  buttonText: { color: "#fff", fontSize: 18, fontWeight: "600" },
});
