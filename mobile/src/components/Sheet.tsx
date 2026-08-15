import React from "react";
import { Modal as RNModal, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, SlideInDown, SlideOutDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/hooks/useTheme";

interface BaseProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

/**
 * Bottom sheet — the default for mobile choices and forms. Slides from the
 * bottom so it stays within thumb reach, and honours the home-indicator inset.
 */
export const BottomSheet: React.FC<BaseProps> = ({
  visible,
  onClose,
  title,
  children,
}) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <RNModal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Animated.View
        entering={FadeIn.duration(160)}
        style={[styles.backdrop, { backgroundColor: theme.colors.overlay }]}
      >
        {/* Tapping outside dismisses, matching platform convention. */}
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <Animated.View
          entering={SlideInDown.duration(240)}
          exiting={SlideOutDown.duration(180)}
          style={[
            styles.sheet,
            {
              backgroundColor: theme.colors.raised,
              borderTopLeftRadius: theme.radius.xl,
              borderTopRightRadius: theme.radius.xl,
              paddingBottom: insets.bottom + theme.spacing.lg,
            },
          ]}
        >
          <View style={[styles.grabber, { backgroundColor: theme.colors.borderStrong }]} />
          {title ? (
            <Text style={[styles.title, { color: theme.colors.text }]}>{title}</Text>
          ) : null}
          {children}
        </Animated.View>
      </Animated.View>
    </RNModal>
  );
};

/** Centred modal, for confirmations that must interrupt. */
export const Modal: React.FC<BaseProps> = ({ visible, onClose, title, children }) => {
  const { theme } = useTheme();

  return (
    <RNModal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={[styles.backdrop, styles.centered, { backgroundColor: theme.colors.overlay }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View
          style={[
            styles.dialog,
            {
              backgroundColor: theme.colors.raised,
              borderRadius: theme.radius.lg,
              ...theme.elevation.md,
            },
          ]}
        >
          {title ? (
            <Text style={[styles.title, { color: theme.colors.text }]}>{title}</Text>
          ) : null}
          {children}
        </View>
      </View>
    </RNModal>
  );
};

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: "flex-end" },
  centered: { justifyContent: "center", alignItems: "center", padding: 24 },
  sheet: { width: "100%", paddingHorizontal: 20, paddingTop: 10 },
  dialog: { width: "100%", maxWidth: 400, padding: 20 },
  grabber: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 14,
  },
  title: { fontSize: 17, fontWeight: "700", marginBottom: 14 },
});
