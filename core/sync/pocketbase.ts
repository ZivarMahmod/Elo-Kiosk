/**
 * PocketBase client — single instance for the whole app
 * Connects to the Elo-Kiosk cloud backend on Fly.io
 */

import PocketBase from "pocketbase";
import AsyncStorage from "@react-native-async-storage/async-storage";

const PB_URL = "https://elo-kiosk-pb.fly.dev";

const pb = new PocketBase(PB_URL);

// Use AsyncStorage to persist the auth token across app restarts
const AUTH_STORE_KEY = "pb_auth";

/**
 * Save PocketBase auth state to AsyncStorage
 */
export async function saveAuthStore(): Promise<void> {
  try {
    const data = JSON.stringify({
      token: pb.authStore.token,
      record: pb.authStore.record,
    });
    await AsyncStorage.setItem(AUTH_STORE_KEY, data);
  } catch (err) {
    console.error("[PB] Failed to save auth store:", err);
  }
}

/**
 * Load PocketBase auth state from AsyncStorage
 */
export async function loadAuthStore(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(AUTH_STORE_KEY);
    if (raw) {
      const { token, record } = JSON.parse(raw);
      pb.authStore.save(token, record);
    }
  } catch (err) {
    console.error("[PB] Failed to load auth store:", err);
  }
}

/**
 * Clear persisted auth state
 */
export async function clearAuthStore(): Promise<void> {
  try {
    pb.authStore.clear();
    await AsyncStorage.removeItem(AUTH_STORE_KEY);
  } catch (err) {
    console.error("[PB] Failed to clear auth store:", err);
  }
}

// License/activation storage
const LICENSE_KEY = "elo_license_key";
const TENANT_KEY = "elo_tenant_id";
const KIOSK_KEY = "elo_kiosk_id";

export async function saveLicenseData(licenseKey: string, tenantId: string, kioskId: string): Promise<void> {
  await AsyncStorage.setItem(LICENSE_KEY, licenseKey);
  await AsyncStorage.setItem(TENANT_KEY, tenantId);
  await AsyncStorage.setItem(KIOSK_KEY, kioskId);
}

export async function getLicenseData(): Promise<{ licenseKey: string | null; tenantId: string | null; kioskId: string | null }> {
  const [licenseKey, tenantId, kioskId] = await Promise.all([
    AsyncStorage.getItem(LICENSE_KEY),
    AsyncStorage.getItem(TENANT_KEY),
    AsyncStorage.getItem(KIOSK_KEY),
  ]);
  return { licenseKey, tenantId, kioskId };
}

export async function clearLicenseData(): Promise<void> {
  await AsyncStorage.multiRemove([LICENSE_KEY, TENANT_KEY, KIOSK_KEY]);
}

/**
 * Get the active kiosk ID — used by all CRUD operations for data isolation.
 * Returns empty string if not activated (seed data fallback).
 */
let _cachedKioskId: string | null = null;

export async function getActiveKioskId(): Promise<string> {
  if (_cachedKioskId !== null) return _cachedKioskId;
  const kioskId = await AsyncStorage.getItem(KIOSK_KEY);
  _cachedKioskId = kioskId || "";
  return _cachedKioskId;
}

export function clearKioskIdCache(): void {
  _cachedKioskId = null;
}

export { pb, PB_URL };
export default pb;
