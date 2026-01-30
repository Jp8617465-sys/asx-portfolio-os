import { useEffect, useRef } from 'react';

interface UseAutoRefreshOptions {
  onRefresh: () => void | Promise<void>;
  intervalMs: number;
  enabled?: boolean;
}

export function useAutoRefresh({ onRefresh, intervalMs, enabled = true }: UseAutoRefreshOptions) {
  const savedCallback = useRef<() => void | Promise<void>>();

  // Remember latest callback
  useEffect(() => {
    savedCallback.current = onRefresh;
  }, [onRefresh]);

  // Set up interval
  useEffect(() => {
    if (!enabled) return;

    function tick() {
      if (savedCallback.current) {
        savedCallback.current();
      }
    }

    const id = setInterval(tick, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs, enabled]);
}
