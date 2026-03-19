/**
 * Settings read/write operations
 */

import { getDatabase } from "./db";
import type { KioskSettings } from "../types/settings";
import { DEFAULT_SETTINGS } from "../types/settings";

/**
 * Get all settings as a KioskSettings object
 */
export async function getAllSettings(): Promise<KioskSettings> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ key: string; value: string }>(
    "SELECT key, value FROM settings"
  );

  const result: Record<string, any> = { ...DEFAULT_SETTINGS };

  for (const row of rows) {
    const key = row.key as keyof KioskSettings;
    const defaultVal = DEFAULT_SETTINGS[key];

    if (typeof defaultVal === "boolean") {
      result[key] = row.value === "true";
    } else if (typeof defaultVal === "number") {
      result[key] = Number(row.value);
    } else if (typeof defaultVal === "object") {
      try {
        result[key] = JSON.parse(row.value);
      } catch {
        result[key] = defaultVal;
      }
    } else {
      result[key] = row.value;
    }
  }

  return result as KioskSettings;
}

/**
 * Get a single setting value
 */
export async function getSetting<K extends keyof KioskSettings>(
  key: K
): Promise<KioskSettings[K]> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM settings WHERE key = ?",
    key
  );

  if (!row) return DEFAULT_SETTINGS[key];

  const defaultVal = DEFAULT_SETTINGS[key];
  if (typeof defaultVal === "boolean") return (row.value === "true") as KioskSettings[K];
  if (typeof defaultVal === "number") return Number(row.value) as KioskSettings[K];
  if (typeof defaultVal === "object") {
    try {
      return JSON.parse(row.value) as KioskSettings[K];
    } catch {
      return defaultVal;
    }
  }
  return row.value as KioskSettings[K];
}

/**
 * Update one or more settings
 */
export async function updateSettings(
  updates: Partial<KioskSettings>
): Promise<void> {
  const db = await getDatabase();

  for (const [key, value] of Object.entries(updates)) {
    if (value === undefined) continue;
    const serialized = typeof value === "object" ? JSON.stringify(value) : String(value);
    await db.runAsync(
      "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)",
      key,
      serialized
    );
  }
}

/**
 * Update a single setting
 */
export async function updateSetting<K extends keyof KioskSettings>(
  key: K,
  value: KioskSettings[K]
): Promise<void> {
  const db = await getDatabase();
  const serialized = typeof value === "object" ? JSON.stringify(value) : String(value);
  await db.runAsync(
    "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)",
    key,
    serialized
  );
}
