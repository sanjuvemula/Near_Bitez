import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "@/services/apiClient";

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  isNetworkError: boolean;
}

/**
 * Runs an API call and tracks the loading / error / empty states every screen
 * needs, so none of them hand-roll it.
 *
 * `refetch` is exposed for pull-to-refresh. Results from a stale call are
 * discarded after unmount to avoid setting state on a dead component.
 */
export const useApi = <T>(
  fetcher: () => Promise<T>,
  deps: unknown[] = [],
  { immediate = true }: { immediate?: boolean } = {}
) => {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: immediate,
    error: null,
    isNetworkError: false,
  });

  const mounted = useRef(true);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const run = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const result = await fetcherRef.current();
      if (!mounted.current) return;
      setState({ data: result, loading: false, error: null, isNetworkError: false });
    } catch (err) {
      if (!mounted.current) return;
      setState({
        data: null,
        loading: false,
        error: err instanceof Error ? err.message : "Something went wrong",
        isNetworkError: err instanceof ApiError ? err.isNetworkError : false,
      });
    }
  }, []);

  useEffect(() => {
    if (immediate) void run();
    // Caller-supplied deps decide when to refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { ...state, refetch: run };
};
