import React from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type RefreshControlProps,
  type ViewStyle,
} from "react-native";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";
import { useTheme } from "@/hooks/useTheme";

interface ScreenProps {
  children: React.ReactNode;
  /** Wraps content in a ScrollView. Off for screens with their own FlatList. */
  scroll?: boolean;
  padded?: boolean;
  edges?: Edge[];
  style?: ViewStyle;
  /**
   * Typed against RefreshControlProps rather than a bare ReactElement:
   * React 19 changed ReactElement's default props type from `any` to
   * `unknown`, which no longer satisfies ScrollView's prop.
   */
  refreshControl?: React.ReactElement<RefreshControlProps>;
}

/**
 * Screen shell.
 *
 * Handles the three things every mobile screen must get right: safe-area
 * insets (notches, home indicator), keyboard avoidance, and the themed
 * background. Screens compose this instead of repeating the boilerplate.
 */
export const Screen: React.FC<ScreenProps> = ({
  children,
  scroll = false,
  padded = true,
  edges = ["top", "bottom"],
  style,
  refreshControl,
}) => {
  const { theme } = useTheme();

  const content = padded ? (
    <View style={[styles.padded, style]}>{children}</View>
  ) : (
    <View style={[styles.flex, style]}>{children}</View>
  );

  return (
    <SafeAreaView
      edges={edges}
      style={[styles.flex, { backgroundColor: theme.colors.background }]}
    >
      <KeyboardAvoidingView
        style={styles.flex}
        // iOS needs padding; Android's windowSoftInputMode already resizes.
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {scroll ? (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            refreshControl={refreshControl}
          >
            {content}
          </ScrollView>
        ) : (
          content
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  padded: { flex: 1, padding: 16 },
  scrollContent: { flexGrow: 1 },
});
