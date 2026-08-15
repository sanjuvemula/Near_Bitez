import React, { useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from "react-native";
import { useTheme } from "@/hooks/useTheme";

interface InputProps extends Omit<TextInputProps, "style"> {
  label?: string;
  error?: string;
  hint?: string;
  containerStyle?: ViewStyle;
  /** Adds a show/hide toggle for password fields. */
  revealable?: boolean;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  hint,
  containerStyle,
  revealable = false,
  secureTextEntry,
  ...props
}) => {
  const { theme } = useTheme();
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(Boolean(secureTextEntry));

  const borderColor = error
    ? theme.colors.error
    : focused
    ? theme.colors.primary
    : theme.colors.border;

  return (
    <View style={[styles.wrapper, containerStyle]}>
      {label ? (
        <Text style={[styles.label, { color: theme.colors.textMuted }]}>{label}</Text>
      ) : null}

      <View
        style={[
          styles.field,
          {
            backgroundColor: theme.colors.card,
            borderColor,
            borderRadius: theme.radius.md,
            // A thicker ring on focus reads better than a colour change alone.
            borderWidth: focused || error ? 2 : 1,
          },
        ]}
      >
        <TextInput
          {...props}
          secureTextEntry={revealable ? hidden : secureTextEntry}
          onFocus={(e) => {
            setFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            props.onBlur?.(e);
          }}
          placeholderTextColor={theme.colors.textFaint}
          style={[styles.input, { color: theme.colors.text }]}
        />

        {revealable ? (
          <Pressable
            onPress={() => setHidden((v) => !v)}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={hidden ? "Show password" : "Hide password"}
          >
            <Text style={[styles.reveal, { color: theme.colors.primaryText }]}>
              {hidden ? "Show" : "Hide"}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {error ? (
        <Text style={[styles.helper, { color: theme.colors.error }]}>{error}</Text>
      ) : hint ? (
        <Text style={[styles.helper, { color: theme.colors.textFaint }]}>{hint}</Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: { width: "100%" },
  label: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  field: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    minHeight: 50,
  },
  input: { flex: 1, fontSize: 15, paddingVertical: 12 },
  reveal: { fontSize: 13, fontWeight: "700", paddingLeft: 10 },
  helper: { fontSize: 12, marginTop: 5, fontWeight: "500" },
});
