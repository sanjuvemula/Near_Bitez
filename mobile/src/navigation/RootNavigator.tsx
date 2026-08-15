import React, { useMemo } from "react";
import {
  DarkTheme,
  DefaultTheme,
  NavigationContainer,
  type Theme as NavTheme,
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import { Loading } from "@/components";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import {
  AdminStack,
  AuthStack,
  CustomerStack,
  RiderStack,
  VendorStack,
} from "@/navigation/stacks";
import type { RootStackParamList } from "@/types/navigation";

const Root = createNativeStackNavigator<RootStackParamList>();

/**
 * Chooses the stack from the signed-in role.
 *
 * Only the branch for the current role is mounted, so a customer build never
 * instantiates vendor screens. Because the stack swaps on `role`, login and
 * logout need no imperative navigation — React re-renders into the right tree.
 */
export const RootNavigator: React.FC = () => {
  const { role, ready } = useAuth();
  const { theme, isDark } = useTheme();

  const navTheme = useMemo<NavTheme>(() => {
    const base = isDark ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: theme.colors.primary,
        background: theme.colors.background,
        card: theme.colors.surface,
        text: theme.colors.text,
        border: theme.colors.border,
        notification: theme.colors.error,
      },
    };
  }, [isDark, theme]);

  // Hold the splash until the stored session resolves, otherwise the login
  // screen flashes for already-signed-in users.
  if (!ready) {
    return <Loading label="Starting NearBitez…" />;
  }

  return (
    <NavigationContainer theme={navTheme}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <Root.Navigator screenOptions={{ headerShown: false }}>
        {!role ? (
          <Root.Screen name="Auth" component={AuthStack} />
        ) : role === "vendor" ? (
          <Root.Screen name="Vendor" component={VendorStack} />
        ) : role === "admin" ? (
          <Root.Screen name="Admin" component={AdminStack} />
        ) : role === "rider" ? (
          <Root.Screen name="Rider" component={RiderStack} />
        ) : (
          <Root.Screen name="Customer" component={CustomerStack} />
        )}
      </Root.Navigator>
    </NavigationContainer>
  );
};
