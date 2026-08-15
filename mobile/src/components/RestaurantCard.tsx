import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "@/hooks/useTheme";
import type { Restaurant } from "@/types/models";

interface Props {
  restaurant: Restaurant;
  onPress: () => void;
  /** Compact renders a narrow tile for horizontal rails on Home. */
  variant?: "full" | "compact";
}

const RestaurantCardBase: React.FC<Props> = ({
  restaurant,
  onPress,
  variant = "full",
}) => {
  const { theme } = useTheme();
  const closed = restaurant.isActive === false;
  const compact = variant === "compact";

  const cuisine = restaurant.cuisineType?.length
    ? restaurant.cuisineType.slice(0, 2).join(" · ")
    : restaurant.category;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={restaurant.name}
      style={({ pressed }) => [
        compact ? styles.compactWrap : styles.fullWrap,
        { opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.99 : 1 }] },
      ]}
    >
      <View
        style={[
          styles.imageWrap,
          {
            height: compact ? 110 : 168,
            borderRadius: theme.radius.lg,
            backgroundColor: theme.colors.surface,
          },
        ]}
      >
        {restaurant.imageUrl ? (
          <Image
            source={{ uri: restaurant.imageUrl }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.fallback}>
            <Text style={{ fontSize: 32 }}>🍴</Text>
          </View>
        )}

        {/* Closed state dims the photo rather than hiding the card, so users
            can still browse the menu. */}
        {closed ? (
          <View style={[styles.closedVeil, { borderRadius: theme.radius.lg }]}>
            <Text style={styles.closedText}>Currently closed</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text
            numberOfLines={1}
            style={[
              styles.name,
              { color: theme.colors.text, fontSize: compact ? 14 : 16 },
            ]}
          >
            {restaurant.name}
          </Text>

          {restaurant.rating ? (
            <View
              style={[
                styles.rating,
                {
                  backgroundColor: theme.colors.successSoft,
                  borderRadius: theme.radius.sm,
                },
              ]}
            >
              <Text style={[styles.ratingText, { color: theme.colors.success }]}>
                ★ {Number(restaurant.rating).toFixed(1)}
              </Text>
            </View>
          ) : null}
        </View>

        <Text
          numberOfLines={1}
          style={[styles.meta, { color: theme.colors.textMuted }]}
        >
          {cuisine}
        </Text>

        <View style={styles.metaRow}>
          {restaurant.deliveryTime ? (
            <Text style={[styles.meta, { color: theme.colors.textMuted }]}>
              {restaurant.deliveryTime} min
            </Text>
          ) : null}
          {typeof restaurant.distanceKm === "number" ? (
            <>
              <Text style={[styles.dot, { color: theme.colors.textFaint }]}>•</Text>
              <Text style={[styles.meta, { color: theme.colors.textMuted }]}>
                {restaurant.distanceKm.toFixed(1)} km
              </Text>
            </>
          ) : null}
          {restaurant.isVegOnly ? (
            <>
              <Text style={[styles.dot, { color: theme.colors.textFaint }]}>•</Text>
              <Text style={[styles.meta, { color: theme.colors.success }]}>Pure veg</Text>
            </>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
};

export const RestaurantCard = React.memo(
  RestaurantCardBase,
  (prev, next) =>
    prev.restaurant._id === next.restaurant._id &&
    prev.restaurant.isActive === next.restaurant.isActive &&
    prev.variant === next.variant
);

const styles = StyleSheet.create({
  fullWrap: { marginBottom: 20 },
  compactWrap: { width: 170, marginRight: 12 },
  imageWrap: { width: "100%", overflow: "hidden" },
  fallback: { flex: 1, alignItems: "center", justifyContent: "center" },
  closedVeil: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  closedText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  body: { paddingTop: 10 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  name: { flex: 1, fontWeight: "700" },
  rating: { paddingHorizontal: 6, paddingVertical: 2 },
  ratingText: { fontSize: 12, fontWeight: "700" },
  meta: { fontSize: 13 },
  metaRow: { flexDirection: "row", alignItems: "center", marginTop: 3, gap: 5 },
  dot: { fontSize: 12 },
});
