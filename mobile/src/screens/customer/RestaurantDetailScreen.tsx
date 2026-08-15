import React, { useCallback, useMemo, useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Animated, { FadeInUp } from "react-native-reanimated";
import { Badge, Button, ErrorState, Loading, Modal, Screen } from "@/components";
import { FoodItemCard } from "@/components/FoodItemCard";
import { restaurantApi } from "@/services/api";
import { useApi } from "@/hooks/useApi";
import { useCart } from "@/hooks/useCart";
import { useTheme } from "@/hooks/useTheme";
import { formatCurrency } from "@/utils/format";
import type { CustomerStackParamList } from "@/types/navigation";
import type { MenuItem } from "@/types/models";

type Nav = NativeStackNavigationProp<CustomerStackParamList>;
type DetailRoute = RouteProp<CustomerStackParamList, "RestaurantDetail">;

/**
 * Restaurant detail: header, menu grouped by category, and a sticky cart bar.
 *
 * SectionList gives sticky category headers and windowed rendering for long
 * menus without hand-rolling either.
 */
export const RestaurantDetailScreen: React.FC = () => {
  const { theme } = useTheme();
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<DetailRoute>();
  const { cart, addItem, updateQuantity, quantityOf, pendingItemId } = useCart();

  // Adding across restaurants clears the old cart, so confirm first.
  const [conflict, setConflict] = useState<MenuItem | null>(null);

  const { data, loading, error, isNetworkError, refetch } = useApi(
    () => restaurantApi.byId(params.restaurantId),
    [params.restaurantId]
  );

  const sections = useMemo(() => {
    const menu = data?.menu ?? [];
    const grouped = menu.reduce<Record<string, MenuItem[]>>((acc, item) => {
      const key = item.category?.trim() || "Menu";
      (acc[key] ||= []).push(item);
      return acc;
    }, {});
    return Object.entries(grouped).map(([title, items]) => ({ title, data: items }));
  }, [data?.menu]);

  const cartRestaurantId =
    typeof cart?.restaurant === "object" ? cart?.restaurant?._id : cart?.restaurant;

  const handleAdd = useCallback(
    async (item: MenuItem) => {
      const otherCart =
        Boolean(cartRestaurantId) && cartRestaurantId !== params.restaurantId;

      if (otherCart) {
        setConflict(item);
        return;
      }
      await addItem(item._id, 1);
    },
    [addItem, cartRestaurantId, params.restaurantId]
  );

  if (loading && !data) return <Loading label="Loading menu…" />;

  if (error && !data) {
    return (
      <ErrorState
        title="Couldn't load restaurant"
        message={error}
        isNetworkError={isNetworkError}
        onAction={refetch}
      />
    );
  }

  const restaurant = data;
  const closed = restaurant?.isActive === false;
  const cartCount = cart?.totals.totalItems ?? 0;
  const showCartBar = cartCount > 0 && cartRestaurantId === params.restaurantId;

  return (
    <Screen padded={false} edges={["bottom"]}>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item._id}
        stickySectionHeadersEnabled
        initialNumToRender={8}
        maxToRenderPerBatch={10}
        windowSize={9}
        removeClippedSubviews
        contentContainerStyle={{ paddingBottom: showCartBar ? 96 : 24 }}
        ListHeaderComponent={
          <View>
            <View style={styles.hero}>
              {restaurant?.imageUrl ? (
                <Image
                  source={{ uri: restaurant.imageUrl }}
                  style={StyleSheet.absoluteFill}
                  resizeMode="cover"
                />
              ) : (
                <View
                  style={[styles.heroFallback, { backgroundColor: theme.colors.surface }]}
                >
                  <Text style={{ fontSize: 44 }}>🍴</Text>
                </View>
              )}
            </View>

            <View style={styles.headerBody}>
              <Text style={[styles.name, { color: theme.colors.text }]}>
                {restaurant?.name}
              </Text>

              {restaurant?.description ? (
                <Text style={[styles.description, { color: theme.colors.textMuted }]}>
                  {restaurant.description}
                </Text>
              ) : null}

              <View style={styles.metaRow}>
                {restaurant?.rating ? (
                  <Badge label={`★ ${Number(restaurant.rating).toFixed(1)}`} tone="success" />
                ) : null}
                {restaurant?.deliveryTime ? (
                  <Badge label={`${restaurant.deliveryTime} min`} tone="neutral" />
                ) : null}
                {restaurant?.isVegOnly ? <Badge label="Pure veg" tone="success" /> : null}
                {closed ? <Badge label="Closed" tone="error" /> : null}
              </View>

              {restaurant?.address ? (
                <Text style={[styles.address, { color: theme.colors.textFaint }]}>
                  {restaurant.address}
                </Text>
              ) : null}

              {closed ? (
                <View
                  style={[
                    styles.notice,
                    {
                      backgroundColor: theme.colors.errorSoft,
                      borderRadius: theme.radius.md,
                    },
                  ]}
                >
                  <Text style={{ color: theme.colors.error, fontWeight: "600" }}>
                    This restaurant isn't accepting orders right now.
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        }
        renderSectionHeader={({ section }) => (
          <View
            style={[
              styles.sectionHeader,
              {
                backgroundColor: theme.colors.background,
                borderBottomColor: theme.colors.border,
              },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              {section.title}
            </Text>
          </View>
        )}
        renderItem={({ item }) => (
          <FoodItemCard
            item={item}
            quantity={quantityOf(item._id)}
            pending={pendingItemId === item._id}
            onAdd={() => void handleAdd(item)}
            onIncrement={() => void updateQuantity(item._id, quantityOf(item._id) + 1)}
            onDecrement={() => void updateQuantity(item._id, quantityOf(item._id) - 1)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={{ fontSize: 36 }}>📋</Text>
            <Text style={{ color: theme.colors.text, fontWeight: "700", marginTop: 10 }}>
              No menu yet
            </Text>
            <Text style={{ color: theme.colors.textMuted, marginTop: 4 }}>
              This restaurant hasn't added dishes.
            </Text>
          </View>
        }
      />

      {showCartBar ? (
        <Animated.View
          entering={FadeInUp.duration(220)}
          style={[
            styles.cartBar,
            {
              backgroundColor: theme.colors.primary,
              borderRadius: theme.radius.lg,
              ...theme.elevation.md,
            },
          ]}
        >
          <View style={{ flex: 1 }}>
            <Text style={[styles.cartCount, { color: theme.colors.onPrimary }]}>
              {cartCount} {cartCount === 1 ? "item" : "items"}
            </Text>
            <Text style={[styles.cartTotal, { color: theme.colors.onPrimary }]}>
              {formatCurrency(cart?.totals.itemTotal)}
            </Text>
          </View>
          <Pressable
            onPress={() => navigation.navigate("Tabs", { screen: "Cart" })}
            accessibilityRole="button"
            style={styles.cartCta}
          >
            <Text style={[styles.cartCtaText, { color: theme.colors.onPrimary }]}>
              View cart →
            </Text>
          </Pressable>
        </Animated.View>
      ) : null}

      <Modal
        visible={Boolean(conflict)}
        onClose={() => setConflict(null)}
        title="Start a new cart?"
      >
        <Text style={{ color: theme.colors.textMuted, lineHeight: 20 }}>
          Your cart has items from another restaurant. Adding this will replace them.
        </Text>
        <View style={styles.modalActions}>
          <Button label="Cancel" variant="secondary" onPress={() => setConflict(null)} />
          <Button
            label="Replace"
            onPress={async () => {
              const item = conflict;
              setConflict(null);
              if (item) await addItem(item._id, 1);
            }}
          />
        </View>
      </Modal>
    </Screen>
  );
};

const styles = StyleSheet.create({
  hero: { height: 190, width: "100%", overflow: "hidden" },
  heroFallback: { flex: 1, alignItems: "center", justifyContent: "center" },
  headerBody: { padding: 16 },
  name: { fontSize: 23, fontWeight: "800" },
  description: { fontSize: 14, marginTop: 6, lineHeight: 20 },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  address: { fontSize: 13, marginTop: 10 },
  notice: { padding: 12, marginTop: 14 },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sectionTitle: { fontSize: 15, fontWeight: "700", letterSpacing: 0.3 },
  empty: { alignItems: "center", paddingVertical: 48 },
  cartBar: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 16,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  cartCount: { fontSize: 12, fontWeight: "600", opacity: 0.9 },
  cartTotal: { fontSize: 16, fontWeight: "800", marginTop: 1 },
  cartCta: { paddingVertical: 6, paddingLeft: 12 },
  cartCtaText: { fontSize: 15, fontWeight: "800" },
  modalActions: { flexDirection: "row", justifyContent: "flex-end", gap: 10, marginTop: 20 },
});
