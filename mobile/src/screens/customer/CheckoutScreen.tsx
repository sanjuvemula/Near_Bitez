import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Button, Input, Screen } from "@/components";
import { orderApi } from "@/services/api";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/hooks/useCart";
import { useTheme } from "@/hooks/useTheme";
import { useToast } from "@/hooks/useToast";
import { formatCurrency } from "@/utils/format";
import type { CustomerStackParamList } from "@/types/navigation";

type Nav = NativeStackNavigationProp<CustomerStackParamList>;

/**
 * Checkout.
 *
 * The order body carries only delivery details and discount intent — the server
 * reads the cart itself and computes every total, so nothing here can alter
 * what the customer is charged.
 *
 * Payment is COD only; that is the sole method the Order model accepts today.
 */
export const CheckoutScreen: React.FC = () => {
  const { theme } = useTheme();
  const navigation = useNavigation<Nav>();
  const { user, refreshUser } = useAuth();
  const { cart, refresh } = useCart();
  const toast = useToast();

  // Seeded from the profile; the customer can override for this order.
  const [address, setAddress] = useState(user?.address ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [instructions, setInstructions] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [placing, setPlacing] = useState(false);
  const [errors, setErrors] = useState<{ address?: string; phone?: string }>({});

  const totals = cart?.totals;

  const validate = () => {
    const next: typeof errors = {};
    if (!address.trim()) next.address = "Delivery address is required";
    if (!phone.trim()) next.phone = "Phone number is required";
    else if (!/^\d{10}$/.test(phone.replace(/\D/g, "").slice(-10)))
      next.phone = "Enter a valid 10-digit number";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const placeOrder = async () => {
    if (!validate()) return;

    setPlacing(true);
    try {
      const order = await orderApi.create({
        deliveryAddress: address.trim(),
        deliveryPhone: phone.trim(),
        deliveryInstructions: instructions.trim(),
        promoCode: promoCode.trim() || null,
      });

      await refresh();
      void refreshUser();
      toast.success("Order placed");

      // Replace so Back doesn't return to a checkout for a placed order.
      navigation.replace("OrderTracking", { orderId: order._id });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not place order");
    } finally {
      setPlacing(false);
    }
  };

  const row = (label: string, value: number, strong = false) => (
    <View style={styles.row} key={label}>
      <Text
        style={{
          color: strong ? theme.colors.text : theme.colors.textMuted,
          fontWeight: strong ? "800" : "500",
          fontSize: strong ? 16 : 14,
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          color: strong ? theme.colors.text : theme.colors.textMuted,
          fontWeight: strong ? "800" : "600",
          fontSize: strong ? 16 : 14,
        }}
      >
        {formatCurrency(value)}
      </Text>
    </View>
  );

  const section = (title: string, children: React.ReactNode) => (
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
      <Text style={[styles.cardTitle, { color: theme.colors.text }]}>{title}</Text>
      {children}
    </View>
  );

  return (
    <Screen padded={false} edges={["bottom"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {section(
          "Deliver to",
          <>
            <Input
              label="Address"
              value={address}
              onChangeText={(v) => {
                setAddress(v);
                if (errors.address) setErrors((e) => ({ ...e, address: undefined }));
              }}
              error={errors.address}
              placeholder="House / flat, street, landmark"
              multiline
            />
            <Input
              label="Phone"
              value={phone}
              onChangeText={(v) => {
                setPhone(v);
                if (errors.phone) setErrors((e) => ({ ...e, phone: undefined }));
              }}
              error={errors.phone}
              keyboardType="phone-pad"
              placeholder="10-digit number"
              containerStyle={{ marginTop: 14 }}
            />
            <Input
              label="Delivery note"
              hint="Optional"
              value={instructions}
              onChangeText={setInstructions}
              placeholder="Ring the bell, leave at door…"
              containerStyle={{ marginTop: 14 }}
            />
          </>
        )}

        {section(
          "Offer",
          <Input
            label="Promo code"
            hint="Optional — validated when the order is placed"
            value={promoCode}
            onChangeText={(v) => setPromoCode(v.toUpperCase())}
            autoCapitalize="characters"
            placeholder="e.g. WELCOME10"
          />
        )}

        {section(
          "Payment",
          <View
            style={[
              styles.payment,
              { borderColor: theme.colors.primary, borderRadius: theme.radius.md },
            ]}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.colors.text, fontWeight: "700" }}>
                Cash on delivery
              </Text>
              <Text style={{ color: theme.colors.textMuted, fontSize: 13, marginTop: 2 }}>
                Pay when your order arrives
              </Text>
            </View>
            <View style={[styles.radioOuter, { borderColor: theme.colors.primary }]}>
              <View style={[styles.radioInner, { backgroundColor: theme.colors.primary }]} />
            </View>
          </View>
        )}

        {totals
          ? section(
              "Bill details",
              <>
                {row("Item total", totals.itemTotal)}
                {row("Delivery fee", totals.deliveryFee)}
                {row("Platform fee", totals.platformFee)}
                {row("Taxes", totals.gst)}
                <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
                {row("To pay", totals.grandTotal, true)}
              </>
            )
          : null}
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
          label="Place order"
          size="lg"
          loading={placing}
          onPress={placeOrder}
          disabled={!cart?.items.length}
        />
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 28 },
  card: { borderWidth: 1, padding: 16, marginBottom: 14 },
  cardTitle: { fontSize: 15, fontWeight: "700", marginBottom: 12 },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 5 },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 10 },
  payment: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    padding: 14,
    gap: 12,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  radioInner: { width: 10, height: 10, borderRadius: 5 },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
