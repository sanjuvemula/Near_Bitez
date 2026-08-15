import React from "react";
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from "react-native";
import { useTheme } from "@/hooks/useTheme";

/** Card, Badge, Avatar, ListItem and Header — the shared visual primitives. */

export const Card: React.FC<{
  children: React.ReactNode;
  onPress?: () => void;
  padded?: boolean;
  style?: ViewStyle;
}> = ({ children, onPress, padded = true, style }) => {
  const { theme } = useTheme();

  const body = (
    <View
      style={[
        {
          backgroundColor: theme.colors.card,
          borderColor: theme.colors.border,
          borderRadius: theme.radius.lg,
          borderWidth: 1,
          padding: padded ? theme.spacing.lg : 0,
          ...theme.elevation.sm,
        },
        style,
      ]}
    >
      {children}
    </View>
  );

  if (!onPress) return body;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
    >
      {body}
    </Pressable>
  );
};

export type BadgeTone = "neutral" | "success" | "warning" | "error" | "info" | "primary";

export const Badge: React.FC<{ label: string; tone?: BadgeTone }> = ({
  label,
  tone = "neutral",
}) => {
  const { theme } = useTheme();

  const tones: Record<BadgeTone, { bg: string; fg: string }> = {
    neutral: { bg: theme.colors.surface, fg: theme.colors.textMuted },
    success: { bg: theme.colors.successSoft, fg: theme.colors.success },
    warning: { bg: theme.colors.warningSoft, fg: theme.colors.warning },
    error: { bg: theme.colors.errorSoft, fg: theme.colors.error },
    info: { bg: theme.colors.infoSoft, fg: theme.colors.info },
    primary: { bg: theme.colors.primarySoft, fg: theme.colors.primaryText },
  };

  const palette = tones[tone];

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: palette.bg, borderRadius: theme.radius.sm },
      ]}
    >
      <Text style={[styles.badgeText, { color: palette.fg }]}>{label}</Text>
    </View>
  );
};

export const Avatar: React.FC<{ name?: string; uri?: string; size?: number }> = ({
  name,
  uri,
  size = 40,
}) => {
  const { theme } = useTheme();
  const initial = (name ?? "?").trim().charAt(0).toUpperCase() || "?";

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
      />
    );
  }

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: theme.colors.primary,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text
        style={{
          color: theme.colors.onPrimary,
          fontSize: size * 0.4,
          fontWeight: "700",
        }}
      >
        {initial}
      </Text>
    </View>
  );
};

export const ListItem: React.FC<{
  title: string;
  subtitle?: string;
  left?: React.ReactNode;
  right?: React.ReactNode;
  onPress?: () => void;
}> = ({ title, subtitle, left, right, onPress }) => {
  const { theme } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={onPress ? "button" : undefined}
      style={({ pressed }) => [
        styles.listItem,
        {
          borderBottomColor: theme.colors.border,
          backgroundColor: pressed ? theme.colors.surface : "transparent",
        },
      ]}
    >
      {left ? <View style={styles.listLeft}>{left}</View> : null}
      <View style={styles.listBody}>
        <Text
          numberOfLines={1}
          style={[styles.listTitle, { color: theme.colors.text }]}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text
            numberOfLines={1}
            style={[styles.listSubtitle, { color: theme.colors.textMuted }]}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right ? <View style={styles.listRight}>{right}</View> : null}
    </Pressable>
  );
};

/** In-screen section header. The navigator supplies the real screen header. */
export const Header: React.FC<{
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}> = ({ title, subtitle, action }) => {
  const { theme } = useTheme();

  return (
    <View style={styles.header}>
      <View style={styles.headerText}>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>{title}</Text>
        {subtitle ? (
          <Text style={[styles.headerSubtitle, { color: theme.colors.textMuted }]}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {action}
    </View>
  );
};

const styles = StyleSheet.create({
  badge: { paddingHorizontal: 9, paddingVertical: 4, alignSelf: "flex-start" },
  badgeText: { fontSize: 11, fontWeight: "700", letterSpacing: 0.4 },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: 60,
  },
  listLeft: { marginRight: 12 },
  listBody: { flex: 1 },
  listRight: { marginLeft: 12 },
  listTitle: { fontSize: 15, fontWeight: "600" },
  listSubtitle: { fontSize: 13, marginTop: 2 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerText: { flex: 1 },
  headerTitle: { fontSize: 22, fontWeight: "700" },
  headerSubtitle: { fontSize: 13, marginTop: 2 },
});
