import React from "react";
import { ActivityIndicator, StyleSheet, Text, View, type ViewStyle } from "react-native";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";

/**
 * The four states every data-driven screen needs. Centralised so screens stay
 * consistent and nobody re-invents a spinner or an empty message.
 */

export const Loading: React.FC<{ label?: string; style?: ViewStyle }> = ({
  label,
  style,
}) => {
  const { theme } = useTheme();
  return (
    <View style={[styles.center, style]}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
      {label ? (
        <Text style={[styles.body, { color: theme.colors.textMuted }]}>{label}</Text>
      ) : null}
    </View>
  );
};

interface StateProps {
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
  style?: ViewStyle;
}

export const EmptyState: React.FC<StateProps> = ({
  title,
  message,
  actionLabel,
  onAction,
  icon,
  style,
}) => {
  const { theme } = useTheme();
  return (
    <View style={[styles.center, style]}>
      {icon ? <View style={styles.icon}>{icon}</View> : null}
      <Text style={[styles.title, { color: theme.colors.text }]}>{title}</Text>
      {message ? (
        <Text style={[styles.body, { color: theme.colors.textMuted }]}>{message}</Text>
      ) : null}
      {actionLabel && onAction ? (
        <Button
          label={actionLabel}
          variant="secondary"
          size="sm"
          onPress={onAction}
          style={{ marginTop: theme.spacing.lg }}
        />
      ) : null}
    </View>
  );
};

/**
 * Error variant. `isNetworkError` swaps in wording the user can act on rather
 * than blaming the app.
 */
export const ErrorState: React.FC<StateProps & { isNetworkError?: boolean }> = ({
  title,
  message,
  actionLabel = "Try again",
  onAction,
  isNetworkError = false,
  style,
}) => {
  const { theme } = useTheme();
  return (
    <View style={[styles.center, style]}>
      <View
        style={[
          styles.badge,
          { backgroundColor: theme.colors.errorSoft, borderRadius: theme.radius.pill },
        ]}
      >
        <Text style={{ color: theme.colors.error, fontSize: 22, fontWeight: "700" }}>
          !
        </Text>
      </View>
      <Text style={[styles.title, { color: theme.colors.text }]}>
        {isNetworkError ? "No connection" : title}
      </Text>
      <Text style={[styles.body, { color: theme.colors.textMuted }]}>
        {isNetworkError
          ? "Check your internet and try again."
          : message ?? "Something went wrong."}
      </Text>
      {onAction ? (
        <Button
          label={actionLabel}
          variant="secondary"
          size="sm"
          onPress={onAction}
          style={{ marginTop: theme.spacing.lg }}
        />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  icon: { marginBottom: 16 },
  badge: {
    width: 52,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: { fontSize: 17, fontWeight: "700", textAlign: "center" },
  body: {
    fontSize: 14,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
    maxWidth: 300,
  },
});
