import React from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Button, EmptyState, Screen } from "@/components";
import { useCart } from "@/hooks/useCart";
import { useTheme } from "@/hooks/useTheme";
import { formatCurrency } from "@/utils/format";
import type { CustomerStackParamList } from "@/types/navigation";

type Nav = NativeStackNavigationProp<CustomerStackParamList>;

/**
 * Cart review.
 *
 * Every figure shown comes from `cart.totals`, which the server recomputes on
 * each mutation — nothing is added up on the device, so fees, tax and discounts
 * always match what checkout will charge.
 */
export const CartScreen: React.FC = () => {
  const { theme } = useTheme();
  const navigation = useNavigation<Nav>();
  const { cart, loading, updateQuantity, removeItem, clear, pendingItemId } = useCart();

  const items = cart?.items ?? [];
  const totals = cart?.totals;

  if (!loading && items.length === 0) {
    return (
      <Screen>
        <EmptyState
          title="Your cart is empty"
          message="Add dishes from a restaurant to get started."
          actionLabel="Browse restaurants"
          onAction={() => navigation.navigate("Tabs", { screen: "Home" })}
        />
      </Screen>
    );
  }

  const restaurantName =
    typeof cart?.restaurant === "object" ? cart?.restaurant?.name : undefined;

  const row = (label: string, value: number, muted = true, strong = false) => (
    <View style={styles.totalRow} key={label}>
      <Text
        style={{
          color: muted ? theme.colors.textMuted : theme.colors.text,
          fontSize: strong ? 16 : 14,
          fontWeight: strong ? "800" : "500",
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          color: strong ? theme.colors.text : theme.colors.textMuted,
          fontSize: strong ? 16 : 14,
          fontWeight: strong ? "800" : "600",
        }}
      >
        {formatCurrency(value)}
      </Text>
    </View>
  );

  return (
    <Screen padded={false} edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {restaurantName ? (
          <Text style={[styles.restaurant, { color: theme.colors.text }]}>
            {restaurantName}
          </Text>
        ) : null}

        {/* Server-side warnings, e.g. an item went out of stock */}
        {cart?.warnings?.map((warning) => (
          <View
            key={warning}
            style={[
              styles.warning,
              { backgroundColor: theme.colors.warningSoft, borderRadius: theme.radius.md },
            ]}
          >
            <Text style={{ color: theme.colors.warning, fontWeight: "600" }}>{warning}</Text>
          </View>
        ))}

        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.colors.card,
              borderColor: theme.colors.border,
              borderRadius: theme.radius.lg,
            },
          ]}
        >
          {items.map((line, index) => {
            const id =
              typeof line.menuItem === "string" ? line.menuItem : line.menuItem?._id;
            const busy = pendingItemId === id;

            return (
              <View
                key={id ?? `${line.name}-${index}`}
                style={[
                  styles.line,
                  index < items.length - 1 && {
                    borderBottomWidth: StyleSheet.hairlineWidth,
                    borderBottomColor: theme.colors.border,
                  },
                ]}
              >
                {line.imageUrl ? (
                  <Image
                    source={{ uri: line.imageUrl }}
                    style={[styles.thumb, { borderRadius: theme.radius.sm }]}
                  />
                ) : null}

                <View style={styles.lineBody}>
                  <Text
                    numberOfLines={2}
                    style={{ color: theme.colors.text, fontWeight: "600", fontSize: 15 }}
                  >
                    {line.name}
                  </Text>
                  <Text style={{ color: theme.colors.textMuted, marginTop: 3 }}>
                    {formatCurrency(line.price)}
                  </Text>
                </View>

                <View style={styles.lineActions}>
                  <View
                    style={[
                      styles.stepper,
                      {
                        borderColor: theme.colors.primary,
                        borderRadius: theme.radius.sm,
                        opacity: busy ? 0.5 : 1,
                      },
                    ]}
                  >
                    <Pressable
                      hitSlop={6}
                      disabled={busy || !id}
                      onPress={() => id && void updateQuantity(id, line.quantity - 1)}
                      style={styles.stepperBtn}
                      accessibilityLabel="Decrease quantity"
                    >
                      <Text style={{ color: theme.colors.primaryText, fontWeight: "800" }}>
                        −
                      </Text>
                    </Pressable>
                    <Text style={{ color: theme.colors.text, fontWeight: "700" }}>
                      {line.quantity}
                    </Text>
                    <Pressable
                      hitSlop={6}
                      disabled={busy || !id}
                      onPress={() => id && void updateQuantity(id, line.quantity + 1)}
                      style={styles.stepperBtn}
                      accessibilityLabel="Increase quantity"
                    >
                      <Text style={{ color: theme.colors.primaryText, fontWeight: "800" }}>
                        +
                      </Text>
                    </Pressable>
                  </View>

                  <Pressable
                    hitSlop={8}
                    disabled={busy || !id}
                    onPress={() => id && void removeItem(id)}
                    style={styles.remove}
                  >
                    <Text style={{ color: theme.colors.textFaint, fontSize: 12 }}>
                      Remove
                    </Text>
                  </Pressable>
                </View>
              </View>
            );
          })}
        </View>

        {totals ? (
          <View
            style={[
              styles.card,
              {
                backgroundColor: theme.colors.card,
                borderColor: theme.colors.border,
                borderRadius: theme.radius.lg,
                padding: 16,
              },
            ]}
          >
            <Text style={[styles.billTitle, { color: theme.colors.text }]}>Bill details</Text>
            {row("Item total", totals.itemTotal)}
            {row("Delivery fee", totals.deliveryFee)}
            {row("Platform fee", totals.platformFee)}
            {row("Taxes", totals.gst)}
            <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
            {row("To pay", totals.grandTotal, false, true)}
          </View>
        ) : null}

        <Pressable onPress={() => void clear()} style={styles.clearAll} hitSlop={8}>
          <Text style={{ color: theme.colors.error, fontWeight: "600" }}>Clear cart</Text>
        </Pressable>
      </ScrollView>

      <View
        style={[
          styles.footer,
          { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border },
        ]}
      >
        <View style={{ flex: 1 }}>
          <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>Total</Text>
          <Text style={{ color: theme.colors.text, fontSize: 19, fontWeight: "800" }}>
            {formatCurrency(totals?.grandTotal)}
          </Text>
        </View>
        <Button
          label="Checkout"
          size="lg"
          onPress={() => navigation.navigate("Checkout")}
          disabled={items.length === 0}
        />
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 24 },
  restaurant: { fontSize: 19, fontWeight: "800", marginBottom: 14 },
  warning: { padding: 12, marginBottom: 12 },
  card: { borderWidth: 1, marginBottom: 16, overflow: "hidden" },
  line: { flexDirection: "row", alignItems: "center", padding: 14, gap: 12 },
  thumb: { width: 52, height: 52 },
  lineBody: { flex: 1 },
  lineActions: { alignItems: "flex-end", gap: 6 },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    paddingHorizontal: 4,
    gap: 6,
  },
  stepperBtn: { paddingHorizontal: 8, paddingVertical: 6 },
  remove: { paddingVertical: 2 },
  billTitle: { fontSize: 15, fontWeight: "700", marginBottom: 12 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 5 },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 10 },
  clearAll: { alignSelf: "center", paddingVertical: 10 },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
