/**
 * PocketBase sync engine (stub for Phase 2)
 * Will handle remote sync for multi-device access
 */

export interface SyncStatus {
  connected: boolean;
  lastSync: string | null;
  pendingChanges: number;
}

export function getSyncStatus(): SyncStatus {
  return {
    connected: false,
    lastSync: null,
    pendingChanges: 0,
  };
}

/**
 * Placeholder for future PocketBase sync
 */
export async function syncWithRemote(): Promise<void> {
  // Phase 2: Implement PocketBase sync
  console.log("[Sync] PocketBase sync not yet implemented");
}
