import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Badge, Card, Screen } from "@/components";
import { useTheme } from "@/hooks/useTheme";

/**
 * Migration placeholder.
 *
 * Every navigation destination exists from day one so the shell is walkable
 * end to end, and screens can be swapped in one at a time without touching
 * the navigators. Each placeholder names the web file it will replace.
 */
export const Placeholder: React.FC<{
  title: string;
  /** Path of the web component this screen will replace. */
  source?: string;
  note?: string;
}> = ({ title, source, note }) => {
  const { theme } = useTheme();

  return (
    <Screen>
      <View style={styles.center}>
        <Badge label="Not migrated yet" tone="warning" />
        <Text style={[styles.title, { color: theme.colors.text }]}>{title}</Text>
        {note ? (
          <Text style={[styles.note, { color: theme.colors.textMuted }]}>{note}</Text>
        ) : null}

        {source ? (
          <Card style={styles.card}>
            <Text style={[styles.label, { color: theme.colors.textFaint }]}>
              PORT FROM
            </Text>
            <Text style={[styles.source, { color: theme.colors.primaryText }]}>
              {source}
            </Text>
          </Card>
        ) : null}
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  title: { fontSize: 20, fontWeight: "700", textAlign: "center" },
  note: { fontSize: 14, textAlign: "center", maxWidth: 300, lineHeight: 20 },
  card: { marginTop: 12, minWidth: 260 },
  label: { fontSize: 10, fontWeight: "700", letterSpacing: 1 },
  source: { fontSize: 13, fontWeight: "600", marginTop: 4 },
});
