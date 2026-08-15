import React, { useState } from "react";
import { Image, Pressable, StyleSheet, Switch, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Button, ErrorState, Input, Loading, Screen } from "@/components";
import { vendorApi } from "@/services/api";
import { useApi } from "@/hooks/useApi";
import { useTheme } from "@/hooks/useTheme";
import { useToast } from "@/hooks/useToast";
import { useVendor } from "@/hooks/useVendor";

/**
 * Store profile.
 *
 * Sends multipart only when a new photo is picked, so saving text fields never
 * re-uploads the existing Cloudinary image.
 */
export const VendorStoreProfileScreen: React.FC = () => {
  const { theme } = useTheme();
  const toast = useToast();
  const { refresh } = useVendor();
  const [saving, setSaving] = useState(false);

  const { data, loading, error, refetch } = useApi(() => vendorApi.restaurant(), []);

  const [form, setForm] = useState<{
    name: string;
    address: string;
    category: string;
    description: string;
    deliveryTime: string;
    isVegOnly: boolean;
    imageUri: string | null;
  } | null>(null);

  React.useEffect(() => {
    if (data && !form) {
      setForm({
        name: data.name ?? "",
        address: data.address ?? "",
        category: data.category ?? "",
        description: data.description ?? "",
        deliveryTime: String(data.deliveryTime ?? 30),
        isVegOnly: Boolean(data.isVegOnly),
        imageUri: data.imageUrl ?? null,
      });
    }
  }, [data, form]);

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return toast.error("Photo access is needed");

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      setForm((f) => (f ? { ...f, imageUri: result.assets[0].uri } : f));
    }
  };

  const save = async () => {
    if (!form) return;
    if (!form.name.trim() || !form.address.trim() || !form.category.trim()) {
      return toast.error("Name, address and category are required");
    }

    setSaving(true);
    try {
      const isNewImage = Boolean(form.imageUri?.startsWith("file"));

      let payload: FormData | Record<string, unknown>;
      if (isNewImage) {
        const body = new FormData();
        body.append("name", form.name.trim());
        body.append("address", form.address.trim());
        body.append("category", form.category.trim());
        body.append("description", form.description.trim());
        body.append("deliveryTime", String(Number(form.deliveryTime) || 30));
        body.append("isVegOnly", String(form.isVegOnly));
        body.append("image", {
          uri: form.imageUri as string,
          name: "store.jpg",
          type: "image/jpeg",
        } as unknown as Blob);
        payload = body;
      } else {
        payload = {
          name: form.name.trim(),
          address: form.address.trim(),
          category: form.category.trim(),
          description: form.description.trim(),
          deliveryTime: Number(form.deliveryTime) || 30,
          isVegOnly: form.isVegOnly,
        };
      }

      await vendorApi.updateRestaurant(payload);
      toast.success("Store profile saved");
      await refetch();
      await refresh({ silent: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
    } finally {
      setSaving(false);
    }
  };

  if (loading && !data) return <Loading label="Loading profile…" />;
  if (error && !data) return <ErrorState title="Couldn't load" message={error} onAction={refetch} />;

  return (
    <Screen scroll>
      <Pressable onPress={pickImage} style={{ marginBottom: 16 }}>
        {form?.imageUri ? (
          <Image
            source={{ uri: form.imageUri }}
            style={[styles.image, { borderRadius: theme.radius.lg }]}
          />
        ) : (
          <View
            style={[
              styles.image,
              styles.imageEmpty,
              { borderColor: theme.colors.borderStrong, borderRadius: theme.radius.lg },
            ]}
          >
            <Text style={{ color: theme.colors.textMuted }}>+ Add store photo</Text>
          </View>
        )}
      </Pressable>

      <Input
        label="Restaurant name"
        value={form?.name ?? ""}
        onChangeText={(v) => setForm((f) => (f ? { ...f, name: v } : f))}
      />
      <Input
        label="Category"
        value={form?.category ?? ""}
        onChangeText={(v) => setForm((f) => (f ? { ...f, category: v } : f))}
        placeholder="North Indian"
        containerStyle={{ marginTop: 14 }}
      />
      <Input
        label="Address"
        value={form?.address ?? ""}
        onChangeText={(v) => setForm((f) => (f ? { ...f, address: v } : f))}
        multiline
        containerStyle={{ marginTop: 14 }}
      />
      <Input
        label="Description"
        hint="Optional"
        value={form?.description ?? ""}
        onChangeText={(v) => setForm((f) => (f ? { ...f, description: v } : f))}
        multiline
        containerStyle={{ marginTop: 14 }}
      />
      <Input
        label="Average prep time (min)"
        value={form?.deliveryTime ?? ""}
        onChangeText={(v) =>
          setForm((f) => (f ? { ...f, deliveryTime: v.replace(/[^0-9]/g, "") } : f))
        }
        keyboardType="numeric"
        containerStyle={{ marginTop: 14 }}
      />

      <View style={styles.switchRow}>
        <Text style={{ color: theme.colors.text, fontWeight: "600" }}>Pure vegetarian</Text>
        <Switch
          value={form?.isVegOnly ?? false}
          onValueChange={(v) => setForm((f) => (f ? { ...f, isVegOnly: v } : f))}
          trackColor={{ true: theme.colors.success, false: theme.colors.border }}
          thumbColor="#fff"
        />
      </View>

      <Button
        label="Save profile"
        fullWidth
        size="lg"
        loading={saving}
        onPress={save}
        style={{ marginTop: 12 }}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  image: { width: "100%", height: 160 },
  imageEmpty: {
    borderWidth: 1.5,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
  },
});
