/**
 * Entry point — redirects based on activation + auth state + kiosk lock
 *
 * DEV mode: auto-activates license + auto-logs in (skips activate/login screens)
 *
 * 1. No license key → /activate
 * 2. License exists but not logged in → /auth-choice
 * 3. Logged in + Android → /(kiosk) directly
 * 4. Logged in + kiosk locked → /(kiosk)
 * 5. Logged in + web → /mode-select
 */

import { useEffect, useState } from "react";
import { View, ActivityIndicator, StyleSheet, Platform } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/hooks/useAuth";
import { useSettings } from "@/hooks/useSettings";
import { getLicenseData } from "@/core/sync/pocketbase";
import { initAuth } from "@/core/sync/auth";
import { devBootstrap } from "@/core/sync/dev-bootstrap";

export default function IndexScreen() {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading, kioskId, refresh: refreshAuth } = useAuth();
  const { settings, loading: settingsLoading } = useSettings();
  const [devReady, setDevReady] = useState(false);

  useEffect(() => {
    if (authLoading || settingsLoading) return;

    const bootstrap = async () => {
      // Initialize PocketBase auth from storage
      await initAuth();

      // DEV mode: auto-activate + auto-login
      if (__DEV__ && !devReady) {
        const ok = await devBootstrap();
        if (ok) {
          setDevReady(true);
          // Refresh auth state so isAuthenticated updates
          if (refreshAuth) await refreshAuth();
          return; // useEffect will re-run with updated auth
        }
      }

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
  }, [isAuthenticated, authLoading, settingsLoading, settings.kioskLocked, kioskId, devReady]);

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
