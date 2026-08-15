import { useCallback, useEffect, useRef } from "react";
import { AppState, type AppStateStatus } from "react-native";

/**
 * A frame loop that does not re-render React.
 *
 * The callback receives seconds elapsed since the previous frame and is expected
 * to mutate refs, not state — a `setState` per frame would re-render the whole
 * screen 60 times a second, which is the single easiest way to make a mobile
 * game stutter. Screens publish to the HUD on a slower timer instead.
 *
 * Delta is clamped to 50 ms. After a stall (a GC pause, or the app returning to
 * the foreground) an unclamped delta would teleport everything across the
 * screen in one frame and skip collisions entirely.
 *
 * The loop also suspends itself when the app leaves the foreground and resumes
 * without counting the time spent away.
 */
export const useGameLoop = (
  onFrame: (deltaSeconds: number) => void,
  running: boolean
): void => {
  const frameRef = useRef<number | null>(null);
  const lastRef = useRef<number>(0);
  const callbackRef = useRef(onFrame);
  callbackRef.current = onFrame;

  /** Foreground state, kept in a ref so it never restarts the effect. */
  const activeRef = useRef(true);

  const stop = useCallback(() => {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
  }, []);

  useEffect(() => {
    const onAppState = (next: AppStateStatus) => {
      const nowActive = next === "active";
      // Returning from the background: drop the elapsed time so the first frame
      // back is a normal one rather than a multi-second jump.
      if (nowActive && !activeRef.current) lastRef.current = 0;
      activeRef.current = nowActive;
    };

    const subscription = AppState.addEventListener("change", onAppState);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (!running) {
      stop();
      lastRef.current = 0;
      return;
    }

    const tick = (now: number) => {
      frameRef.current = requestAnimationFrame(tick);

      if (!activeRef.current) {
        lastRef.current = 0;
        return;
      }

      if (lastRef.current === 0) {
        lastRef.current = now;
        return;
      }

      const delta = Math.min(0.05, (now - lastRef.current) / 1000);
      lastRef.current = now;
      callbackRef.current(delta);
    };

    frameRef.current = requestAnimationFrame(tick);
    return stop;
  }, [running, stop]);

  // Belt and braces: a screen torn down mid-frame must not leave one scheduled.
  useEffect(() => stop, [stop]);
};

/**
 * Reports whether the app is in the foreground.
 *
 * Screens use this to auto-pause, so a run is never lost to a phone call.
 */
export const useAppActive = (onBackground: () => void): void => {
  const handler = useRef(onBackground);
  handler.current = onBackground;

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (next) => {
      if (next !== "active") handler.current();
    });
    return () => subscription.remove();
  }, []);
};
