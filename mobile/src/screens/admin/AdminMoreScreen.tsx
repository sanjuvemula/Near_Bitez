import React, { useState } from "react";
import { ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Avatar, Badge, Button, ListItem, Modal, Screen } from "@/components";
import { useAdmin } from "@/hooks/useAdmin";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/useNotifications";
import { useTheme } from "@/hooks/useTheme";
import type { AdminScreenNavigation } from "@/types/navigation";


/**
 * Hub for everything not on the bottom bar.
 *
 * The tab bar carries the four things an admin opens daily; management areas
 * live here so navigation stays shallow instead of mirroring the desktop
 * sidebar.
 */
export const AdminMoreScreen: React.FC = () => {
  const { theme, isDark, toggleTheme } = useTheme();
  const navigation = useNavigation<AdminScreenNavigation>();
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const { stats, analytics, openIssues } = useAdmin();
  const [confirmLogout, setConfirmLogout] = useState(false);

  const chevron = <Text style={{ color: theme.colors.textFaint, fontSize: 18 }}>›</Text>;

  const group = (children: React.ReactNode) => (
    <View
      style={[
        styles.group,
        {
          backgroundColor: theme.colors.card,
          borderColor: theme.colors.border,
          borderRadius: theme.radius.lg,
        },
      ]}
    >
      {children}
    </View>
  );

  return (
    <Screen padded={false} edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.identity}>
          <Avatar name={user?.name} uri={user?.avatarUrl} size={56} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: "800" }}>
              {user?.name ?? "Admin"}
            </Text>
            <Text style={{ color: theme.colors.textMuted, fontSize: 13, marginTop: 2 }}>
              {user?.email}
            </Text>
          </View>
          <Badge label="ADMIN" tone="error" />
        </View>

        <Text style={[styles.label, { color: theme.colors.textMuted }]}>PEOPLE</Text>
        {group(
          <>
            <ListItem
              title="Users"
              subtitle={`${stats?.users.total ?? 0} accounts · ${stats?.users.vendors ?? 0} owners`}
              onPress={() => navigation.navigate("AdminUsers")}
              right={chevron}
            />
            <ListItem
              title="Messages"
              subtitle="Support and order conversations"
              onPress={() => navigation.navigate("AdminMessages")}
              right={chevron}
            />
            <ListItem
              title="Reported issues"
              subtitle={openIssues ? `${openIssues} still open` : "Nothing open"}
              onPress={() => navigation.navigate("AdminFeedback")}
              right={chevron}
            />
          </>
        )}

        <Text style={[styles.label, { color: theme.colors.textMuted }]}>MONETIZATION</Text>
        {group(
          <>
            <ListItem
              title="Subscriptions"
              subtitle={`${analytics?.totals.activeSubscriptions ?? 0} restaurants on a plan`}
              onPress={() => navigation.navigate("AdminSubscriptions")}
              right={chevron}
            />
            <ListItem
              title="Plans"
              subtitle="Pricing, commission and free-order quotas"
              onPress={() => navigation.navigate("AdminPlans")}
              right={chevron}
            />
            <ListItem
              title="Coupons and rewards"
              subtitle={`${stats?.marketing.activeCoupons ?? 0} active · ${stats?.marketing.gameRewards ?? 0} game rewards`}
              onPress={() => navigation.navigate("AdminPromos")}
              right={chevron}
            />
          </>
        )}

        <Text style={[styles.label, { color: theme.colors.textMuted }]}>CATALOGUE</Text>
        {group(
          <>
            <ListItem
              title="Tiffin"
              subtitle={`${stats?.restaurants.tiffinProviders ?? 0} providers · ${stats?.tiffin.activeSubscriptions ?? 0} subscribers`}
              onPress={() => navigation.navigate("AdminTiffin")}
              right={chevron}
            />
            <ListItem
              title="All menu items"
              subtitle={`${stats?.menu.active ?? 0} live of ${stats?.menu.total ?? 0}`}
              onPress={() => navigation.navigate("AdminMenu")}
              right={chevron}
            />
            <ListItem
              title="Analytics"
              subtitle="Orders, revenue and growth"
              onPress={() => navigation.navigate("AdminAnalytics")}
              right={chevron}
            />
          </>
        )}

        <Text style={[styles.label, { color: theme.colors.textMuted }]}>ACCOUNT</Text>
        {group(
          <>
            <ListItem
              title="Notifications"
              subtitle={unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
              onPress={() => navigation.navigate("AdminNotifications")}
              right={chevron}
            />
            <ListItem
              title="Platform settings"
              subtitle="Fees, payouts and maintenance mode"
              onPress={() => navigation.navigate("AdminSettings")}
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
          You'll stop receiving platform alerts until you sign back in.
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
