import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Button, Input, Screen } from "@/components";
import { useAuth, type AuthMode } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { useToast } from "@/hooks/useToast";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { AuthStackParamList } from "@/types/navigation";

type Props = NativeStackScreenProps<AuthStackParamList, "Login">;

/**
 * Login for both customer and vendor.
 *
 * The web app has separate /login and /vendor/login routes; on mobile a single
 * screen with a role switch avoids an extra navigation step. It posts to the
 * same two endpoints underneath.
 */
export const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const { theme } = useTheme();
  const { login, busy } = useAuth();
  const toast = useToast();

  const [mode, setMode] = useState<AuthMode>("customer");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const validate = () => {
    const next: typeof errors = {};
    if (!email.trim()) next.email = "Email is required";
    else if (!/^\S+@\S+\.\S+$/.test(email.trim())) next.email = "Enter a valid email";
    if (!password) next.password = "Password is required";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = async () => {
    if (!validate()) return;
    try {
      await login(mode, email.trim().toLowerCase(), password);
      // Navigation switches automatically once the role lands in context.
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Login failed");
    }
  };

  return (
    <Screen scroll>
      <View style={styles.header}>
        <Text style={[styles.brand, { color: theme.colors.primary }]}>NearBitez</Text>
        <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>
          Sign in to continue
        </Text>
      </View>

      {/* Role switch — segmented control is the native-feeling pattern here. */}
      <View
        style={[
          styles.segment,
          { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
        ]}
      >
        {(["customer", "vendor"] as AuthMode[]).map((option) => {
          const active = mode === option;
          return (
            <Pressable
              key={option}
              onPress={() => setMode(option)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              style={[
                styles.segmentItem,
                active && {
                  backgroundColor: theme.colors.card,
                  borderRadius: theme.radius.sm,
                  ...theme.elevation.sm,
                },
              ]}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "700",
                  color: active ? theme.colors.primaryText : theme.colors.textMuted,
                }}
              >
                {option === "customer" ? "I'm ordering" : "I own a restaurant"}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.form}>
        <Input
          label="Email"
          value={email}
          onChangeText={(v) => {
            setEmail(v);
            if (errors.email) setErrors((e) => ({ ...e, email: undefined }));
          }}
          error={errors.email}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
          placeholder="you@example.com"
        />

        <Input
          label="Password"
          value={password}
          onChangeText={(v) => {
            setPassword(v);
            if (errors.password) setErrors((e) => ({ ...e, password: undefined }));
          }}
          error={errors.password}
          revealable
          secureTextEntry
          autoCapitalize="none"
          textContentType="password"
          placeholder="Your password"
          containerStyle={{ marginTop: theme.spacing.lg }}
          onSubmitEditing={onSubmit}
          returnKeyType="go"
        />

        <Button
          label="Sign in"
          onPress={onSubmit}
          loading={busy}
          fullWidth
          size="lg"
          style={{ marginTop: theme.spacing.xl }}
        />

        <Pressable
          onPress={() => navigation.navigate("Register", { mode })}
          style={styles.footerLink}
          hitSlop={8}
        >
          <Text style={{ color: theme.colors.textMuted, fontSize: 14 }}>
            New here?{" "}
            <Text style={{ color: theme.colors.primaryText, fontWeight: "700" }}>
              Create an account
            </Text>
          </Text>
        </Pressable>
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  header: { alignItems: "center", marginTop: 40, marginBottom: 28 },
  brand: { fontSize: 32, fontWeight: "800", letterSpacing: -0.5 },
  subtitle: { fontSize: 15, marginTop: 6 },
  segment: { flexDirection: "row", borderRadius: 10, borderWidth: 1, padding: 4 },
  segmentItem: { flex: 1, alignItems: "center", paddingVertical: 10 },
  form: { marginTop: 24 },
  footerLink: { alignItems: "center", marginTop: 20, paddingVertical: 8 },
});
