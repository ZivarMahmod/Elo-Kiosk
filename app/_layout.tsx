/**
 * Root layout — wraps entire app with database initialization
 */

import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { useDatabase } from "@/hooks/useDatabase";
import { useAuth } from "@/hooks/useAuth";
import { startHeartbeat, stopHeartbeat } from "@/core/sync/heartbeat";

export default function RootLayout() {
  const { isReady, error } = useDatabase();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (isReady && isAuthenticated) {
      startHeartbeat();
    }
    return () => stopHeartbeat();
  }, [isReady, isAuthenticated]);

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Databasfel: {error}</Text>
      </View>
    );
  }

  if (!isReady) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2d6b5a" />
        <Text style={styles.loadingText}>Initialiserar databas...</Text>
      </View>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="mode-select" />
        <Stack.Screen name="(kiosk)" />
        <Stack.Screen name="(admin)" />
      </Stack>
    </>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f0f7f4",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#6b7c74",
  },
  errorText: {
    fontSize: 18,
    color: "#c44040",
    textAlign: "center",
    padding: 20,
  },
});
