import React, { useCallback, useState } from "react";
import { FlatList, Image, Pressable, RefreshControl, StyleSheet, Switch, Text, View } from "react-native";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import {
  Badge,
  EmptyState,
  ErrorState,
  FilterChips,
  Input,
  Loading,
  Screen,
} from "@/components";
import { adminApi } from "@/services/api";
import { useApi } from "@/hooks/useApi";
import { useDebounced } from "@/hooks/useDebounced";
import { useTheme } from "@/hooks/useTheme";
import { useToast } from "@/hooks/useToast";
import { formatCurrency, formatDate } from "@/utils/format";
import { refName, titleCase } from "@/utils/admin";
import type { MenuItem } from "@/types/models";
import type { AdminPromo } from "@/types/admin";
import type { AdminStackParamList } from "@/types/navigation";

/* ── Menu ───────────────────────────────────────────────────────────────── */

type MenuRoute = RouteProp<AdminStackParamList, "AdminMenu">;

const MENU_FILTERS = [
  { label: "All", value: "all" },
  { label: "Live", value: "live" },
  { label: "Paused", value: "paused" },
];

/**
 * Menu oversight.
 *
 * Scoped to one restaurant when opened from its detail screen, platform-wide
 * otherwise. The only write is the availability switch — creating and pricing
 * dishes stays with the restaurant, where it belongs.
 */
export const AdminMenuScreen: React.FC = () => {
  const { theme } = useTheme();
  const toast = useToast();
  const navigation = useNavigation();
  const { params } = useRoute<MenuRoute>();
  const restaurantId = params?.restaurantId;

  const [query, setQuery] = useState("");
  const [availability, setAvailability] = useState("all");
  const [busyId, setBusyId] = useState<string | null>(null);

  const search = useDebounced(query, 300).trim();

  const { data, loading, error, refetch } = useApi(
    () =>
      adminApi.menu({
        restaurantId,
        search: search || undefined,
        availability: availability === "all" ? undefined : availability,
      }),
    [restaurantId, search, availability]
  );

  React.useLayoutEffect(() => {
    navigation.setOptions({ title: params?.name ? `${params.name} menu` : "Menu" });
  }, [navigation, params?.name]);

  const toggle = useCallback(
    async (item: MenuItem, next: boolean) => {
      setBusyId(item._id);
      try {
        await adminApi.toggleMenuItem(item._id, next);
        toast.success(next ? "Item is live" : "Item paused");
        await refetch();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not update item");
      } finally {
        setBusyId(null);
      }
    },
    [refetch, toast]
  );

  if (loading && !data) return <Loading label="Loading menu…" />;
  if (error && !data) return <ErrorState title="Couldn't load" message={error} onAction={refetch} />;

  const items = data ?? [];

  return (
    <Screen padded={false} edges={["bottom"]}>
      <View style={styles.searchWrap}>
        <Input
          value={query}
          onChangeText={setQuery}
          placeholder="Search dishes"
          autoCorrect={false}
        />
      </View>

      <FilterChips options={MENU_FILTERS} value={availability} onChange={setAvailability} />

      <FlatList
        data={items}
        keyExtractor={(item) => item._id}
        initialNumToRender={12}
        windowSize={7}
        removeClippedSubviews
        contentContainerStyle={items.length ? undefined : styles.empty}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refetch} tintColor={theme.colors.primary} />
        }
        renderItem={({ item }) => (
          <View style={[styles.menuRow, { borderBottomColor: theme.colors.border }]}>
            {item.imageUrl ? (
              <Image
                source={{ uri: item.imageUrl }}
                style={[styles.thumb, { borderRadius: theme.radius.sm }]}
              />
            ) : (
              <View
                style={[
                  styles.thumb,
                  { backgroundColor: theme.colors.surface, borderRadius: theme.radius.sm },
                ]}
              />
            )}
            <View style={{ flex: 1 }}>
              <Text numberOfLines={1} style={{ color: theme.colors.text, fontWeight: "700" }}>
                {item.name}
              </Text>
              <Text numberOfLines={1} style={{ color: theme.colors.textMuted, fontSize: 12, marginTop: 2 }}>
                {formatCurrency(item.price)} · {titleCase(item.category)}
              </Text>
              {!restaurantId ? (
                <Text numberOfLines={1} style={{ color: theme.colors.textFaint, fontSize: 11, marginTop: 2 }}>
                  {refName(item.restaurant as never, "Restaurant")}
                </Text>
              ) : null}
            </View>
            <Switch
              value={item.isAvailable}
              disabled={busyId === item._id}
              onValueChange={(next) => void toggle(item, next)}
              trackColor={{ true: theme.colors.success, false: theme.colors.border }}
              thumbColor="#fff"
            />
          </View>
        )}
        ListEmptyComponent={
          <EmptyState
            title="No dishes"
            message={
              search || availability !== "all"
                ? "Nothing matches this search or filter."
                : "This restaurant has not added any dishes."
            }
          />
        }
      />
    </Screen>
  );
};

/* ── Promos ─────────────────────────────────────────────────────────────── */

const PROMO_FILTERS = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
  { label: "Disabled", value: "disabled" },
  { label: "Expired", value: "expired" },
];

/**
 * Coupons and game rewards.
 *
 * Read plus an on/off switch. Creating a promo needs a restaurant, a code and
 * an expiry, which is a form better suited to the web dashboard — the mobile
 * job is spotting a live coupon that should not be live.
 */
export const AdminPromosScreen: React.FC = () => {
  const { theme } = useTheme();
  const toast = useToast();

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [busyId, setBusyId] = useState<string | null>(null);

  const search = useDebounced(query, 300).trim();

  const { data, loading, error, refetch } = useApi(
    () =>
      adminApi.promos({
        search: search || undefined,
        status: status === "all" ? undefined : status,
      }),
    [search, status]
  );

  const toggle = useCallback(
    async (promo: AdminPromo, next: boolean) => {
      setBusyId(promo._id);
      try {
        await adminApi.togglePromo(promo._id, next);
        toast.success(next ? `${promo.code} is live` : `${promo.code} disabled`);
        await refetch();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not update promo");
      } finally {
        setBusyId(null);
      }
    },
    [refetch, toast]
  );

  if (loading && !data) return <Loading label="Loading promos…" />;
  if (error && !data) return <ErrorState title="Couldn't load" message={error} onAction={refetch} />;

  const promos = data ?? [];

  return (
    <Screen padded={false} edges={["bottom"]}>
      <View style={styles.searchWrap}>
        <Input
          value={query}
          onChangeText={setQuery}
          placeholder="Search code"
          autoCapitalize="characters"
          autoCorrect={false}
        />
      </View>

      <FilterChips options={PROMO_FILTERS} value={status} onChange={setStatus} />

      <FlatList
        data={promos}
        keyExtractor={(item) => item._id}
        initialNumToRender={10}
        windowSize={7}
        removeClippedSubviews
        contentContainerStyle={promos.length ? styles.list : styles.empty}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refetch} tintColor={theme.colors.primary} />
        }
        renderItem={({ item }) => (
          <View
            style={[
              styles.promoRow,
              {
                backgroundColor: theme.colors.card,
                borderColor: theme.colors.border,
                borderRadius: theme.radius.lg,
              },
            ]}
          >
            <View style={styles.rowHead}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.colors.text, fontWeight: "800", fontSize: 16, letterSpacing: 0.5 }}>
                  {item.code}
                </Text>
                <Text style={{ color: theme.colors.textMuted, fontSize: 12, marginTop: 2 }}>
                  {item.discountType === "PERCENTAGE"
                    ? `${item.value}% off`
                    : `${formatCurrency(item.value)} off`}
                  {item.minOrderValue ? ` above ${formatCurrency(item.minOrderValue)}` : ""}
                </Text>
              </View>
              <Switch
                value={item.isActive}
                disabled={busyId === item._id}
                onValueChange={(next) => void toggle(item, next)}
                trackColor={{ true: theme.colors.success, false: theme.colors.border }}
                thumbColor="#fff"
              />
            </View>

            <View style={styles.tags}>
              {item.isGameReward ? <Badge label="Game reward" tone="primary" /> : null}
              <Badge label={refName(item.restaurant, "All restaurants")} tone="info" />
              <Text style={{ color: theme.colors.textFaint, fontSize: 11, marginLeft: "auto" }}>
                {item.usedCount ?? 0}
                {item.usageLimit ? ` / ${item.usageLimit}` : ""} used
                {item.validUntil ? ` · ends ${formatDate(item.validUntil)}` : ""}
              </Text>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <EmptyState
            title="No promos"
            message={
              search || status !== "all"
                ? "Nothing matches this search or filter."
                : "No coupons or game rewards have been created."
            }
          />
        }
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  searchWrap: { paddingHorizontal: 16, paddingTop: 10 },
  list: { padding: 16, paddingTop: 4, gap: 12 },
  empty: { flexGrow: 1 },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  thumb: { width: 46, height: 46 },
  promoRow: { borderWidth: 1, padding: 14 },
  rowHead: { flexDirection: "row", alignItems: "center", gap: 12 },
  tags: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10 },
});
