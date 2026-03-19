/**
 * Auth state hook
 */

import { useState, useEffect, useCallback } from "react";
import { getAuthState, loginOrRegister, logout } from "@/core/sync/auth";
import type { AuthState } from "@/core/types/kiosk";

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    email: null,
    kioskId: null,
  });
  const [loading, setLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    try {
      const state = await getAuthState();
      setAuthState(state);
    } catch (err) {
      console.error("[Auth] Error checking auth:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = useCallback(async (email: string, password: string) => {
    const result = await loginOrRegister(email, password);
    if (result.success) {
      await checkAuth();
    }
    return result;
  }, [checkAuth]);

  const doLogout = useCallback(async () => {
    await logout();
    setAuthState({ isAuthenticated: false, email: null, kioskId: null });
  }, []);

  return {
    ...authState,
    loading,
    login,
    logout: doLogout,
    refresh: checkAuth,
  };
}
