import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useTheme } from "@/hooks/useTheme";

/**
 * Filter and confirmation primitives shared by every admin list.
 *
 * Admin screens sit over large collections, so filters live in one scrolling
 * row above the list rather than behind a menu — the active filter is always
 * visible, which matters when a query is the reason a list looks empty.
 */

export interface ChipOption {
  label: string;
  value: string;
  /** Rendered after the label, e.g. a count. */
  badge?: number;
}

export const FilterChips: React.FC<{
  options: ChipOption[];
  value: string;
  onChange: (value: string) => void;
}> = ({ options, value, onChange }) => {
  const { theme } = useTheme();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      keyboardShouldPersistTaps="handled"
    >
      {options.map((option) => {
        const on = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            style={[
              styles.chip,
              {
                backgroundColor: on ? theme.colors.primary : theme.colors.card,
                borderColor: on ? theme.colors.primary : theme.colors.border,
                borderRadius: theme.radius.pill,
              },
            ]}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: "600",
                color: on ? theme.colors.onPrimary : theme.colors.textMuted,
              }}
            >
              {option.label}
              {option.badge !== undefined && option.badge > 0 ? ` · ${option.badge}` : ""}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
};

/** Label/value pair for detail screens. */
export const DetailRow: React.FC<{
  label: string;
  value?: string | number | null;
  tone?: string;
}> = ({ label, value, tone }) => {
  const { theme } = useTheme();

  return (
    <View style={[styles.detail, { borderBottomColor: theme.colors.border }]}>
      <Text style={[styles.detailLabel, { color: theme.colors.textMuted }]}>{label}</Text>
      <Text
        style={[styles.detailValue, { color: tone ?? theme.colors.text }]}
        numberOfLines={2}
      >
        {value === undefined || value === null || value === "" ? "—" : String(value)}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  row: { gap: 8, paddingHorizontal: 16, paddingVertical: 10 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1 },
  detail: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 16,
  },
  detailLabel: { fontSize: 13, fontWeight: "500", flexShrink: 0 },
  detailValue: { fontSize: 14, fontWeight: "600", flex: 1, textAlign: "right" },
});
