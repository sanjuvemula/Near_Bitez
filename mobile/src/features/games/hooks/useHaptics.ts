import { useCallback, useRef } from "react";
import * as Haptics from "expo-haptics";

/**
 * Subtle haptic feedback.
 *
 * Rate-limited to one pulse per 60 ms. A catcher game can register several hits
 * in the same frame, and firing the motor on each one turns feedback into a
 * continuous buzz — which is both unpleasant and a real battery cost.
 *
 * Every call is fire-and-forget: haptics are unavailable on some devices and on
 * emulators, and a game must never fail because the motor did.
 */
export const useHaptics = () => {
  const lastRef = useRef(0);

  const pulse = useCallback((run: () => Promise<void>) => {
    const now = Date.now();
    if (now - lastRef.current < 60) return;
    lastRef.current = now;
    void run().catch(() => {});
  }, []);

  return {
    /** A catch, a correct tap — the common, frequent event. */
    light: useCallback(
      () => pulse(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
      [pulse]
    ),
    /** A hazard hit or a wrong answer. */
    warn: useCallback(
      () => pulse(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
      [pulse]
    ),
    /** Run finished. */
    success: useCallback(
      () => pulse(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
      [pulse]
    ),
  };
};
