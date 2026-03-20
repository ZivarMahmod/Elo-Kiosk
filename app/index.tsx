/**
 * Entry point — redirects based on activation + auth state + kiosk lock
 *
 * 1. No license key → /activate
 * 2. License exists but not logged in → /auth-choice
 * 3. Logged in + Android → /(kiosk) directly
 * 4. Logged in + kiosk locked → /(kiosk)
 * 5. Logged in + web → /mode-select
 */

import { useEffect } from "react";
import { View, ActivityIndicator, StyleSheet, Platform } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/hooks/useAuth";
import { useSettings } from "@/hooks/useSettings";
import { getLicenseData } from "@/core/sync/pocketbase";
import { initAuth } from "@/core/sync/auth";

export default function IndexScreen() {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading, kioskId } = useAuth();
  const { settings, loading: settingsLoading } = useSettings();

  useEffect(() => {
    if (authLoading || settingsLoading) return;

    const bootstrap = async () => {
      // Initialize PocketBase auth from storage
      await initAuth();

      // Check if device has been activated with a license
      const license = await getLicenseData();

      if (!license.licenseKey) {
        router.replace("/activate");
        return;
      }

      if (!isAuthenticated) {
        router.replace("/auth-choice");
        return;
      }

      // Android → always go straight to kiosk mode
      if (Platform.OS === "android") {
        router.replace("/(kiosk)");
        return;
      }

      // Web: if kiosk is locked → kiosk mode, otherwise mode-select
      if (settings.kioskLocked && kioskId) {
        router.replace("/(kiosk)");
        return;
      }

      router.replace("/mode-select");
    };

    bootstrap();
  }, [isAuthenticated, authLoading, settingsLoading, settings.kioskLocked, kioskId]);

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
