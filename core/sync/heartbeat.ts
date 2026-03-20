/**
 * Heartbeat — pings PocketBase every 5 minutes
 * Updates kiosks collection lastSeen so superadmin knows kiosk is online
 */

import pb, { getActiveKioskId } from "./pocketbase";

const HEARTBEAT_INTERVAL = 5 * 60 * 1000; // 5 minutes
let intervalId: ReturnType<typeof setInterval> | null = null;

async function sendHeartbeat(): Promise<void> {
  try {
    const kioskId = await getActiveKioskId();
    if (!kioskId) return;

    await pb.collection("kiosks").update(kioskId, {
      lastSeen: new Date().toISOString(),
    });
  } catch {
    // Silent — no error messages to user
  }
}

/**
 * Start the heartbeat loop. Safe to call multiple times — only one loop runs.
 */
export function startHeartbeat(): void {
  if (intervalId) return;

  // Send immediately on start
  sendHeartbeat();

  intervalId = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);
}

/**
 * Stop the heartbeat loop.
 */
export function stopHeartbeat(): void {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}
