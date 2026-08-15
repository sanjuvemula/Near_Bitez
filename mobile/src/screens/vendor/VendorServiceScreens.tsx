import React, { useState } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import {
  Badge,
  BottomSheet,
  Button,
  EmptyState,
  ErrorState,
  Input,
  Loading,
  Screen,
} from "@/components";
import { vendorApi } from "@/services/api";
import { useApi } from "@/hooks/useApi";
import { useTheme } from "@/hooks/useTheme";
import { useToast } from "@/hooks/useToast";
import { formatCurrency, formatDate } from "@/utils/format";

/**
 * Secondary vendor areas: Tiffin & Services, Delivery and Growth.
 *
 * Grouped in one module because each is a single focused screen over an
 * existing endpoint — splitting them into three files would add structure
 * without adding clarity.
 */

/* ── Tiffin & Services ──────────────────────────────────────────────────── */

type TiffinTab = "plan" | "subscribers";

export const VendorTiffinScreen: React.FC = () => {
  const { theme } = useTheme();
  const toast = useToast();
  const [tab, setTab] = useState<TiffinTab>("plan");
  const [saving, setSaving] = useState(false);

  const restaurant = useApi(() => vendorApi.restaurant(), []);
  const subscribers = useApi(() => vendorApi.tiffinSubscribers(), []);

  const [form, setForm] = useState<{
    tiffinAvailable: boolean;
    tiffinPrice: string;
    tiffinDescription: string;
  } | null>(null);

  // Seed the form once the restaurant loads.
  React.useEffect(() => {
    if (restaurant.data && !form) {
      setForm({
        tiffinAvailable: Boolean(restaurant.data.tiffinAvailable),
        tiffinPrice: String(restaurant.data.tiffinPrice ?? ""),
        tiffinDescription: restaurant.data.tiffinDescription ?? "",
      });
    }
  }, [form, restaurant.data]);

  const savePlan = async () => {
    if (!form) return;
    setSaving(true);
    try {
      await vendorApi.updateRestaurant({
        tiffinAvailable: form.tiffinAvailable,
        tiffinPrice: Number(form.tiffinPrice) || 0,
        tiffinDescription: form.tiffinDescription.trim(),
      });
      toast.success("Tiffin plan saved");
      await restaurant.refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
    } finally {
      setSaving(false);
    }
  };

  if (restaurant.loading && !restaurant.data) return <Loading label="Loading…" />;

  if (restaurant.error && !restaurant.data) {
    return (
      <ErrorState
        title="Couldn't load"
        message={restaurant.error}
        onAction={restaurant.refetch}
      />
    );
  }

  const list = subscribers.data ?? [];
  const activeCount = list.filter((s) => s.status === "ACTIVE").length;

  return (
    <Screen padded={false} edges={["bottom"]}>
      <View style={styles.tabs}>
        {(["plan", "subscribers"] as TiffinTab[]).map((option) => {
          const active = tab === option;
          return (
            <Pressable
              key={option}
              onPress={() => setTab(option)}
              style={[styles.tab, { borderBottomColor: active ? theme.colors.primary : "transparent" }]}
            >
              <Text
                style={{
                  color: active ? theme.colors.text : theme.colors.textMuted,
                  fontWeight: active ? "800" : "600",
                }}
              >
                {option === "plan" ? "Plan" : `Subscribers ${list.length || ""}`}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {tab === "plan" ? (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View
            style={[
              styles.card,
              { backgroundColor: theme.colors.card, borderColor: theme.colors.border, borderRadius: theme.radius.lg },
            ]}
          >
            <View style={styles.switchRow}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.colors.text, fontWeight: "700" }}>
                  Offer tiffin service
                </Text>
                <Text style={{ color: theme.colors.textMuted, fontSize: 12, marginTop: 2 }}>
                  Daily subscription meals for regulars
                </Text>
              </View>
              <Switch
                value={form?.tiffinAvailable ?? false}
                onValueChange={(v) => setForm((f) => (f ? { ...f, tiffinAvailable: v } : f))}
                trackColor={{ true: theme.colors.success, false: theme.colors.border }}
                thumbColor="#fff"
              />
            </View>

            <Input
              label="Monthly price"
              value={form?.tiffinPrice ?? ""}
              onChangeText={(v) =>
                setForm((f) => (f ? { ...f, tiffinPrice: v.replace(/[^0-9]/g, "") } : f))
              }
              keyboardType="numeric"
              placeholder="3000"
              containerStyle={{ marginTop: 14 }}
            />
            <Input
              label="What's included"
              value={form?.tiffinDescription ?? ""}
              onChangeText={(v) => setForm((f) => (f ? { ...f, tiffinDescription: v } : f))}
              multiline
              placeholder="2 rotis, sabzi, dal, rice and salad"
              containerStyle={{ marginTop: 14 }}
            />

            <Button
              label="Save plan"
              fullWidth
              size="lg"
              loading={saving}
              onPress={savePlan}
              style={{ marginTop: 18 }}
            />
          </View>

          <View style={styles.miniStats}>
            <View
              style={[
                styles.miniStat,
                { backgroundColor: theme.colors.card, borderColor: theme.colors.border, borderRadius: theme.radius.md },
              ]}
            >
              <Text style={{ color: theme.colors.success, fontSize: 20, fontWeight: "800" }}>
                {activeCount}
              </Text>
              <Text style={{ color: theme.colors.textMuted, fontSize: 11, fontWeight: "700" }}>
                ACTIVE
              </Text>
            </View>
            <View
              style={[
                styles.miniStat,
                { backgroundColor: theme.colors.card, borderColor: theme.colors.border, borderRadius: theme.radius.md },
              ]}
            >
              <Text style={{ color: theme.colors.text, fontSize: 20, fontWeight: "800" }}>
                {list.length}
              </Text>
              <Text style={{ color: theme.colors.textMuted, fontSize: 11, fontWeight: "700" }}>
                TOTAL
              </Text>
            </View>
          </View>
        </ScrollView>
      ) : (
        <FlatList
          data={list}
          keyExtractor={(item) => item._id}
          initialNumToRender={8}
          windowSize={7}
          removeClippedSubviews
          contentContainerStyle={list.length ? styles.content : styles.contentEmpty}
          refreshControl={
            <RefreshControl
              refreshing={subscribers.loading}
              onRefresh={subscribers.refetch}
              tintColor={theme.colors.primary}
            />
          }
          renderItem={({ item }) => (
            <View
              style={[
                styles.row,
                { backgroundColor: theme.colors.card, borderColor: theme.colors.border, borderRadius: theme.radius.md },
              ]}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.colors.text, fontWeight: "700" }}>
                  {item.customer?.name ?? "Customer"}
                </Text>
                <Text style={{ color: theme.colors.textMuted, fontSize: 13, marginTop: 3 }}>
                  {item.planName ?? "Plan"}
                  {item.endDate ? ` · ends ${formatDate(item.endDate)}` : ""}
                </Text>
              </View>
              <View style={{ alignItems: "flex-end", gap: 5 }}>
                <Text style={{ color: theme.colors.text, fontWeight: "800" }}>
                  {formatCurrency(item.price ?? 0)}
                </Text>
                <Badge
                  label={item.status}
                  tone={item.status === "ACTIVE" ? "success" : "neutral"}
                />
              </View>
            </View>
          )}
          ListEmptyComponent={
            <EmptyState
              title="No subscribers"
              message="Customers who subscribe to your tiffin plan will appear here."
            />
          }
        />
      )}
    </Screen>
  );
};

/* ── Delivery ───────────────────────────────────────────────────────────── */

export const VendorDeliveryScreen: React.FC = () => {
  const { theme } = useTheme();
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const { data, loading, error, refetch } = useApi(() => vendorApi.logistics(), []);

  const [form, setForm] = useState<{
    deliveryRadiusKm: string;
    baseDeliveryFee: string;
    freeDeliveryAbove: string;
    isSelfDelivery: boolean;
  } | null>(null);

  React.useEffect(() => {
    if (data && !form) {
      setForm({
        deliveryRadiusKm: String(data.deliveryRadiusKm ?? ""),
        baseDeliveryFee: String(data.baseDeliveryFee ?? ""),
        freeDeliveryAbove: String(data.freeDeliveryAbove ?? ""),
        isSelfDelivery: Boolean(data.isSelfDelivery),
      });
    }
  }, [data, form]);

  const save = async () => {
    if (!form) return;
    setSaving(true);
    try {
      await vendorApi.updateLogistics({
        deliveryRadiusKm: Number(form.deliveryRadiusKm) || 1,
        baseDeliveryFee: Number(form.baseDeliveryFee) || 0,
        freeDeliveryAbove: Number(form.freeDeliveryAbove) || 0,
        isSelfDelivery: form.isSelfDelivery,
      });
      toast.success("Delivery settings saved");
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
    } finally {
      setSaving(false);
    }
  };

  if (loading && !data) return <Loading label="Loading delivery…" />;
  if (error && !data) return <ErrorState title="Couldn't load" message={error} onAction={refetch} />;

  return (
    <Screen scroll>
      <View
        style={[
          styles.card,
          { backgroundColor: theme.colors.card, borderColor: theme.colors.border, borderRadius: theme.radius.lg },
        ]}
      >
        <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Coverage</Text>
        <Input
          label="Delivery radius (km)"
          value={form?.deliveryRadiusKm ?? ""}
          onChangeText={(v) =>
            setForm((f) => (f ? { ...f, deliveryRadiusKm: v.replace(/[^0-9.]/g, "") } : f))
          }
          keyboardType="numeric"
          hint="How far you'll deliver from your location"
        />
        <Input
          label="Base delivery fee"
          value={form?.baseDeliveryFee ?? ""}
          onChangeText={(v) =>
            setForm((f) => (f ? { ...f, baseDeliveryFee: v.replace(/[^0-9]/g, "") } : f))
          }
          keyboardType="numeric"
          containerStyle={{ marginTop: 14 }}
        />
        <Input
          label="Free delivery above"
          value={form?.freeDeliveryAbove ?? ""}
          onChangeText={(v) =>
            setForm((f) => (f ? { ...f, freeDeliveryAbove: v.replace(/[^0-9]/g, "") } : f))
          }
          keyboardType="numeric"
          hint="Order value that waives the fee"
          containerStyle={{ marginTop: 14 }}
        />

        <View style={[styles.switchRow, { marginTop: 8 }]}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.colors.text, fontWeight: "700" }}>Self delivery</Text>
            <Text style={{ color: theme.colors.textMuted, fontSize: 12, marginTop: 2 }}>
              You handle delivery yourself
            </Text>
          </View>
          <Switch
            value={form?.isSelfDelivery ?? false}
            onValueChange={(v) => setForm((f) => (f ? { ...f, isSelfDelivery: v } : f))}
            trackColor={{ true: theme.colors.success, false: theme.colors.border }}
            thumbColor="#fff"
          />
        </View>

        <Button
          label="Save settings"
          fullWidth
          size="lg"
          loading={saving}
          onPress={save}
          style={{ marginTop: 14 }}
        />
      </View>

      {/* A map view is deliberately omitted: the backend stores a single
          lat/lng and a radius, which these fields already express. Adding
          react-native-maps here would need a native rebuild for no new
          capability. */}
      {data?.location?.lat && data?.location?.lng ? (
        <View
          style={[
            styles.card,
            { backgroundColor: theme.colors.card, borderColor: theme.colors.border, borderRadius: theme.radius.lg },
          ]}
        >
          <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Your location</Text>
          <Text style={{ color: theme.colors.textMuted }}>
            {data.location.lat.toFixed(5)}, {data.location.lng.toFixed(5)}
          </Text>
        </View>
      ) : null}
    </Screen>
  );
};

/* ── Growth ─────────────────────────────────────────────────────────────── */

export const VendorGrowthScreen: React.FC = () => {
  const { theme } = useTheme();
  const toast = useToast();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [form, setForm] = useState({ code: "", discountValue: "", minOrderValue: "" });

  const { data, loading, error, refetch } = useApi(() => vendorApi.promos(), []);

  const create = async () => {
    if (!form.code.trim()) return toast.error("Promo code is required");
    const value = Number(form.discountValue);
    if (!Number.isFinite(value) || value <= 0) return toast.error("Enter a discount value");

    setCreating(true);
    try {
      await vendorApi.createPromo({
        code: form.code.trim().toUpperCase(),
        discountType: "PERCENT",
        discountValue: value,
        minOrderValue: Number(form.minOrderValue) || 0,
      });
      toast.success("Promo created");
      setSheetOpen(false);
      setForm({ code: "", discountValue: "", minOrderValue: "" });
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create promo");
    } finally {
      setCreating(false);
    }
  };

  const toggle = async (id: string, isActive: boolean) => {
    setPendingId(id);
    try {
      await vendorApi.togglePromo(id, !isActive);
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update");
    } finally {
      setPendingId(null);
    }
  };

  if (loading && !data) return <Loading label="Loading campaigns…" />;
  if (error && !data) return <ErrorState title="Couldn't load" message={error} onAction={refetch} />;

  const promos = data ?? [];

  return (
    <Screen padded={false} edges={["bottom"]}>
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <View>
          <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: "800" }}>
            Promotions
          </Text>
          <Text style={{ color: theme.colors.textMuted, fontSize: 12, marginTop: 2 }}>
            {promos.filter((p) => p.isActive).length} active
          </Text>
        </View>
        <Button label="New promo" size="sm" onPress={() => setSheetOpen(true)} />
      </View>

      <FlatList
        data={promos}
        keyExtractor={(item) => item._id}
        initialNumToRender={8}
        windowSize={7}
        contentContainerStyle={promos.length ? styles.content : styles.contentEmpty}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refetch} tintColor={theme.colors.primary} />
        }
        renderItem={({ item }) => (
          <View
            style={[
              styles.row,
              {
                backgroundColor: theme.colors.card,
                borderColor: theme.colors.border,
                borderRadius: theme.radius.md,
                opacity: pendingId === item._id ? 0.6 : 1,
              },
            ]}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.colors.text, fontWeight: "800", letterSpacing: 0.5 }}>
                {item.code}
              </Text>
              <Text style={{ color: theme.colors.textMuted, fontSize: 13, marginTop: 3 }}>
                {item.discountValue}
                {item.discountType === "PERCENT" ? "%" : ""} off
                {item.minOrderValue ? ` · above ${formatCurrency(item.minOrderValue)}` : ""}
              </Text>
              {typeof item.usedCount === "number" ? (
                <Text style={{ color: theme.colors.textFaint, fontSize: 12, marginTop: 3 }}>
                  Used {item.usedCount} time{item.usedCount === 1 ? "" : "s"}
                </Text>
              ) : null}
            </View>
            <Switch
              value={item.isActive}
              disabled={pendingId === item._id}
              onValueChange={() => void toggle(item._id, item.isActive)}
              trackColor={{ true: theme.colors.success, false: theme.colors.border }}
              thumbColor="#fff"
            />
          </View>
        )}
        ListEmptyComponent={
          <EmptyState
            title="No promotions"
            message="Create a promo code to bring customers back."
            actionLabel="New promo"
            onAction={() => setSheetOpen(true)}
          />
        }
      />

      <BottomSheet visible={sheetOpen} onClose={() => setSheetOpen(false)} title="New promo code">
        <Input
          label="Code"
          value={form.code}
          onChangeText={(v) => setForm((f) => ({ ...f, code: v.toUpperCase() }))}
          autoCapitalize="characters"
          placeholder="WELCOME10"
        />
        <Input
          label="Discount %"
          value={form.discountValue}
          onChangeText={(v) => setForm((f) => ({ ...f, discountValue: v.replace(/[^0-9]/g, "") }))}
          keyboardType="numeric"
          placeholder="10"
          containerStyle={{ marginTop: 12 }}
        />
        <Input
          label="Minimum order"
          hint="Optional"
          value={form.minOrderValue}
          onChangeText={(v) => setForm((f) => ({ ...f, minOrderValue: v.replace(/[^0-9]/g, "") }))}
          keyboardType="numeric"
          placeholder="200"
          containerStyle={{ marginTop: 12 }}
        />
        <Button
          label="Create promo"
          fullWidth
          size="lg"
          loading={creating}
          onPress={create}
          style={{ marginTop: 18 }}
        />
      </BottomSheet>
    </Screen>
  );
};

const styles = StyleSheet.create({
  tabs: { flexDirection: "row", paddingHorizontal: 16 },
  tab: { paddingVertical: 13, marginRight: 22, borderBottomWidth: 2 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  content: { padding: 16, paddingBottom: 32 },
  contentEmpty: { flexGrow: 1 },
  card: { borderWidth: 1, padding: 16, marginBottom: 14 },
  cardTitle: { fontSize: 15, fontWeight: "700", marginBottom: 12 },
  switchRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10 },
  miniStats: { flexDirection: "row", gap: 10 },
  miniStat: { flex: 1, borderWidth: 1, padding: 14, alignItems: "center" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 8,
  },
});
