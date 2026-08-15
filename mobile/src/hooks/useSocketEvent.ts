import { useEffect, useRef } from "react";
import { connectSocket, getSocket } from "@/services/socket";

/**
 * Subscribe a screen to one socket event.
 *
 * Uses the app's single shared connection — screens never open their own. The
 * handler is held in a ref so re-renders don't churn the listener, and the
 * subscription is removed on unmount.
 */
export const useSocketEvent = <T = unknown>(
  event: string,
  handler: (payload: T) => void,
  enabled = true
): void => {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!enabled) return;

    let active = true;
    let bound: ((payload: T) => void) | null = null;

    const subscribe = async () => {
      const socket = getSocket() ?? (await connectSocket());
      if (!active) return;

      bound = (payload: T) => handlerRef.current(payload);
      socket.on(event, bound);
    };

    void subscribe();

    return () => {
      active = false;
      if (bound) getSocket()?.off(event, bound);
    };
  }, [enabled, event]);
};
