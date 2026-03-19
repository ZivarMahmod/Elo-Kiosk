/**
 * Entry point — redirects based on auth state
 * If logged in → mode select, else → login
 */

import { useEffect } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/hooks/useAuth";

export default function IndexScreen() {
  const router = useRouter();
  const { isAuthenticated, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    if (isAuthenticated) {
      router.replace("/mode-select");
    } else {
      router.replace("/login");
    }
  }, [isAuthenticated, loading]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#2d6b5a" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f0f7f4",
  },
});
