import React from "react";
import { Pressable, StyleSheet, Text, View, type ViewStyle } from "react-native";
import { useTheme } from "@/hooks/useTheme";

/**
 * Metric tiles.
 *
 * A single number with a name is a stat tile, not a chart — the dashboard uses
 * these for anything that has no shape worth plotting.
 */

export type StatTone = "default" | "success" | "warning" | "error" | "info";

export const StatTile: React.FC<{
  label: string;
  value: string | number;
  caption?: string;
  tone?: StatTone;
  onPress?: () => void;
  style?: ViewStyle;
}> = ({ label, value, caption, tone = "default", onPress, style }) => {
  const { theme } = useTheme();

  const accents: Record<StatTone, string> = {
    default: theme.colors.textMuted,
    success: theme.colors.success,
    warning: theme.colors.warning,
    error: theme.colors.error,
    info: theme.colors.info,
  };

  const body = (
    <View
      style={[
        styles.tile,
        {
          backgroundColor: theme.colors.card,
          borderColor: theme.colors.border,
          borderRadius: theme.radius.lg,
        },
        style,
      ]}
    >
      <Text numberOfLines={1} style={[styles.label, { color: theme.colors.textMuted }]}>
        {label}
      </Text>
      <Text numberOfLines={1} style={[styles.value, { color: theme.colors.text }]}>
        {value}
      </Text>
      {caption ? (
        <Text numberOfLines={1} style={[styles.caption, { color: accents[tone] }]}>
          {caption}
        </Text>
      ) : null}
    </View>
  );

  if (!onPress) return body;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [{ flex: 1 }, { opacity: pressed ? 0.85 : 1 }]}
    >
      {body}
    </Pressable>
  );
};

/** Two-up grid; tiles wrap so a tablet gets more per row automatically. */
export const StatGrid: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <View style={styles.grid}>{children}</View>
);

/**
 * A titled block with optional trailing action.
 *
 * Every dashboard section uses this so headings stay visually identical.
 */
export const Section: React.FC<{
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  style?: ViewStyle;
}> = ({ title, action, children, style }) => {
  const { theme } = useTheme();

  return (
    <View style={[styles.section, style]}>
      <View style={styles.sectionHead}>
        <Text style={[styles.sectionTitle, { color: theme.colors.textMuted }]}>
          {title.toUpperCase()}
        </Text>
        {action}
      </View>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  tile: {
    flex: 1,
    minWidth: 150,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  label: { fontSize: 11, fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase" },
  value: { fontSize: 24, fontWeight: "800", marginTop: 6, letterSpacing: -0.5 },
  caption: { fontSize: 12, fontWeight: "600", marginTop: 3 },
  section: { marginTop: 24 },
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 11, fontWeight: "800", letterSpacing: 0.8 },
});
