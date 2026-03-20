/**
 * Dev auto-login — only runs when __DEV__ === true
 * Automatically activates the dev license and logs in
 * so the developer never has to go through activate/login screens.
 *
 * Credentials come from .env (never bundled in production):
 *   DEV_LICENSE_KEY, DEV_USER_EMAIL, DEV_USER_PASSWORD
 */

import pb, {
  saveLicenseData,
  getLicenseData,
  saveAuthStore,
} from "./pocketbase";

// Fallbacks are ONLY used in __DEV__ — the whole file is guarded by __DEV__ check.
// In production builds, tree-shaking removes this file entirely since devBootstrap() returns false immediately.
const DEV_LICENSE_KEY =
  (typeof process !== "undefined" && process.env?.EXPO_PUBLIC_DEV_LICENSE_KEY) || "FHXG-BJDA-CYPJ-YH6V";
const DEV_EMAIL =
  (typeof process !== "undefined" && process.env?.EXPO_PUBLIC_DEV_EMAIL) || "zivar68@gmail.com";
const DEV_PASSWORD =
  (typeof process !== "undefined" && process.env?.EXPO_PUBLIC_DEV_PASSWORD) || "Zivar12345";

/**
 * Returns true if dev bootstrap ran successfully (license + login done).
 * Returns false if anything fails — caller should fall through to normal flow.
 */
export async function devBootstrap(): Promise<boolean> {
  // Safety: never run in production
  if (!__DEV__) return false;

  try {
    // 1. Check if license is already saved
    const existing = await getLicenseData();
    const needsLicense = !existing.licenseKey;
    const needsAuth = !pb.authStore.isValid;

    if (!needsLicense && !needsAuth) {
      // Already activated and logged in
      return true;
    }

    // 2. Activate license if needed
    if (needsLicense) {
      console.log("[DEV] Auto-activating license:", DEV_LICENSE_KEY);

      const license = await pb.collection("licenses").getFirstListItem(
        `licenseKey = "${DEV_LICENSE_KEY}"`
      );

      if (!license || license.status !== "active") {
        console.warn("[DEV] License not found or inactive, falling back to manual flow");
        return false;
      }

      // Find or create kiosk
      let kiosk;
      try {
        kiosk = await pb.collection("kiosks").getFirstListItem(
          `tenantId = "${license.tenantId}"`
        );
        await pb.collection("kiosks").update(kiosk.id, {
          status: "active",
          lastSeen: new Date().toISOString(),
        });
      } catch {
        kiosk = await pb.collection("kiosks").create({
          tenantId: license.tenantId,
          name: `Dev Kiosk`,
          licenseKey: DEV_LICENSE_KEY,
          status: "active",
          lastSeen: new Date().toISOString(),
        });
      }

      await saveLicenseData(DEV_LICENSE_KEY, license.tenantId, kiosk.id);
      console.log("[DEV] License activated, kioskId:", kiosk.id);
    }

    // 3. Login if needed
    if (needsAuth) {
      console.log("[DEV] Auto-login as:", DEV_EMAIL);
      await pb.collection("users").authWithPassword(DEV_EMAIL, DEV_PASSWORD);
      await saveAuthStore();
      console.log("[DEV] Logged in successfully");
    }

    return true;
  } catch (err) {
    console.warn("[DEV] Auto-bootstrap failed, falling back to manual flow:", err);
    return false;
  }
}
