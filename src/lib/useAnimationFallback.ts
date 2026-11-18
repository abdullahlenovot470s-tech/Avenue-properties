import { useCallback, useEffect, useState } from 'react';

/**
 * Safety fallback for containers/sections animated from `opacity: 0`
 * (e.g. `initial`/`whileInView`): guarantees visibility if an animation
 * trigger or IntersectionObserver callback never fires.
 */
export function useRevealFallback(timeoutMs = 1000, active = true) {
  const [completed, setCompleted] = useState(false);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    setCompleted(false);
    setTimedOut(false);
    if (!active) return;

    const timer = window.setTimeout(() => {
      setTimedOut(true);
    }, timeoutMs);

    return () => window.clearTimeout(timer);
  }, [timeoutMs, active]);

  const markCompleted = useCallback(() => {
    setCompleted(true);
  }, []);

  return {
    forceVisible: active && timedOut && !completed,
    markCompleted,
  };
}
