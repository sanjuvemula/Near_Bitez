import "react-native-gesture-handler";
import React from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AdminProvider } from "@/context/AdminContext";
import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import { NotificationProvider } from "@/context/NotificationContext";
import { VendorProvider } from "@/context/VendorContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { ToastProvider } from "@/context/ToastContext";
import { RootNavigator } from "@/navigation/RootNavigator";

/**
 * Provider order matters:
 *   Theme  → everything below reads colours from it
 *   Toast  → needs the theme; must sit above anything that reports errors
 *   Auth   → shows toasts on failure, and drives which stack renders
 *   Notifications / Cart / Vendor / Admin → all need a session, so they sit
 *     inside Auth. Each no-ops for the roles it doesn't serve, so a customer
 *     session never issues an admin request.
 */
export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <ToastProvider>
            <AuthProvider>
              <NotificationProvider>
                <CartProvider>
                  <VendorProvider>
                    <AdminProvider>
                      <RootNavigator />
                    </AdminProvider>
                  </VendorProvider>
                </CartProvider>
              </NotificationProvider>
            </AuthProvider>
          </ToastProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
