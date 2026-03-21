/**
 * Authentication system — PocketBase cloud auth
 * Logs in against PocketBase users collection, fetches linked kiosk,
 * persists token via AsyncStorage.
 *
 * Exports the same interface as before so hooks/useAuth.ts is unchanged.
 */

import pb, {
  saveAuthStore,
  loadAuthStore,
  clearAuthStore,
  getLicenseData,
  saveLicenseData,
} from "./pocketbase";
import type { AuthState } from "../types/kiosk";

/**
 * Initialize auth — must be called once at app startup
 * Restores any previously saved PocketBase token
 */
export async function initAuth(): Promise<void> {
  await loadAuthStore();
}

/**
 * Login with email/password against PocketBase users collection
 * Keeps the same return shape as the old local auth.
 */
export async function loginOrRegister(
  email: string,
  password: string
): Promise<{ success: boolean; kioskId?: string; error?: string }> {
  const normalizedEmail = email.toLowerCase().trim();

  if (!normalizedEmail || !password) {
    return { success: false, error: "E-post och lösenord krävs" };
  }

  try {
    // Authenticate against PocketBase
    await pb.collection("users").authWithPassword(normalizedEmail, password);
    await saveAuthStore();

    // Check if we already have a kioskId saved (survives logout)
    const license = await getLicenseData();
    if (license.kioskId) {
      // Reconnect to existing kiosk — all data is preserved
      return { success: true, kioskId: license.kioskId };
    }

    // No saved kioskId — try to find one via the user's tenant
    // This handles the "new device, same account" scenario
    if (license.tenantId) {
      try {
        const kiosk = await pb.collection("kiosks").getFirstListItem(
          `tenantId = "${license.tenantId}"`
        );
        if (kiosk) {
          await saveLicenseData(license.licenseKey || "", license.tenantId, kiosk.id);
          return { success: true, kioskId: kiosk.id };
        }
      } catch {
        // No kiosk found for tenant — will be created by bootstrap
      }
    }

    return { success: true, kioskId: undefined };
  } catch (err: any) {
    console.error("[Auth] PocketBase login failed:", err);

    // Map PocketBase errors to Swedish messages
    if (err?.status === 400) {
      return { success: false, error: "Fel e-post eller lösenord" };
    }
    if (err?.status === 0 || err?.message?.includes("fetch")) {
      return { success: false, error: "Kunde inte ansluta till servern" };
    }

    return { success: false, error: "Inloggningen misslyckades" };
  }
}

/**
 * Get the current auth state
 * Checks PocketBase auth store + local license data
 */
export async function getAuthState(): Promise<AuthState> {
  // Ensure token is loaded from storage
  if (!pb.authStore.token) {
    await loadAuthStore();
  }

  const isValid = pb.authStore.isValid;
  const record = pb.authStore.record;
  const license = await getLicenseData();

  if (!isValid || !record) {
    return { isAuthenticated: false, email: null, kioskId: null };
  }

  return {
    isAuthenticated: true,
    email: record.email ?? null,
    kioskId: license.kioskId ?? null,
  };
}

/**
 * Logout — clears PocketBase auth but KEEPS license/kiosk data.
 * The kioskId and license are tied to this device, not the user session.
 * This way, re-login reconnects to the same kiosk with all its data.
 */
export async function logout(): Promise<void> {
  await clearAuthStore();
  // NOTE: We intentionally do NOT call clearLicenseData() here.
  // License key, tenantId, and kioskId must survive logout/re-login
  // so the kiosk reconnects to its existing data.
}
