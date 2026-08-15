import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Button, Input, Screen } from "@/components";
import { useAuth, type AuthMode } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { useToast } from "@/hooks/useToast";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { AuthStackParamList } from "@/types/navigation";

type Props = NativeStackScreenProps<AuthStackParamList, "Register">;

export const RegisterScreen: React.FC<Props> = ({ navigation, route }) => {
  const { theme } = useTheme();
  const { register, busy } = useAuth();
  const toast = useToast();

  const mode: AuthMode = route.params?.mode === "vendor" ? "vendor" : "customer";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});

  const validate = () => {
    const next: Record<string, string | undefined> = {};
    if (!name.trim()) next.name = "Name is required";
    if (!email.trim()) next.email = "Email is required";
    else if (!/^\S+@\S+\.\S+$/.test(email.trim())) next.email = "Enter a valid email";
    if (!password) next.password = "Password is required";
    else if (password.length < 6) next.password = "Use at least 6 characters";
    setErrors(next);
    return Object.values(next).every((v) => !v);
  };

  const onSubmit = async () => {
    if (!validate()) return;
    try {
      await register(mode, {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        phone: phone.trim() || undefined,
      });
      toast.success("Account created");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create account");
    }
  };

  return (
    <Screen scroll>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.text }]}>
          {mode === "vendor" ? "Register your restaurant" : "Create your account"}
        </Text>
        <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>
          {mode === "vendor"
            ? "Start taking orders on NearBitez"
            : "Order from restaurants near you"}
        </Text>
      </View>

      <Input
        label={mode === "vendor" ? "Owner name" : "Full name"}
        value={name}
        onChangeText={setName}
        error={errors.name}
        autoCapitalize="words"
        textContentType="name"
        placeholder="Your name"
      />

      <Input
        label="Email"
        value={email}
        onChangeText={setEmail}
        error={errors.email}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        placeholder="you@example.com"
        containerStyle={{ marginTop: theme.spacing.lg }}
      />

      <Input
        label="Phone"
        hint="Optional"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        placeholder="10-digit number"
        containerStyle={{ marginTop: theme.spacing.lg }}
      />

      <Input
        label="Password"
        value={password}
        onChangeText={setPassword}
        error={errors.password}
        hint="At least 6 characters"
        revealable
        secureTextEntry
        autoCapitalize="none"
        placeholder="Create a password"
        containerStyle={{ marginTop: theme.spacing.lg }}
      />

      <Button
        label="Create account"
        onPress={onSubmit}
        loading={busy}
        fullWidth
        size="lg"
        style={{ marginTop: theme.spacing.xl }}
      />

      <Pressable onPress={() => navigation.goBack()} style={styles.footerLink} hitSlop={8}>
        <Text style={{ color: theme.colors.textMuted, fontSize: 14 }}>
          Already have an account?{" "}
          <Text style={{ color: theme.colors.primaryText, fontWeight: "700" }}>
            Sign in
          </Text>
        </Text>
      </Pressable>
    </Screen>
  );
};

const styles = StyleSheet.create({
  header: { marginTop: 24, marginBottom: 24 },
  title: { fontSize: 24, fontWeight: "700" },
  subtitle: { fontSize: 15, marginTop: 6 },
  footerLink: { alignItems: "center", marginTop: 20, paddingVertical: 8 },
});
