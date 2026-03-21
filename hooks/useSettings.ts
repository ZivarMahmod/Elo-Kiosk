/**
 * Settings queries hook
 */

import { useState, useEffect, useCallback } from "react";
import { getAllSettings, updateSettings, updateSetting } from "@/core/database/settings";
import type { KioskSettings } from "@/core/types/settings";
import { DEFAULT_SETTINGS } from "@/core/types/settings";

export function useSettings() {
  const [settings, setSettings] = useState<KioskSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await getAllSettings();
      setSettings(data);
    } catch (err) {
      console.error("[Settings] Error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Auto-refresh — poll every 30 seconds
  useEffect(() => {
    const interval = setInterval(refresh, 30000);
    return () => clearInterval(interval);
  }, [refresh]);

  const save = useCallback(async (updates: Partial<KioskSettings>) => {
    await updateSettings(updates);
    setSettings((prev) => ({ ...prev, ...updates }));
  }, []);

  const saveSingle = useCallback(async <K extends keyof KioskSettings>(
    key: K,
    value: KioskSettings[K]
  ) => {
    await updateSetting(key, value);
    setSettings((prev) => ({ ...prev, [key]: value }));
  }, []);

  return { settings, loading, refresh, save, saveSingle };
}
