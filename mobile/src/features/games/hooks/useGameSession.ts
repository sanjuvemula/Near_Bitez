import { useCallback, useRef, useState } from "react";
import { gameApi } from "@/services/api";
import { ApiError } from "@/services/apiClient";
import type { GameResult, ScoreSubmission } from "@/features/games/utils/types";

export type SubmitState = "idle" | "sending" | "confirmed" | "failed";

interface SessionState {
  status: SubmitState;
  /** Server's verdict on the run. Null until it answers. */
  award: ScoreSubmission | null;
  error: string | null;
  /** True when the failure was connectivity, so retrying is worthwhile. */
  offline: boolean;
}

/**
 * Owns everything that happens after a run ends.
 *
 * Three responsibilities, all of them about not lying to the player:
 *
 *  1. **One submission per run.** A run gets a session id; once it has been
 *     accepted the id is banked and the same run can never be submitted again,
 *     however many times the player taps. The backend has no duplicate guard of
 *     its own (see docs/phase6-inventory.md §4), so this is the only thing
 *     standing between a double-tap and a double payout.
 *
 *  2. **The server decides the reward.** The screen renders `award`, which only
 *     ever comes from the response. Nothing here derives coins or XP from the
 *     score.
 *
 *  3. **Offline runs stay honest.** A failed submission is held, not discarded,
 *     and reported as unconfirmed — the player is told the result is waiting,
 *     rather than being shown a reward that was never granted.
 */
export const useGameSession = (gameKey: string) => {
  const [state, setState] = useState<SessionState>({
    status: "idle",
    award: null,
    error: null,
    offline: false,
  });

  /** Runs already accepted by the server; never resubmitted. */
  const settled = useRef<Set<string>>(new Set());
  /** The run awaiting a retry, if any. */
  const pending = useRef<{ id: string; score: number } | null>(null);
  const inFlight = useRef(false);

  const send = useCallback(
    async (sessionId: string, score: number) => {
      if (settled.current.has(sessionId) || inFlight.current) return;

      inFlight.current = true;
      setState((prev) => ({ ...prev, status: "sending", error: null }));

      try {
        const award = await gameApi.submitScore(gameKey, score);
        settled.current.add(sessionId);
        pending.current = null;
        setState({ status: "confirmed", award, error: null, offline: false });
      } catch (err) {
        // Held rather than dropped — `retry` can pick it up.
        pending.current = { id: sessionId, score };
        setState({
          status: "failed",
          award: null,
          error: err instanceof Error ? err.message : "Could not save your score",
          offline: err instanceof ApiError ? err.isNetworkError : false,
        });
      } finally {
        inFlight.current = false;
      }
    },
    [gameKey]
  );

  /** Call once when a run ends. `result.score` is the run's own score. */
  const submit = useCallback(
    (sessionId: string, result: GameResult) => {
      const score = Math.max(0, Math.round(result.score));
      void send(sessionId, score);
    },
    [send]
  );

  const retry = useCallback(() => {
    const held = pending.current;
    if (held) void send(held.id, held.score);
  }, [send]);

  /** Clears the verdict for a new run. Banked session ids survive. */
  const reset = useCallback(() => {
    pending.current = null;
    setState({ status: "idle", award: null, error: null, offline: false });
  }, []);

  return { ...state, submit, retry, reset, hasPending: pending.current !== null };
};
