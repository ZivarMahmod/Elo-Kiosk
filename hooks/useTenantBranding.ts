/**
 * Tenant branding hook — fetches branding from PocketBase tenants collection
 * Falls back to defaults when offline or not yet fetched
 */

import { useState, useEffect, useCallback } from "react";
import pb, { getLicenseData } from "@/core/sync/pocketbase";

export interface TenantBranding {
  companyName: string;
  poweredByText: string;
  showCobranding: boolean;
}

const DEFAULT_BRANDING: TenantBranding = {
  companyName: "Corevo Kiosk",
  poweredByText: "Powered by Corevo",
  showCobranding: true,
};

export function useTenantBranding() {
  const [branding, setBranding] = useState<TenantBranding>(DEFAULT_BRANDING);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const license = await getLicenseData();
      if (!license.tenantId) {
        setLoading(false);
        return;
      }

      // Try to fetch tenant record from PocketBase
      const tenant = await pb.collection("tenants").getOne(license.tenantId);

      setBranding({
        companyName: tenant.companyName || DEFAULT_BRANDING.companyName,
        poweredByText: tenant.poweredByText || DEFAULT_BRANDING.poweredByText,
        showCobranding: tenant.showCobranding ?? DEFAULT_BRANDING.showCobranding,
      });
    } catch (err) {
      // Offline or tenants collection doesn't exist — use defaults
      console.warn("[TenantBranding] Could not fetch tenant, using defaults:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Poll every 60 seconds for updates
  useEffect(() => {
    const interval = setInterval(refresh, 60000);
    return () => clearInterval(interval);
  }, [refresh]);

  const update = useCallback(async (updates: Partial<TenantBranding>) => {
    try {
      const license = await getLicenseData();
      if (!license.tenantId) return;

      await pb.collection("tenants").update(license.tenantId, updates);
      setBranding((prev) => ({ ...prev, ...updates }));
    } catch (err) {
      console.error("[TenantBranding] Failed to update:", err);
      throw err;
    }
  }, []);

  return { branding, loading, refresh, update };
}
