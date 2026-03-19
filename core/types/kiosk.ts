/**
 * Kiosk identity types
 */

export interface KioskIdentity {
  id: string;
  kioskId: string;
  accountEmail: string;
  passwordHash: string;
  linkedAt: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  email: string | null;
  kioskId: string | null;
}
