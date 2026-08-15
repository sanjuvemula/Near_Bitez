import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useColorScheme } from "react-native";
import { STORAGE_KEYS } from "@/constants/config";
import { buildTheme, type Theme, type ThemeMode } from "@/constants/theme";
import { readJson, saveJson } from "@/services/storage";

type Preference = ThemeMode | "system";

interface ThemeContextValue {
  theme: Theme;
  mode: ThemeMode;
  preference: Preference;
  isDark: boolean;
  setPreference: (next: Preference) => void;
  toggleTheme: () => void;
}

export const ThemeContext = createContext<ThemeContextValue>({
  theme: buildTheme("light"),
  mode: "light",
  preference: "system",
  isDark: false,
  setPreference: () => {},
  toggleTheme: () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const systemScheme = useColorScheme();
  const [preference, setPreferenceState] = useState<Preference>("system");

  // Restore the saved choice on launch; "system" until it loads.
  useEffect(() => {
    let active = true;
    readJson<Preference>(STORAGE_KEYS.theme).then((stored) => {
      if (active && stored) setPreferenceState(stored);
    });
    return () => {
      active = false;
    };
  }, []);

  const mode: ThemeMode =
    preference === "system" ? (systemScheme === "dark" ? "dark" : "light") : preference;

  const setPreference = useCallback((next: Preference) => {
    setPreferenceState(next);
    void saveJson(STORAGE_KEYS.theme, next);
  }, []);

  const toggleTheme = useCallback(() => {
    setPreferenceState((current) => {
      const resolved =
        current === "system" ? (systemScheme === "dark" ? "dark" : "light") : current;
      const next: Preference = resolved === "dark" ? "light" : "dark";
      void saveJson(STORAGE_KEYS.theme, next);
      return next;
    });
  }, [systemScheme]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme: buildTheme(mode),
      mode,
      preference,
      isDark: mode === "dark",
      setPreference,
      toggleTheme,
    }),
    [mode, preference, setPreference, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};
