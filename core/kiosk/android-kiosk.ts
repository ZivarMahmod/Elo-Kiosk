/**
 * Android Kiosk Mode helpers
 *
 * For full lock task mode, the app needs to be set as Device Owner:
 *   adb shell dpm set-device-owner com.corevo.kiosk/.DeviceAdminReceiver
 *
 * Without device owner, we use these soft-lock strategies:
 * 1. Hide status bar (immersive mode) via StatusBar API
 * 2. Disable back button via BackHandler
 * 3. Require password to exit kiosk mode (implemented in kiosk/index.tsx)
 * 4. Auto-restart on app close (via settings)
 *
 * Full lock task mode requires a custom native module or
 * expo-dev-client with a config plugin. This file provides
 * the JavaScript-side helpers.
 */

import { Platform, BackHandler, StatusBar } from "react-native";

/**
 * Enter kiosk mode — hides system UI and blocks back button
 */
export function enterKioskMode() {
  if (Platform.OS !== "android") return;

  // Hide status bar
  StatusBar.setHidden(true, "fade");

  // Block hardware back button
  const backHandler = BackHandler.addEventListener("hardwareBackPress", () => {
    // Prevent going back — kiosk mode only exits via password
    return true;
  });

  return () => {
    backHandler.remove();
    StatusBar.setHidden(false, "fade");
  };
}

/**
 * Exit kiosk mode — restores system UI
 */
export function exitKioskMode() {
  if (Platform.OS !== "android") return;
  StatusBar.setHidden(false, "fade");
}

/**
 * Check if running on Android (for kiosk-specific features)
 */
export function isAndroid() {
  return Platform.OS === "android";
}

/**
 * Instructions for setting up full Android lock task mode:
 *
 * 1. Build APK: npx eas build -p android --profile preview
 * 2. Install on device: adb install corevo-kiosk.apk
 * 3. Set as device owner (requires factory reset first):
 *    adb shell dpm set-device-owner com.corevo.kiosk/.DeviceAdminReceiver
 * 4. The app will now have full lock task capabilities
 *
 * For managed devices (MDM):
 * - Use Android Enterprise to set the app as kiosk app
 * - Configure via settings in the admin panel
 */
