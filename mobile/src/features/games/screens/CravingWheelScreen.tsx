import React, { useCallback, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useNavigation } from "@react-navigation/native";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Badge, Card, EmptyState, ErrorState, Loading, Screen } from "@/components";
import { gameApi } from "@/services/api";
import { useApi } from "@/hooks/useApi";
import { useTheme } from "@/hooks/useTheme";
import { useHaptics } from "@/features/games/hooks/useHaptics";
import type { WheelSegment } from "@/features/games/utils/types";
import type { CustomerStackParamList } from "@/types/navigation";

type Nav = NativeStackNavigationProp<CustomerStackParamList>;

const SPIN_MS = 3200;
/** Full turns before settling, so the wheel reads as a spin not a nudge. */
const TURNS = 5;

/**
 * Craving Wheel.
 *
 * Segments are live restaurants from `/games/wheel-segments` — the endpoint
 * returns the eight highest-rated open restaurants, so nothing here is
 * hardcoded and an inactive restaurant can never be landed on.
 *
 * The wheel picks a suggestion, not a prize: no coins, XP or coupon depends on
 * where it stops, so choosing the winner on the device grants nothing and there
 * is nothing to forge.
 *
 * Rendered as labelled spokes rather than filled pie wedges. React Native has no
 * conic gradient, and the usual workaround — rotated rectangles clipped by a
 * round parent — leaves visible seams at the rim.
 */
export const CravingWheelScreen: React.FC = () => {
  const { theme } = useTheme();
  const navigation = useNavigation<Nav>();
  const haptics = useHaptics();
  const { width } = useWindowDimensions();

  const { data, loading, error, refetch } = useApi(() => gameApi.wheelSegments(), []);

  const [winner, setWinner] = useState<WheelSegment | null>(null);
  const [spinning, setSpinning] = useState(false);
  const rotation = useSharedValue(0);
  /** Total turns so far, so each spin continues forward instead of rewinding. */
  const travelled = useRef(0);

  const segments = data ?? [];
  const size = useMemo(() => Math.min(width - 56, 320), [width]);
  const step = segments.length ? 360 / segments.length : 0;

  const settle = useCallback(
    (index: number) => {
      setSpinning(false);
      setWinner(segments[index] ?? null);
      haptics.success();
    },
    [haptics, segments]
  );

  const spin = useCallback(() => {
    if (spinning || !segments.length) return;

    setSpinning(true);
    setWinner(null);
    haptics.light();

    const index = Math.floor(Math.random() * segments.length);
    // The pointer sits at the top, so the chosen segment's centre must finish
    // there: negative rotation brings segment `index` up to 0°.
    const target = travelled.current + TURNS * 360 + (360 - index * step - step / 2);
    travelled.current = target;

    rotation.value = withTiming(
      target,
      { duration: SPIN_MS, easing: Easing.bezier(0.15, 0.9, 0.2, 1) },
      (done) => {
        if (done) runOnJS(settle)(index);
      }
    );
  }, [haptics, rotation, segments.length, settle, spinning, step]);

  const wheelStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  if (loading && !data) return <Loading label="Finding open restaurants…" />;
  if (error && !data) return <ErrorState title="Couldn't load" message={error} onAction={refetch} />;
  if (!segments.length) {
    return (
      <EmptyState
        title="Nothing open right now"
        message="The wheel needs open restaurants to spin. Try again a little later."
        actionLabel="Refresh"
        onAction={refetch}
      />
    );
  }

  return (
    <Screen scroll>
      <Text style={{ color: theme.colors.textMuted, fontSize: 14, textAlign: "center", lineHeight: 20 }}>
        Can't decide? Spin for one of {segments.length} restaurants open near you.
      </Text>

      <View style={styles.stage}>
        {/* Pointer, fixed at the top. */}
        <View style={[styles.pointer, { borderTopColor: theme.colors.primary }]} />

        <Animated.View
          style={[
            styles.wheel,
            wheelStyle,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: theme.colors.card,
              borderColor: theme.colors.borderStrong,
            },
          ]}
        >
          {segments.map((segment, index) => (
            <View
              key={segment.id}
              style={[
                styles.spoke,
                {
                  height: size,
                  transform: [{ rotate: `${index * step + step / 2}deg` }],
                },
              ]}
            >
              <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
              <Text
                numberOfLines={1}
                style={[styles.spokeLabel, { color: theme.colors.text, maxWidth: size * 0.36 }]}
              >
                {segment.label}
              </Text>
            </View>
          ))}

          <View
            style={[
              styles.hub,
              { backgroundColor: theme.colors.primary, borderColor: theme.colors.card },
            ]}
          >
            <Text style={{ color: theme.colors.onPrimary, fontWeight: "800", fontSize: 11 }}>
              NB
            </Text>
          </View>
        </Animated.View>
      </View>

      <Pressable
        onPress={spin}
        disabled={spinning}
        accessibilityRole="button"
        style={({ pressed }) => [
          styles.spinButton,
          {
            backgroundColor: spinning ? theme.colors.border : theme.colors.primary,
            borderRadius: theme.radius.md,
            opacity: pressed ? 0.85 : 1,
          },
        ]}
      >
        <Text
          style={{
            color: spinning ? theme.colors.textFaint : theme.colors.onPrimary,
            fontWeight: "800",
            fontSize: 16,
          }}
        >
          {spinning ? "Spinning…" : "Spin the wheel"}
        </Text>
      </Pressable>

      {winner ? (
        <Card
          style={{ marginTop: 20 }}
          onPress={() =>
            navigation.navigate("RestaurantDetail", { restaurantId: winner.restaurantId })
          }
        >
          <Text style={{ color: theme.colors.textMuted, fontSize: 11, fontWeight: "800", letterSpacing: 0.7 }}>
            TONIGHT YOU'RE EATING
          </Text>
          <Text style={{ color: theme.colors.text, fontSize: 20, fontWeight: "800", marginTop: 6 }}>
            {winner.label}
          </Text>
          <View style={styles.winnerMeta}>
            <Badge label={winner.category} tone="info" />
            {winner.rating ? <Badge label={`★ ${winner.rating.toFixed(1)}`} tone="warning" /> : null}
            <Badge label={`${winner.deliveryTime} min`} tone="neutral" />
          </View>
          <Text style={{ color: theme.colors.primary, fontWeight: "700", fontSize: 13, marginTop: 12 }}>
            See the menu →
          </Text>
        </Card>
      ) : null}
    </Screen>
  );
};

const styles = StyleSheet.create({
  stage: { alignItems: "center", justifyContent: "center", marginTop: 24 },
  pointer: {
    position: "absolute",
    top: -4,
    zIndex: 10,
    width: 0,
    height: 0,
    borderLeftWidth: 11,
    borderRightWidth: 11,
    borderTopWidth: 20,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
  },
  wheel: { borderWidth: 3, alignItems: "center", justifyContent: "center" },
  spoke: { position: "absolute", alignItems: "center", justifyContent: "flex-start", paddingTop: 16 },
  divider: { position: "absolute", top: 0, width: 1, height: "50%", opacity: 0.9 },
  spokeLabel: { fontSize: 11, fontWeight: "700", textAlign: "center" },
  hub: { width: 46, height: 46, borderRadius: 23, borderWidth: 4, alignItems: "center", justifyContent: "center" },
  spinButton: { alignItems: "center", paddingVertical: 16, marginTop: 30 },
  winnerMeta: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10 },
});
