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
  clearLicenseData,
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

    // Try to find a kiosk linked to this user's tenant
    const license = await getLicenseData();
    const kioskId = license.kioskId ?? undefined;

    return { success: true, kioskId };
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
 * Logout — clears PocketBase auth + license data
 */
export async function logout(): Promise<void> {
  await clearAuthStore();
  await clearLicenseData();
}
