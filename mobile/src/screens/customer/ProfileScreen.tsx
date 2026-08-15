import React, { useState } from "react";
import { ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Avatar, Button, Input, ListItem, Modal, Screen } from "@/components";
import { authApi } from "@/services/api";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { useToast } from "@/hooks/useToast";
import { useNotifications } from "@/hooks/useNotifications";
import type { CustomerStackParamList } from "@/types/navigation";

type Nav = NativeStackNavigationProp<CustomerStackParamList>;

/**
 * Profile: identity, the delivery address, and app settings.
 *
 * Note on addresses — the backend stores a single `address` string on the user
 * (server/models/User.js), so this edits that one value. A saved-address book
 * with add/edit/delete/default would need a new model and endpoints, which is
 * outside a migration's remit.
 */
export const ProfileScreen: React.FC = () => {
  const { theme, isDark, toggleTheme } = useTheme();
  const { user, logout, refreshUser } = useAuth();
  const { unreadCount } = useNotifications();
  const navigation = useNavigation<Nav>();
  const toast = useToast();

  const [editing, setEditing] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [address, setAddress] = useState(user?.address ?? "");

  const save = async () => {
    setSaving(true);
    try {
      await authApi.updateMe({
        name: name.trim(),
        phone: phone.trim(),
        address: address.trim(),
      });
      await refreshUser();
      toast.success("Profile updated");
      setEditing(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen padded={false} edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.identity}>
          <Avatar name={user?.name} uri={user?.avatarUrl} size={64} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.name, { color: theme.colors.text }]}>
              {user?.name ?? "Guest"}
            </Text>
            <Text style={{ color: theme.colors.textMuted, marginTop: 2 }}>{user?.email}</Text>
            {user?.phone ? (
              <Text style={{ color: theme.colors.textFaint, marginTop: 2 }}>{user.phone}</Text>
            ) : null}
          </View>
        </View>

        {typeof user?.coins === "number" ? (
          <View
            style={[
              styles.rewards,
              {
                backgroundColor: theme.colors.primarySoft,
                borderRadius: theme.radius.lg,
              },
            ]}
          >
            <View>
              <Text style={{ color: theme.colors.primaryText, fontSize: 12, fontWeight: "700" }}>
                NEARCOINS
              </Text>
              <Text style={{ color: theme.colors.text, fontSize: 22, fontWeight: "800" }}>
                {user.coins}
              </Text>
            </View>
            {typeof user.xp === "number" ? (
              <View style={{ alignItems: "flex-end" }}>
                <Text style={{ color: theme.colors.primaryText, fontSize: 12, fontWeight: "700" }}>
                  XP
                </Text>
                <Text style={{ color: theme.colors.text, fontSize: 22, fontWeight: "800" }}>
                  {user.xp}
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}

        <View
          style={[
            styles.group,
            { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
          ]}
        >
          <ListItem
            title="Edit profile"
            subtitle="Name, phone and delivery address"
            onPress={() => setEditing(true)}
            right={<Text style={{ color: theme.colors.textFaint }}>›</Text>}
          />
          <ListItem
            title="My orders"
            onPress={() => navigation.navigate("Tabs", { screen: "Orders" })}
            right={<Text style={{ color: theme.colors.textFaint }}>›</Text>}
          />
          <ListItem
            title="Notifications"
            subtitle={unreadCount > 0 ? `${unreadCount} unread` : undefined}
            onPress={() => navigation.navigate("Notifications")}
            right={<Text style={{ color: theme.colors.textFaint }}>›</Text>}
          />
          <ListItem
            title="Game Zone"
            subtitle="Play, climb the leaderboard, earn coins"
            onPress={() => navigation.navigate("GamesHome")}
            right={<Text style={{ color: theme.colors.textFaint }}>›</Text>}
          />
          <ListItem
            title="Rewards"
            subtitle="Coins, XP and coupons you've earned"
            onPress={() => navigation.navigate("Rewards")}
            right={<Text style={{ color: theme.colors.textFaint }}>›</Text>}
          />
        </View>

        <View
          style={[
            styles.group,
            { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
          ]}
        >
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
        </View>

        <Button
          label="Log out"
          variant="secondary"
          fullWidth
          onPress={() => setConfirmLogout(true)}
          style={{ marginTop: 8 }}
        />
      </ScrollView>

      <Modal visible={editing} onClose={() => setEditing(false)} title="Edit profile">
        <Input label="Name" value={name} onChangeText={setName} autoCapitalize="words" />
        <Input
          label="Phone"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          containerStyle={{ marginTop: 12 }}
        />
        <Input
          label="Delivery address"
          value={address}
          onChangeText={setAddress}
          multiline
          placeholder="House / flat, street, landmark"
          containerStyle={{ marginTop: 12 }}
        />
        <View style={styles.modalActions}>
          <Button label="Cancel" variant="secondary" onPress={() => setEditing(false)} />
          <Button label="Save" loading={saving} onPress={save} />
        </View>
      </Modal>

      <Modal
        visible={confirmLogout}
        onClose={() => setConfirmLogout(false)}
        title="Log out?"
      >
        <Text style={{ color: theme.colors.textMuted }}>
          You'll need to sign in again to place orders.
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
  identity: { flexDirection: "row", alignItems: "center", gap: 16, marginBottom: 20 },
  name: { fontSize: 20, fontWeight: "800" },
  rewards: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16,
    marginBottom: 20,
  },
  group: { borderWidth: 1, borderRadius: 16, overflow: "hidden", marginBottom: 16 },
  modalActions: { flexDirection: "row", justifyContent: "flex-end", gap: 10, marginTop: 20 },
});
