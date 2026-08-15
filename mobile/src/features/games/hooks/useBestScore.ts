import { useCallback, useEffect, useRef, useState } from "react";
import { readJson, saveJson } from "@/services/storage";

const key = (gameKey: string) => `nearbitez.best.${gameKey}`;

/**
 * Personal best for one game, kept on the device.
 *
 * Local because there is no per-game best on the backend — `GameScore` stores a
 * daily *total* across all games, not a high score per game. This is a display
 * convenience only: it is never sent anywhere and never affects a reward, so
 * a tampered value buys nothing.
 */
export const useBestScore = (gameKey: string) => {
  const [best, setBest] = useState(0);
  const bestRef = useRef(0);

  useEffect(() => {
    let mounted = true;
    void readJson<number>(key(gameKey)).then((stored) => {
      if (!mounted || typeof stored !== "number") return;
      bestRef.current = stored;
      setBest(stored);
    });
    return () => {
      mounted = false;
    };
  }, [gameKey]);

  /** Returns true when this run beat the stored best. */
  const record = useCallback(
    (score: number) => {
      if (score <= bestRef.current) return false;
      bestRef.current = score;
      setBest(score);
      void saveJson(key(gameKey), score);
      return true;
    },
    [gameKey]
  );

  return { best, record };
};
