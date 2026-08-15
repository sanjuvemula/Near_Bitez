import React, { useCallback } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ErrorState, Loading, Screen } from "@/components";
import { RestaurantCard } from "@/components/RestaurantCard";
import { restaurantApi } from "@/services/api";
import { useApi } from "@/hooks/useApi";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/useNotifications";
import { useTheme } from "@/hooks/useTheme";
import type { CustomerStackParamList } from "@/types/navigation";
import type { Restaurant } from "@/types/models";

type Nav = NativeStackNavigationProp<CustomerStackParamList>;

/**
 * Home / discovery.
 *
 * Built on the single /restaurants/discover call the web app uses, which
 * already returns categories, collections and popular dishes — so this is one
 * request, not five. Laid out as stacked mobile rails rather than the web grid.
 */
export const HomeScreen: React.FC = () => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation<Nav>();
  const { unreadCount } = useNotifications();

  const { data, loading, error, isNetworkError, refetch } = useApi(
    () => restaurantApi.discover(),
    []
  );

  const openRestaurant = useCallback(
    (id: string) => navigation.navigate("RestaurantDetail", { restaurantId: id }),
    [navigation]
  );

  if (loading && !data) return <Loading label="Finding food near you…" />;

  if (error && !data) {
    return (
      <ErrorState
        title="Couldn't load"
        message={error}
        isNetworkError={isNetworkError}
        onAction={refetch}
      />
    );
  }

  const all = data?.restaurants ?? [];
  const featured = data?.featuredRestaurants?.length ? data.featuredRestaurants : all;
  const nearest = data?.nearestRestaurants ?? [];
  const categories = data?.categories ?? [];

  const Rail = ({ title, items }: { title: string; items: Restaurant[] }) =>
    items.length ? (
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{title}</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.rail}
        >
          {items.slice(0, 10).map((item) => (
            <RestaurantCard
              key={item._id}
              restaurant={item}
              variant="compact"
              onPress={() => openRestaurant(item._id)}
            />
          ))}
        </ScrollView>
      </View>
    ) : null;

  return (
    <Screen padded={false} edges={["top"]}>
      <FlatList
        data={all}
        keyExtractor={(item) => item._id}
        // Windowed rendering — the full restaurant list can be long.
        initialNumToRender={6}
        maxToRenderPerBatch={8}
        windowSize={9}
        removeClippedSubviews
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={refetch}
            tintColor={theme.colors.primary}
          />
        }
        ListHeaderComponent={
          <View>
            <View style={styles.header}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.greeting, { color: theme.colors.textMuted }]}>
                  Hi {user?.name?.split(" ")[0] || "there"}
                </Text>
                <Text style={[styles.title, { color: theme.colors.text }]}>
                  What are you craving?
                </Text>
              </View>

              <Pressable
                onPress={() => navigation.navigate("Notifications")}
                accessibilityLabel="Notifications"
                hitSlop={10}
                style={[
                  styles.bell,
                  {
                    backgroundColor: theme.colors.card,
                    borderColor: theme.colors.border,
                    borderRadius: theme.radius.md,
                  },
                ]}
              >
                <Text style={{ fontSize: 17 }}>🔔</Text>
                {unreadCount > 0 ? (
                  <View
                    style={[styles.bellDot, { backgroundColor: theme.colors.error }]}
                  />
                ) : null}
              </Pressable>
            </View>

            {/* Tapping search hands off to the dedicated screen rather than
                filtering inline — keeps Home light. */}
            <Pressable
              onPress={() => navigation.navigate("Tabs", { screen: "Search" })}
              style={[
                styles.searchBar,
                {
                  backgroundColor: theme.colors.card,
                  borderColor: theme.colors.border,
                  borderRadius: theme.radius.md,
                },
              ]}
            >
              <Text style={{ fontSize: 15, color: theme.colors.textFaint }}>
                🔍  Search restaurants or dishes
              </Text>
            </Pressable>

            {categories.length ? (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                  Categories
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.rail}
                >
                  {categories.map((category) => (
                    <Pressable
                      key={category.name}
                      onPress={() =>
                        navigation.navigate("Tabs", {
                          screen: "Search",
                          params: { initialQuery: category.name },
                        })
                      }
                      style={[
                        styles.chip,
                        {
                          backgroundColor: theme.colors.card,
                          borderColor: theme.colors.border,
                          borderRadius: theme.radius.pill,
                        },
                      ]}
                    >
                      <Text style={{ color: theme.colors.text, fontWeight: "600" }}>
                        {category.name}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            ) : null}

            <Rail title="Top rated" items={featured} />
            <Rail title="Closest to you" items={nearest} />

            <Text
              style={[styles.sectionTitle, { color: theme.colors.text, marginTop: 8 }]}
            >
              All restaurants
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <RestaurantCard restaurant={item} onPress={() => openRestaurant(item._id)} />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={{ fontSize: 40 }}>🍽️</Text>
            <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
              No restaurants yet
            </Text>
            <Text style={{ color: theme.colors.textMuted, textAlign: "center" }}>
              Nothing is delivering to your area right now.
            </Text>
          </View>
        }
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  listContent: { paddingHorizontal: 16, paddingBottom: 32 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 8,
    paddingBottom: 16,
    gap: 12,
  },
  greeting: { fontSize: 14 },
  title: { fontSize: 24, fontWeight: "800", marginTop: 2 },
  bell: { width: 42, height: 42, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  bellDot: {
    position: "absolute",
    top: 8,
    right: 9,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  searchBar: { borderWidth: 1, paddingHorizontal: 14, paddingVertical: 13 },
  section: { marginTop: 24 },
  sectionTitle: { fontSize: 17, fontWeight: "700", marginBottom: 12 },
  rail: { paddingRight: 8 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    marginRight: 8,
    borderWidth: 1,
  },
  empty: { alignItems: "center", paddingVertical: 56, gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: "700" },
});
