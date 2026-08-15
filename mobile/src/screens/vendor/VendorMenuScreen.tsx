import React, { useCallback, useState } from "react";
import {
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
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
import { formatCurrency } from "@/utils/format";
import type { MenuItem } from "@/types/models";

interface FormState {
  name: string;
  price: string;
  description: string;
  category: string;
  isVeg: boolean;
  isAvailable: boolean;
  imageUri: string | null;
}

const EMPTY_FORM: FormState = {
  name: "",
  price: "",
  description: "",
  category: "",
  isVeg: true,
  isAvailable: true,
  imageUri: null,
};

/**
 * Menu management.
 *
 * Add/edit happens in a bottom sheet rather than a separate screen — it keeps
 * the list in view and is the expected mobile pattern for a short form.
 *
 * Images are sent as multipart to the same route the web app posts to, so the
 * existing Cloudinary middleware handles the upload; nothing is duplicated.
 */
export const VendorMenuScreen: React.FC = () => {
  const { theme } = useTheme();
  const toast = useToast();

  const { data, loading, error, isNetworkError, refetch } = useApi(
    () => vendorApi.menu(),
    []
  );

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<MenuItem | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setSheetOpen(true);
  };

  const openEdit = (item: MenuItem) => {
    setEditing(item);
    setForm({
      name: item.name,
      price: String(item.price ?? ""),
      description: item.description ?? "",
      category: item.category ?? "",
      isVeg: item.isVeg ?? true,
      isAvailable: item.isAvailable,
      imageUri: item.imageUrl ?? null,
    });
    setSheetOpen(true);
  };

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      toast.error("Photo access is needed to add a dish image");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      // Compress before upload — full-resolution phone photos are needlessly
      // large for a menu thumbnail.
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0]) {
      setForm((f) => ({ ...f, imageUri: result.assets[0].uri }));
    }
  };

  const save = async () => {
    if (!form.name.trim()) return toast.error("Name is required");
    const price = Number(form.price);
    if (!Number.isFinite(price) || price < 0) return toast.error("Enter a valid price");

    setSaving(true);
    try {
      // Only send multipart when a new local image was picked; otherwise a
      // plain JSON body keeps the existing Cloudinary URL untouched.
      const isNewImage = Boolean(form.imageUri && form.imageUri.startsWith("file"));

      let payload: FormData | Record<string, unknown>;
      if (isNewImage) {
        const body = new FormData();
        body.append("name", form.name.trim());
        body.append("price", String(price));
        body.append("description", form.description.trim());
        body.append("category", form.category.trim());
        body.append("isVeg", String(form.isVeg));
        body.append("isAvailable", String(form.isAvailable));
        body.append("image", {
          uri: form.imageUri as string,
          name: "dish.jpg",
          type: "image/jpeg",
        } as unknown as Blob);
        payload = body;
      } else {
        payload = {
          name: form.name.trim(),
          price,
          description: form.description.trim(),
          category: form.category.trim(),
          isVeg: form.isVeg,
          isAvailable: form.isAvailable,
        };
      }

      if (editing) await vendorApi.updateMenuItem(editing._id, payload);
      else await vendorApi.createMenuItem(payload);

      toast.success(editing ? "Item updated" : "Item added");
      setSheetOpen(false);
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save item");
    } finally {
      setSaving(false);
    }
  };

  const toggleAvailability = useCallback(
    async (item: MenuItem) => {
      setPendingId(item._id);
      try {
        await vendorApi.toggleAvailability(item._id, !item.isAvailable);
        await refetch();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not update");
      } finally {
        setPendingId(null);
      }
    },
    [refetch, toast]
  );

  const remove = async (item: MenuItem) => {
    setPendingId(item._id);
    try {
      await vendorApi.deleteMenuItem(item._id);
      toast.success("Item removed");
      setSheetOpen(false);
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete");
    } finally {
      setPendingId(null);
    }
  };

  if (loading && !data) return <Loading label="Loading menu…" />;

  if (error && !data) {
    return (
      <ErrorState
        title="Couldn't load menu"
        message={error}
        isNetworkError={isNetworkError}
        onAction={refetch}
      />
    );
  }

  const items = data ?? [];

  return (
    <Screen padded={false} edges={["top"]}>
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <View>
          <Text style={{ color: theme.colors.text, fontSize: 20, fontWeight: "800" }}>
            Menu
          </Text>
          <Text style={{ color: theme.colors.textMuted, fontSize: 12, marginTop: 2 }}>
            {items.filter((i) => i.isAvailable).length} of {items.length} live
          </Text>
        </View>
        <Button label="Add item" size="sm" onPress={openCreate} />
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item._id}
        initialNumToRender={8}
        maxToRenderPerBatch={10}
        windowSize={7}
        removeClippedSubviews
        contentContainerStyle={items.length ? styles.list : styles.listEmpty}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={refetch}
            tintColor={theme.colors.primary}
          />
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => openEdit(item)}
            style={({ pressed }) => [
              styles.row,
              {
                backgroundColor: theme.colors.card,
                borderColor: theme.colors.border,
                borderRadius: theme.radius.lg,
                opacity: pressed || pendingId === item._id ? 0.7 : 1,
              },
            ]}
          >
            {item.imageUrl ? (
              <Image
                source={{ uri: item.imageUrl }}
                style={[styles.thumb, { borderRadius: theme.radius.md }]}
              />
            ) : (
              <View
                style={[
                  styles.thumb,
                  styles.thumbFallback,
                  { backgroundColor: theme.colors.surface, borderRadius: theme.radius.md },
                ]}
              >
                <Text style={{ fontSize: 20 }}>🍽️</Text>
              </View>
            )}

            <View style={{ flex: 1 }}>
              <Text
                numberOfLines={1}
                style={{ color: theme.colors.text, fontWeight: "700", fontSize: 15 }}
              >
                {item.name}
              </Text>
              <Text style={{ color: theme.colors.textMuted, marginTop: 3 }}>
                {formatCurrency(item.price)}
                {item.category ? ` · ${item.category}` : ""}
              </Text>
              {!item.isAvailable ? (
                <View style={{ marginTop: 6, alignSelf: "flex-start" }}>
                  <Badge label="Sold out" tone="error" />
                </View>
              ) : null}
            </View>

            <Switch
              value={item.isAvailable}
              disabled={pendingId === item._id}
              onValueChange={() => void toggleAvailability(item)}
              trackColor={{ true: theme.colors.success, false: theme.colors.border }}
              thumbColor="#fff"
            />
          </Pressable>
        )}
        ListEmptyComponent={
          <EmptyState
            title="No menu items"
            message="Add your first dish so customers can order."
            actionLabel="Add item"
            onAction={openCreate}
          />
        }
      />

      <BottomSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={editing ? "Edit item" : "Add item"}
      >
        <Pressable onPress={pickImage} style={styles.imagePicker}>
          {form.imageUri ? (
            <Image
              source={{ uri: form.imageUri }}
              style={[styles.preview, { borderRadius: theme.radius.md }]}
            />
          ) : (
            <View
              style={[
                styles.preview,
                styles.previewEmpty,
                { borderColor: theme.colors.borderStrong, borderRadius: theme.radius.md },
              ]}
            >
              <Text style={{ color: theme.colors.textMuted }}>+ Add photo</Text>
            </View>
          )}
          {form.imageUri ? (
            <View style={styles.imageActions}>
              <Pressable onPress={pickImage} hitSlop={8}>
                <Text style={{ color: theme.colors.primaryText, fontWeight: "700" }}>
                  Replace
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setForm((f) => ({ ...f, imageUri: null }))}
                hitSlop={8}
              >
                <Text style={{ color: theme.colors.error }}>Remove</Text>
              </Pressable>
            </View>
          ) : null}
        </Pressable>

        <Input
          label="Name"
          value={form.name}
          onChangeText={(v) => setForm((f) => ({ ...f, name: v }))}
          placeholder="Paneer butter masala"
        />
        <Input
          label="Price"
          value={form.price}
          onChangeText={(v) => setForm((f) => ({ ...f, price: v.replace(/[^0-9.]/g, "") }))}
          keyboardType="numeric"
          placeholder="150"
          containerStyle={{ marginTop: 12 }}
        />
        <Input
          label="Category"
          value={form.category}
          onChangeText={(v) => setForm((f) => ({ ...f, category: v }))}
          placeholder="Main course"
          containerStyle={{ marginTop: 12 }}
        />
        <Input
          label="Description"
          hint="Optional"
          value={form.description}
          onChangeText={(v) => setForm((f) => ({ ...f, description: v }))}
          multiline
          containerStyle={{ marginTop: 12 }}
        />

        <View style={styles.switchRow}>
          <Text style={{ color: theme.colors.text, fontWeight: "600" }}>Vegetarian</Text>
          <Switch
            value={form.isVeg}
            onValueChange={(v) => setForm((f) => ({ ...f, isVeg: v }))}
            trackColor={{ true: theme.colors.success, false: theme.colors.border }}
            thumbColor="#fff"
          />
        </View>
        <View style={styles.switchRow}>
          <Text style={{ color: theme.colors.text, fontWeight: "600" }}>Available now</Text>
          <Switch
            value={form.isAvailable}
            onValueChange={(v) => setForm((f) => ({ ...f, isAvailable: v }))}
            trackColor={{ true: theme.colors.success, false: theme.colors.border }}
            thumbColor="#fff"
          />
        </View>

        <Button
          label={editing ? "Save changes" : "Add to menu"}
          fullWidth
          size="lg"
          loading={saving}
          onPress={save}
          style={{ marginTop: 18 }}
        />

        {editing ? (
          <Button
            label="Delete item"
            variant="ghost"
            fullWidth
            onPress={() => void remove(editing)}
            style={{ marginTop: 6 }}
          />
        ) : null}
      </BottomSheet>
    </Screen>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  list: { padding: 16, paddingBottom: 32 },
  listEmpty: { flexGrow: 1 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
  },
  thumb: { width: 56, height: 56 },
  thumbFallback: { alignItems: "center", justifyContent: "center" },
  imagePicker: { marginBottom: 16 },
  preview: { width: "100%", height: 150 },
  previewEmpty: {
    borderWidth: 1.5,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },
  imageActions: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
  },
});
