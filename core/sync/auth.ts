/**
 * Authentication system
 * Simple email/password stored locally with kioskId generation
 */

import { getDatabase, generateId } from "../database/db";
import type { AuthState, KioskIdentity } from "../types/kiosk";

/**
 * Hash a password (simple hash for local use — not crypto-grade)
 */
function hashPassword(password: string): string {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return `local_${Math.abs(hash).toString(36)}`;
}

/**
 * Generate a unique kiosk ID
 */
function generateKioskId(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let id = "EK-";
  for (let i = 0; i < 6; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

/**
 * Register or login with email/password
 * Creates a new kiosk identity if none exists for that email
 */
export async function loginOrRegister(
  email: string,
  password: string
): Promise<{ success: boolean; kioskId?: string; error?: string }> {
  const db = await getDatabase();
  const normalizedEmail = email.toLowerCase().trim();

  if (!normalizedEmail || !password) {
    return { success: false, error: "E-post och lösenord krävs" };
  }

  const pwHash = hashPassword(password);

  // Check if account exists
  const existing = await db.getFirstAsync<KioskIdentity>(
    "SELECT * FROM kiosk_identity WHERE accountEmail = ?",
    normalizedEmail
  );

  if (existing) {
    // Verify password
    if (existing.passwordHash !== pwHash) {
      return { success: false, error: "Fel lösenord" };
    }
    return { success: true, kioskId: existing.kioskId };
  }

  // Create new account
  const id = generateId("auth");
  const kioskId = generateKioskId();
  const now = new Date().toISOString();

  await db.runAsync(
    "INSERT INTO kiosk_identity (id, kioskId, accountEmail, passwordHash, linkedAt) VALUES (?, ?, ?, ?, ?)",
    id, kioskId, normalizedEmail, pwHash, now
  );

  return { success: true, kioskId };
}

/**
 * Get the current auth state (checks if any account is linked)
 */
export async function getAuthState(): Promise<AuthState> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<KioskIdentity>(
    "SELECT * FROM kiosk_identity LIMIT 1"
  );

  if (!row) {
    return { isAuthenticated: false, email: null, kioskId: null };
  }

  return {
    isAuthenticated: true,
    email: row.accountEmail,
    kioskId: row.kioskId,
  };
}

/**
 * Logout — removes kiosk identity
 */
export async function logout(): Promise<void> {
  const db = await getDatabase();
  await db.runAsync("DELETE FROM kiosk_identity");
}
