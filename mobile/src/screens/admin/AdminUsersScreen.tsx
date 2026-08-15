import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import {
  Avatar,
  Badge,
  BottomSheet,
  Button,
  DetailRow,
  EmptyState,
  ErrorState,
  FilterChips,
  Input,
  Loading,
  Modal,
  Screen,
} from "@/components";
import { adminApi } from "@/services/api";
import { useAuth } from "@/hooks/useAuth";
import { useDebounced } from "@/hooks/useDebounced";
import { useTheme } from "@/hooks/useTheme";
import { useToast } from "@/hooks/useToast";
import { formatDate } from "@/utils/format";
import { ROLE_TONE, titleCase } from "@/utils/admin";
import type { AdminUser } from "@/types/admin";

const PAGE_SIZE = 40;

const FILTERS = [
  { label: "All", value: "all" },
  { label: "Customers", value: "customer" },
  { label: "Restaurants", value: "vendor" },
  { label: "Admins", value: "admin" },
];

/** Roles the server's USER_ROLES enum accepts. "rider" is not one of them. */
const ASSIGNABLE_ROLES = ["customer", "vendor", "admin"];

/**
 * User directory.
 *
 * Role and search filtering happen server-side, and the response is paginated,
 * so the app holds one page at a time rather than the whole user table.
 *
 * Only the fields an admin needs to identify and support an account are shown.
 * The API already strips password and points history before responding.
 */
export const AdminUsersScreen: React.FC = () => {
  const { theme } = useTheme();
  const toast = useToast();
  const { user: me } = useAuth();

  const [query, setQuery] = useState("");
  const [role, setRole] = useState("all");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selected, setSelected] = useState<AdminUser | null>(null);
  const [confirm, setConfirm] = useState<null | { title: string; body: string; run: () => Promise<void> }>(null);
  const [busy, setBusy] = useState(false);

  const search = useDebounced(query, 350).trim();
  const requestId = useRef(0);

  const load = useCallback(
    async (nextPage: number, mode: "replace" | "append") => {
      const id = ++requestId.current;
      if (mode === "append") setLoadingMore(true);
      else setLoading(true);

      try {
        const result = await adminApi.users({
          role: role === "all" ? undefined : role,
          search: search || undefined,
          page: nextPage,
          limit: PAGE_SIZE,
        });
        if (id !== requestId.current) return;

        setUsers((prev) => (mode === "append" ? [...prev, ...result.data] : result.data));
        setTotal(result.pagination?.total ?? result.total ?? result.data.length);
        setHasNext(Boolean(result.pagination?.hasNextPage));
        setPage(nextPage);
        setError(null);
      } catch (err) {
        if (id !== requestId.current) return;
        setError(err instanceof Error ? err.message : "Could not load users");
      } finally {
        if (id === requestId.current) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [role, search]
  );

  useEffect(() => {
    void load(1, "replace");
  }, [load]);

  const changeRole = useCallback(
    async (target: AdminUser, nextRole: string) => {
      setBusy(true);
      try {
        const updated = await adminApi.updateUserRole(target._id, nextRole);
        setUsers((prev) => prev.map((row) => (row._id === target._id ? updated : row)));
        setSelected(updated);
        toast.success(`${updated.name} is now a ${titleCase(nextRole).toLowerCase()}`);
      } catch (err) {
        // The server blocks demoting a system admin, self-demotion, and vendors
        // who still own a restaurant — surface its reason verbatim.
        toast.error(err instanceof Error ? err.message : "Could not change role");
      } finally {
        setBusy(false);
        setConfirm(null);
      }
    },
    [toast]
  );

  const removeUser = useCallback(
    async (target: AdminUser) => {
      setBusy(true);
      try {
        await adminApi.deleteUser(target._id);
        setUsers((prev) => prev.filter((row) => row._id !== target._id));
        setTotal((prev) => Math.max(0, prev - 1));
        setSelected(null);
        toast.success("Account deleted");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not delete account");
      } finally {
        setBusy(false);
        setConfirm(null);
      }
    },
    [toast]
  );

  const renderItem = useCallback(
    ({ item }: { item: AdminUser }) => <UserRow item={item} onPress={() => setSelected(item)} />,
    []
  );

  if (loading && !users.length) return <Loading label="Loading users…" />;
  if (error && !users.length) {
    return <ErrorState title="Couldn't load" message={error} onAction={() => load(1, "replace")} />;
  }

  const isSelf = selected?._id === me?._id;
  const locked = Boolean(selected?.isSystemAdmin) || isSelf;

  return (
    <Screen padded={false} edges={["bottom"]}>
      <View style={styles.searchWrap}>
        <Input
          value={query}
          onChangeText={setQuery}
          placeholder="Search name, email or phone"
          autoCorrect={false}
          autoCapitalize="none"
        />
      </View>

      <FilterChips options={FILTERS} value={role} onChange={setRole} />

      <FlatList
        data={users}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        initialNumToRender={14}
        windowSize={9}
        removeClippedSubviews
        onEndReached={() => {
          if (!loadingMore && !loading && hasNext) void load(page + 1, "append");
        }}
        onEndReachedThreshold={0.5}
        contentContainerStyle={users.length ? undefined : styles.empty}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={() => load(1, "replace")}
            tintColor={theme.colors.primary}
          />
        }
        ListHeaderComponent={
          users.length ? (
            <Text style={[styles.count, { color: theme.colors.textMuted }]}>
              Showing {users.length} of {total}
            </Text>
          ) : null
        }
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator color={theme.colors.primary} style={{ paddingVertical: 20 }} />
          ) : null
        }
        ListEmptyComponent={
          <EmptyState
            title="No users"
            message={search || role !== "all" ? "Nothing matches this search or filter." : undefined}
          />
        }
      />

      {/* ── Account sheet ─────────────────────────────────────────────── */}
      <BottomSheet visible={Boolean(selected)} onClose={() => setSelected(null)} title={selected?.name}>
        {selected ? (
          <>
            <DetailRow label="Email" value={selected.email} />
            <DetailRow label="Phone" value={selected.phone} />
            <DetailRow label="Role" value={titleCase(selected.role)} />
            <DetailRow label="Joined" value={formatDate(selected.createdAt)} />
            <DetailRow label="Loyalty points" value={selected.loyaltyPoints ?? 0} />
            <DetailRow label="Tier" value={titleCase(selected.loyaltyTier)} />

            {locked ? (
              <Text style={{ color: theme.colors.textMuted, fontSize: 12, marginTop: 14, lineHeight: 17 }}>
                {isSelf
                  ? "This is your own account — role and deletion are blocked."
                  : "This account is a system admin, so its role cannot be changed here."}
              </Text>
            ) : (
              <>
                <Text style={[styles.sheetLabel, { color: theme.colors.textMuted }]}>CHANGE ROLE</Text>
                <View style={styles.roleRow}>
                  {ASSIGNABLE_ROLES.map((option) => (
                    <Button
                      key={option}
                      label={titleCase(option)}
                      size="sm"
                      variant={selected.role === option ? "primary" : "secondary"}
                      disabled={selected.role === option || busy}
                      onPress={() =>
                        setConfirm({
                          title: `Make ${selected.name} a ${titleCase(option).toLowerCase()}?`,
                          body:
                            option === "admin"
                              ? "This grants full access to every restaurant, order, user and financial record on the platform."
                              : "The account's access changes immediately.",
                          run: () => changeRole(selected, option),
                        })
                      }
                    />
                  ))}
                </View>

                <Button
                  label="Delete account"
                  variant="danger"
                  fullWidth
                  onPress={() =>
                    setConfirm({
                      title: `Delete ${selected.name}?`,
                      body:
                        selected.role === "vendor"
                          ? "Their restaurant, menu, promos and tiffin subscriptions are deleted too. This cannot be undone."
                          : "The account is removed permanently. This cannot be undone.",
                      run: () => removeUser(selected),
                    })
                  }
                  style={{ marginTop: 18 }}
                />
              </>
            )}
          </>
        ) : null}
      </BottomSheet>

      <Modal visible={Boolean(confirm)} onClose={() => setConfirm(null)} title={confirm?.title}>
        <Text style={{ color: theme.colors.textMuted, lineHeight: 20 }}>{confirm?.body}</Text>
        <View style={styles.modalActions}>
          <Button label="Cancel" variant="secondary" onPress={() => setConfirm(null)} />
          <Button label="Confirm" variant="danger" loading={busy} onPress={() => void confirm?.run()} />
        </View>
      </Modal>
    </Screen>
  );
};

const UserRow = React.memo<{ item: AdminUser; onPress: () => void }>(({ item, onPress }) => {
  const { theme } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        {
          borderBottomColor: theme.colors.border,
          backgroundColor: pressed ? theme.colors.surface : "transparent",
        },
      ]}
    >
      <Avatar name={item.name} uri={item.avatarUrl} size={42} />
      <View style={{ flex: 1 }}>
        <Text numberOfLines={1} style={{ color: theme.colors.text, fontWeight: "700" }}>
          {item.name}
        </Text>
        <Text numberOfLines={1} style={{ color: theme.colors.textMuted, fontSize: 12, marginTop: 2 }}>
          {item.email}
        </Text>
      </View>
      <View style={{ alignItems: "flex-end", gap: 4 }}>
        <Badge label={titleCase(item.role)} tone={ROLE_TONE[item.role] ?? "neutral"} />
        <Text style={{ color: theme.colors.textFaint, fontSize: 11 }}>
          {formatDate(item.createdAt)}
        </Text>
      </View>
    </Pressable>
  );
});
UserRow.displayName = "UserRow";

const styles = StyleSheet.create({
  searchWrap: { paddingHorizontal: 16, paddingTop: 10 },
  empty: { flexGrow: 1 },
  count: { fontSize: 12, fontWeight: "600", paddingHorizontal: 16, paddingBottom: 6 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sheetLabel: { fontSize: 11, fontWeight: "800", letterSpacing: 0.8, marginTop: 20, marginBottom: 8 },
  roleRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  modalActions: { flexDirection: "row", justifyContent: "flex-end", gap: 10, marginTop: 20 },
});
