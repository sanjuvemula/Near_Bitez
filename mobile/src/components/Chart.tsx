import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "@/hooks/useTheme";

/**
 * The two chart forms the admin app needs, and deliberately no more.
 *
 * Both are single-series magnitude plots drawn in one hue. Orders and revenue
 * are never plotted together on two y-scales — the caller passes both series
 * and the viewer toggles, which keeps one axis and one meaning per view.
 */

const compact = (value: number): string => {
  if (Math.abs(value) >= 10000000) return `${(value / 10000000).toFixed(1)}Cr`;
  if (Math.abs(value) >= 100000) return `${(value / 100000).toFixed(1)}L`;
  if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(1)}k`;
  return String(Math.round(value));
};

export interface TrendSeries {
  label: string;
  points: number[];
  /** Prefixed to the peak label, e.g. "₹". */
  prefix?: string;
}

/**
 * Vertical bars over a short time range.
 *
 * Only the peak bar is labelled — a number over every bar is noise at this
 * width. Empty periods still occupy their slot so the time axis stays even.
 */
export const TrendBars: React.FC<{
  series: TrendSeries[];
  labels: string[];
  height?: number;
}> = ({ series, labels, height = 120 }) => {
  const { theme } = useTheme();
  const [active, setActive] = useState(0);

  const current = series[active] ?? series[0];
  const max = useMemo(
    () => Math.max(1, ...(current?.points ?? [0])),
    [current]
  );
  const peakIndex = useMemo(
    () => (current?.points ?? []).indexOf(max),
    [current, max]
  );

  if (!current) return null;

  return (
    <View>
      {series.length > 1 ? (
        <View style={styles.toggleRow}>
          {series.map((item, index) => {
            const on = index === active;
            return (
              <Pressable
                key={item.label}
                onPress={() => setActive(index)}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                style={[
                  styles.toggle,
                  {
                    backgroundColor: on ? theme.colors.primarySoft : "transparent",
                    borderColor: on ? theme.colors.primary : theme.colors.border,
                    borderRadius: theme.radius.pill,
                  },
                ]}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "700",
                    color: on ? theme.colors.primaryText : theme.colors.textMuted,
                  }}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      <View style={[styles.plot, { height }]}>
        {current.points.map((value, index) => {
          // A zero-value period still shows a hairline so the gap reads as
          // "no activity" rather than a rendering fault.
          const ratio = max > 0 ? value / max : 0;
          const barHeight = Math.max(2, ratio * (height - 22));
          const isPeak = index === peakIndex && value > 0;

          return (
            <View key={`${labels[index] ?? index}`} style={styles.column}>
              {isPeak ? (
                <Text style={[styles.peak, { color: theme.colors.textMuted }]}>
                  {current.prefix ?? ""}
                  {compact(value)}
                </Text>
              ) : (
                <View style={styles.peakSpacer} />
              )}
              <View
                style={{
                  width: "62%",
                  height: barHeight,
                  backgroundColor: value > 0 ? theme.colors.primary : theme.colors.border,
                  // Rounded data-end only; the baseline end stays square.
                  borderTopLeftRadius: 4,
                  borderTopRightRadius: 4,
                  opacity: value > 0 ? (isPeak ? 1 : 0.75) : 1,
                }}
              />
            </View>
          );
        })}
      </View>

      <View style={[styles.axis, { borderTopColor: theme.colors.border }]}>
        {labels.map((label, index) => (
          <Text
            key={`${label}-${index}`}
            numberOfLines={1}
            style={[styles.axisLabel, { color: theme.colors.textFaint }]}
          >
            {label}
          </Text>
        ))}
      </View>
    </View>
  );
};

/**
 * A labelled horizontal magnitude bar.
 *
 * Used for status breakdowns and plan distribution, where the row label already
 * carries identity — so the bar stays one hue and never encodes category by
 * colour alone. `tone` is for genuine state (paid, overdue), not for variety.
 */
export const MeterRow: React.FC<{
  label: string;
  value: number;
  total: number;
  caption?: string;
  tone?: string;
}> = ({ label, value, total, caption, tone }) => {
  const { theme } = useTheme();
  const percent = total > 0 ? Math.min(100, (value / total) * 100) : 0;

  return (
    <View style={styles.meter}>
      <View style={styles.meterHead}>
        <Text numberOfLines={1} style={[styles.meterLabel, { color: theme.colors.text }]}>
          {label}
        </Text>
        <Text style={[styles.meterValue, { color: theme.colors.textMuted }]}>
          {caption ?? value}
        </Text>
      </View>
      <View
        style={[
          styles.track,
          { backgroundColor: theme.colors.border, borderRadius: theme.radius.pill },
        ]}
      >
        <View
          style={{
            width: `${percent}%`,
            height: "100%",
            backgroundColor: tone ?? theme.colors.primary,
            borderRadius: theme.radius.pill,
          }}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  toggleRow: { flexDirection: "row", gap: 8, marginBottom: 14 },
  toggle: { paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1 },
  plot: { flexDirection: "row", alignItems: "flex-end", gap: 6 },
  column: { flex: 1, alignItems: "center", justifyContent: "flex-end" },
  peak: { fontSize: 10, fontWeight: "700", marginBottom: 4 },
  peakSpacer: { height: 18 },
  axis: { flexDirection: "row", gap: 6, borderTopWidth: 1, paddingTop: 6, marginTop: 2 },
  axisLabel: { flex: 1, fontSize: 10, textAlign: "center", fontWeight: "600" },
  meter: { marginBottom: 12 },
  meterHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
    gap: 12,
  },
  meterLabel: { flex: 1, fontSize: 13, fontWeight: "600" },
  meterValue: { fontSize: 13, fontWeight: "700" },
  track: { height: 8, overflow: "hidden" },
});
