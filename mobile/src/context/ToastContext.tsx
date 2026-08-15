import React, { createContext, useCallback, useMemo, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { FadeInUp, FadeOutUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/hooks/useTheme";

export type ToastTone = "success" | "error" | "info";

interface ToastState {
  message: string;
  tone: ToastTone;
}

interface ToastContextValue {
  show: (message: string, tone?: ToastTone) => void;
  success: (message: string) => void;
  error: (message: string) => void;
}

export const ToastContext = createContext<ToastContextValue>({
  show: () => {},
  success: () => {},
  error: () => {},
});

const DURATION_MS = 3000;

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const show = useCallback((message: string, tone: ToastTone = "info") => {
    if (timer.current) clearTimeout(timer.current);
    setToast({ message, tone });
    timer.current = setTimeout(() => setToast(null), DURATION_MS);
  }, []);

  const value = useMemo<ToastContextValue>(
    () => ({
      show,
      success: (message: string) => show(message, "success"),
      error: (message: string) => show(message, "error"),
    }),
    [show]
  );

  const toneColor =
    toast?.tone === "success"
      ? theme.colors.success
      : toast?.tone === "error"
      ? theme.colors.error
      : theme.colors.info;

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast ? (
        <Animated.View
          entering={FadeInUp.duration(200)}
          exiting={FadeOutUp.duration(160)}
          pointerEvents="none"
          style={[
            styles.wrapper,
            {
              top: insets.top + theme.spacing.sm,
              backgroundColor: theme.colors.raised,
              borderColor: theme.colors.border,
              borderLeftColor: toneColor,
              ...theme.elevation.md,
            },
          ]}
        >
          <Text style={[styles.text, { color: theme.colors.text }]} numberOfLines={3}>
            {toast.message}
          </Text>
        </Animated.View>
      ) : null}
    </ToastContext.Provider>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 999,
    borderRadius: 12,
    borderWidth: 1,
    borderLeftWidth: 4,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  text: { fontSize: 14, fontWeight: "500" },
});
