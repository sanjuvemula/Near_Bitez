import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, Layout } from "react-native-reanimated";
import { Badge } from "@/components/Surface";
import { useTheme } from "@/hooks/useTheme";
import { formatCurrency } from "@/utils/format";
import type { MenuItem } from "@/types/models";

interface Props {
  item: MenuItem;
  quantity: number;
  pending?: boolean;
  onAdd: () => void;
  onIncrement: () => void;
  onDecrement: () => void;
}

/**
 * Menu row, reused by the restaurant screen, search results and the home
 * "popular dishes" rail.
 *
 * The add button becomes an inline stepper once the item is in the cart, so
 * quantity changes never require leaving the menu.
 */
const FoodItemCardBase: React.FC<Props> = ({
  item,
  quantity,
  pending = false,
  onAdd,
  onIncrement,
  onDecrement,
}) => {
  const { theme } = useTheme();
  const unavailable = !item.isAvailable;

  return (
    <View
      style={[
        styles.row,
        { borderBottomColor: theme.colors.border, opacity: unavailable ? 0.55 : 1 },
      ]}
    >
      <View style={styles.info}>
        <View style={styles.titleRow}>
          {/* Standard Indian veg/non-veg mark */}
          {typeof item.isVeg === "boolean" ? (
            <View
              style={[
                styles.vegMark,
                { borderColor: item.isVeg ? theme.colors.success : theme.colors.error },
              ]}
            >
              <View
                style={[
                  styles.vegDot,
                  {
                    backgroundColor: item.isVeg
                      ? theme.colors.success
                      : theme.colors.error,
                  },
                ]}
              />
            </View>
          ) : null}
          <Text
            style={[styles.name, { color: theme.colors.text }]}
            numberOfLines={2}
          >
            {item.name}
          </Text>
        </View>

        <Text style={[styles.price, { color: theme.colors.text }]}>
          {formatCurrency(item.price)}
        </Text>

        {item.description ? (
          <Text
            numberOfLines={2}
            style={[styles.description, { color: theme.colors.textMuted }]}
          >
            {item.description}
          </Text>
        ) : null}

        {unavailable ? (
          <View style={styles.badgeRow}>
            <Badge label="Sold out" tone="error" />
          </View>
        ) : null}
      </View>

      <View style={styles.media}>
        {item.imageUrl ? (
          <Image
            source={{ uri: item.imageUrl }}
            style={[styles.image, { borderRadius: theme.radius.md }]}
            resizeMode="cover"
          />
        ) : (
          <View
            style={[
              styles.image,
              styles.imageFallback,
              { backgroundColor: theme.colors.surface, borderRadius: theme.radius.md },
            ]}
          >
            <Text style={{ fontSize: 22 }}>🍽️</Text>
          </View>
        )}

        {!unavailable ? (
          <Animated.View layout={Layout.springify()} style={styles.action}>
            {quantity > 0 ? (
              <Animated.View
                entering={FadeIn.duration(150)}
                style={[
                  styles.stepper,
                  {
                    backgroundColor: theme.colors.primary,
                    borderRadius: theme.radius.sm,
                  },
                ]}
              >
                <Pressable
                  onPress={onDecrement}
                  disabled={pending}
                  hitSlop={6}
                  style={styles.stepperBtn}
                  accessibilityLabel="Decrease quantity"
                >
                  <Text style={[styles.stepperText, { color: theme.colors.onPrimary }]}>
                    −
                  </Text>
                </Pressable>
                <Text style={[styles.qty, { color: theme.colors.onPrimary }]}>
                  {quantity}
                </Text>
                <Pressable
                  onPress={onIncrement}
                  disabled={pending}
                  hitSlop={6}
                  style={styles.stepperBtn}
                  accessibilityLabel="Increase quantity"
                >
                  <Text style={[styles.stepperText, { color: theme.colors.onPrimary }]}>
                    +
                  </Text>
                </Pressable>
              </Animated.View>
            ) : (
              <Pressable
                onPress={onAdd}
                disabled={pending}
                accessibilityRole="button"
                accessibilityLabel={`Add ${item.name}`}
                style={({ pressed }) => [
                  styles.addButton,
                  {
                    backgroundColor: theme.colors.card,
                    borderColor: theme.colors.primary,
                    borderRadius: theme.radius.sm,
                    opacity: pressed || pending ? 0.7 : 1,
                  },
                ]}
              >
                <Text style={[styles.addText, { color: theme.colors.primaryText }]}>
                  ADD
                </Text>
              </Pressable>
            )}
          </Animated.View>
        ) : null}
      </View>
    </View>
  );
};

/** Rows re-render on every cart change otherwise — this list can be long. */
export const FoodItemCard = React.memo(
  FoodItemCardBase,
  (prev, next) =>
    prev.item._id === next.item._id &&
    prev.item.isAvailable === next.item.isAvailable &&
    prev.quantity === next.quantity &&
    prev.pending === next.pending
);

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  info: { flex: 1, paddingRight: 12 },
  titleRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  vegMark: {
    width: 14,
    height: 14,
    borderWidth: 1.5,
    borderRadius: 3,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 3,
  },
  vegDot: { width: 6, height: 6, borderRadius: 3 },
  name: { flex: 1, fontSize: 15, fontWeight: "600", lineHeight: 20 },
  price: { fontSize: 14, fontWeight: "700", marginTop: 6 },
  description: { fontSize: 13, marginTop: 6, lineHeight: 18 },
  badgeRow: { marginTop: 8 },
  media: { width: 104, alignItems: "center" },
  image: { width: 104, height: 88 },
  imageFallback: { alignItems: "center", justifyContent: "center" },
  action: { marginTop: -18 },
  addButton: {
    borderWidth: 1.5,
    paddingHorizontal: 22,
    paddingVertical: 8,
    minWidth: 92,
    alignItems: "center",
  },
  addText: { fontSize: 13, fontWeight: "800", letterSpacing: 0.5 },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    minWidth: 92,
    justifyContent: "space-between",
    paddingHorizontal: 4,
  },
  stepperBtn: { paddingHorizontal: 10, paddingVertical: 8 },
  stepperText: { fontSize: 17, fontWeight: "800" },
  qty: { fontSize: 14, fontWeight: "800" },
});
