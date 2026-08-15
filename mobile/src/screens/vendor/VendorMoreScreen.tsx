import React, { useState } from "react";
import { ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Avatar, Badge, Button, ListItem, Modal, Screen } from "@/components";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/useNotifications";
import { useTheme } from "@/hooks/useTheme";
import { useVendor } from "@/hooks/useVendor";
import type { VendorStackParamList } from "@/types/navigation";

type Nav = NativeStackNavigationProp<VendorStackParamList>;

/**
 * Hub for everything not on the bottom bar.
 *
 * The tab bar holds the four daily-use areas; the rest live here so navigation
 * stays compact rather than mirroring the desktop sidebar.
 */
export const VendorMoreScreen: React.FC = () => {
  const { theme, isDark, toggleTheme } = useTheme();
  const navigation = useNavigation<Nav>();
  const { user, logout } = useAuth();
  const { overview } = useVendor();
  const { unreadCount } = useNotifications();
  const [confirmLogout, setConfirmLogout] = useState(false);

  const chevron = <Text style={{ color: theme.colors.textFaint, fontSize: 18 }}>›</Text>;

  const group = (children: React.ReactNode) => (
    <View
      style={[
        styles.group,
        { backgroundColor: theme.colors.card, borderColor: theme.colors.border, borderRadius: theme.radius.lg },
      ]}
    >
      {children}
    </View>
  );

  return (
    <Screen padded={false} edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.identity}>
          <Avatar
            name={overview?.restaurant?.name ?? user?.name}
            uri={overview?.restaurant?.imageUrl}
            size={56}
          />
          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: "800" }}>
              {overview?.restaurant?.name ?? user?.name ?? "Your restaurant"}
            </Text>
            <Text style={{ color: theme.colors.textMuted, fontSize: 13, marginTop: 2 }}>
              {user?.email}
            </Text>
          </View>
          <Badge
            label={overview?.restaurant?.isActive ? "Open" : "Closed"}
            tone={overview?.restaurant?.isActive ? "success" : "error"}
          />
        </View>

        <Text style={[styles.label, { color: theme.colors.textMuted }]}>OPERATIONS</Text>
        {group(
          <>
            <ListItem
              title="Inventory & stock"
              subtitle="Mark items sold out or live"
              onPress={() => navigation.navigate("Inventory")}
              right={chevron}
            />
            <ListItem
              title="Tiffin & services"
              subtitle="Plans and subscribers"
              onPress={() => navigation.navigate("Tiffin")}
              right={chevron}
            />
            <ListItem
              title="Delivery"
              subtitle="Zones and delivery fees"
              onPress={() => navigation.navigate("Delivery")}
              right={chevron}
            />
          </>
        )}

        <Text style={[styles.label, { color: theme.colors.textMuted }]}>BUSINESS</Text>
        {group(
          <>
            <ListItem
              title="My subscription"
              subtitle="Plan, quota and commission"
              onPress={() => navigation.navigate("Subscription")}
              right={chevron}
            />
            <ListItem
              title="Growth"
              subtitle="Promotions and campaigns"
              onPress={() => navigation.navigate("Growth")}
              right={chevron}
            />
            <ListItem
              title="Messages"
              subtitle="Customer conversations"
              onPress={() => navigation.navigate("Messages")}
              right={chevron}
            />
            <ListItem
              title="Notifications"
              subtitle={unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
              onPress={() => navigation.navigate("VendorNotifications")}
              right={chevron}
            />
          </>
        )}

        <Text style={[styles.label, { color: theme.colors.textMuted }]}>SETTINGS</Text>
        {group(
          <>
            <ListItem
              title="Store profile"
              subtitle="Name, address and photo"
              onPress={() => navigation.navigate("StoreProfile")}
              right={chevron}
            />
            <ListItem
              title="Dark mode"
              subtitle={isDark ? "On" : "Off"}
              right={
                <Switch
                  value={isDark}
                  onValueChange={toggleTheme}
                  trackColor={{ true: theme.colors.primary, false: theme.colors.border }}
                  thumbColor="#fff"
                />
              }
            />
          </>
        )}

        <Button
          label="Log out"
          variant="secondary"
          fullWidth
          onPress={() => setConfirmLogout(true)}
          style={{ marginTop: 8 }}
        />
      </ScrollView>

      <Modal visible={confirmLogout} onClose={() => setConfirmLogout(false)} title="Log out?">
        <Text style={{ color: theme.colors.textMuted }}>
          You'll stop receiving new order alerts until you sign back in.
        </Text>
        <View style={styles.modalActions}>
          <Button label="Cancel" variant="secondary" onPress={() => setConfirmLogout(false)} />
          <Button
            label="Log out"
            variant="danger"
            onPress={() => {
              setConfirmLogout(false);
              void logout();
            }}
          />
        </View>
      </Modal>
    </Screen>
  );
};

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 32 },
  identity: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 22 },
  label: { fontSize: 11, fontWeight: "800", letterSpacing: 0.8, marginBottom: 8, marginLeft: 4 },
  group: { borderWidth: 1, overflow: "hidden", marginBottom: 20 },
  modalActions: { flexDirection: "row", justifyContent: "flex-end", gap: 10, marginTop: 20 },
});
