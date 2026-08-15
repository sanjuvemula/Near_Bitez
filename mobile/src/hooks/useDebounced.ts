import { useEffect, useState } from "react";

/**
 * Delays a fast-changing value. Used to keep search from firing a request on
 * every keystroke.
 */
export const useDebounced = <T,>(value: T, delay = 350): T => {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
};
