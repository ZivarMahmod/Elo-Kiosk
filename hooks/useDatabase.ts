/**
 * Database initialization hook
 */

import { useState, useEffect } from "react";
import { getDatabase } from "@/core/database/db";

export function useDatabase() {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    getDatabase()
      .then(() => {
        if (mounted) setIsReady(true);
      })
      .catch((err) => {
        if (mounted) setError(err.message);
      });
    return () => { mounted = false; };
  }, []);

  return { isReady, error };
}
