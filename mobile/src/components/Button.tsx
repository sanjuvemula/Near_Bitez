import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { HIT_SLOP_MIN } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const HEIGHTS: Record<ButtonSize, number> = {
  sm: HIT_SLOP_MIN,
  md: 48,
  lg: 54,
};

export const Button: React.FC<ButtonProps> = ({
  label,
  onPress,
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  fullWidth = false,
  icon,
  style,
}) => {
  const { theme } = useTheme();
  const scale = useSharedValue(1);

  const inactive = disabled || loading;

  // Native-feeling press feedback; cheap enough to run on every button.
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const palette: Record<ButtonVariant, { bg: string; fg: string; border: string }> = {
    primary: {
      bg: theme.colors.primary,
      fg: theme.colors.onPrimary,
      border: "transparent",
    },
    secondary: {
      bg: theme.colors.card,
      fg: theme.colors.text,
      border: theme.colors.borderStrong,
    },
    ghost: { bg: "transparent", fg: theme.colors.primaryText, border: "transparent" },
    danger: { bg: theme.colors.error, fg: "#ffffff", border: "transparent" },
  };

  const tone = palette[variant];

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      onPressIn={() => {
        scale.value = withTiming(0.97, { duration: 90 });
      }}
      onPressOut={() => {
        scale.value = withTiming(1, { duration: 120 });
      }}
      style={[
        styles.base,
        animatedStyle,
        {
          height: HEIGHTS[size],
          backgroundColor: tone.bg,
          borderColor: tone.border,
          borderRadius: theme.radius.md,
          opacity: inactive ? 0.55 : 1,
          alignSelf: fullWidth ? "stretch" : "flex-start",
          paddingHorizontal: size === "sm" ? theme.spacing.lg : theme.spacing.xl,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={tone.fg} />
      ) : (
        <View style={styles.content}>
          {icon ? <View style={styles.icon}>{icon}</View> : null}
          <Text
            numberOfLines={1}
            style={[
              styles.label,
              { color: tone.fg, fontSize: size === "sm" ? 14 : 15 },
            ]}
          >
            {label}
          </Text>
        </View>
      )}
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  content: { flexDirection: "row", alignItems: "center" },
  icon: { marginRight: 8 },
  label: { fontWeight: "700", letterSpacing: 0.2 },
});
