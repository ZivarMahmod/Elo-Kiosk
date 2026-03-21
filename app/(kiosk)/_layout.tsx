/**
 * Kiosk layout — full screen, no navigation chrome
 */

import { useEffect } from "react";
import { Platform } from "react-native";
import { Stack } from "expo-router";

export default function KioskLayout() {
  // On web, remove the default grey (#f2f2f2) background from Stack navigator containers
  // so the ImageBackground shows through. Only targets full-screen containers.
  useEffect(() => {
    if (Platform.OS === "web") {
      const fixBg = () => {
        document.querySelectorAll("div").forEach((el) => {
          const bg = getComputedStyle(el).backgroundColor;
          if (bg === "rgb(242, 242, 242)") {
            const rect = el.getBoundingClientRect();
            // Only clear backgrounds on full-screen containers (Stack wrappers)
            if (rect.width > window.innerWidth * 0.9 && rect.height > window.innerHeight * 0.9) {
              el.style.backgroundColor = "transparent";
            }
          }
        });
      };
      fixBg();
      const observer = new MutationObserver(fixBg);
      observer.observe(document.body, { childList: true, subtree: true });
      return () => observer.disconnect();
    }
  }, []);

  return (
    <Stack screenOptions={{
      headerShown: false,
      contentStyle: { backgroundColor: "transparent" },
    }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="checkout" />
    </Stack>
  );
}
