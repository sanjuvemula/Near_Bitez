import React, { useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { EmptyState, ErrorState, Input, Loading, Screen } from "@/components";
import { RestaurantCard } from "@/components/RestaurantCard";
import { restaurantApi } from "@/services/api";
import { useDebounced } from "@/hooks/useDebounced";
import { useTheme } from "@/hooks/useTheme";
import { ApiError } from "@/services/apiClient";
import type { CustomerStackParamList, CustomerTabParamList } from "@/types/navigation";
import type { MenuItem, Restaurant } from "@/types/models";

type Nav = NativeStackNavigationProp<CustomerStackParamList>;
type SearchRoute = RouteProp<CustomerTabParamList, "Search">;

/**
 * Search across restaurants and dishes.
 *
 * Input is debounced so typing doesn't fire a request per keystroke, and a
 * request counter discards out-of-order responses — a short query resolving
 * after a longer one would otherwise overwrite the newer results.
 */
export const SearchScreen: React.FC = () => {
  const { theme } = useTheme();
  const navigation = useNavigation<Nav>();
  const route = useRoute<SearchRoute>();

  const [query, setQuery] = useState(route.params?.initialQuery ?? "");
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [dishes, setDishes] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isNetworkError, setIsNetworkError] = useState(false);

  const debounced = useDebounced(query, 350);
  const trimmed = debounced.trim();

  useEffect(() => {
    if (trimmed.length < 2) {
      setRestaurants([]);
      setDishes([]);
      setError(null);
      return;
    }

    let current = true;
    setLoading(true);
    setError(null);

    restaurantApi
      .search(trimmed)
      .then((result) => {
        if (!current) return;
        setRestaurants(result?.restaurants ?? []);
        setDishes(result?.dishes ?? []);
      })
      .catch((err: unknown) => {
        if (!current) return;
        setError(err instanceof Error ? err.message : "Search failed");
        setIsNetworkError(err instanceof ApiError ? err.isNetworkError : false);
      })
      .finally(() => {
        if (current) setLoading(false);
      });

    return () => {
      current = false;
    };
  }, [trimmed]);

  const hasResults = restaurants.length > 0 || dishes.length > 0;

  const dishesByRestaurant = useMemo(
    () =>
      dishes.reduce<Record<string, MenuItem[]>>((acc, dish) => {
        const key = String(dish.restaurant ?? "other");
        (acc[key] ||= []).push(dish);
        return acc;
      }, {}),
    [dishes]
  );

  const body = () => {
    if (trimmed.length < 2) {
      return (
        <EmptyState
          title="Search NearBitez"
          message="Find restaurants and dishes near you. Type at least 2 characters."
        />
      );
    }
    if (loading) return <Loading />;
    if (error) {
      return (
        <ErrorState
          title="Search failed"
          message={error}
          isNetworkError={isNetworkError}
          onAction={() => setQuery((q) => `${q} `.trim())}
        />
      );
    }
    if (!hasResults) {
      return (
        <EmptyState
          title="Nothing found"
          message={`No restaurants or dishes match "${trimmed}".`}
        />
      );
    }

    return (
      <FlatList
        data={restaurants}
        keyExtractor={(item) => item._id}
        keyboardShouldPersistTaps="handled"
        initialNumToRender={6}
        maxToRenderPerBatch={8}
        windowSize={7}
        removeClippedSubviews
        contentContainerStyle={styles.results}
        ListHeaderComponent={
          dishes.length ? (
            <View style={styles.dishBlock}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                Dishes
              </Text>
              {dishes.slice(0, 8).map((dish) => (
                <Pressable
                  key={dish._id}
                  onPress={() => {
                    const restaurantId = String(dish.restaurant ?? "");
                    if (restaurantId) {
                      navigation.navigate("RestaurantDetail", { restaurantId });
                    }
                  }}
                  style={[styles.dishRow, { borderBottomColor: theme.colors.border }]}
                >
                  <Text style={{ color: theme.colors.text, fontWeight: "600", flex: 1 }}>
                    {dish.name}
                  </Text>
                  <Text style={{ color: theme.colors.textMuted }}>
                    ₹{Math.round(dish.price)}
                  </Text>
                </Pressable>
              ))}
              {restaurants.length ? (
                <Text
                  style={[
                    styles.sectionTitle,
                    { color: theme.colors.text, marginTop: 22 },
                  ]}
                >
                  Restaurants
                </Text>
              ) : null}
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <RestaurantCard
            restaurant={item}
            onPress={() =>
              navigation.navigate("RestaurantDetail", { restaurantId: item._id })
            }
          />
        )}
      />
    );
  };

  return (
    <Screen padded={false} edges={["top"]}>
      <View style={styles.searchWrap}>
        <Input
          value={query}
          onChangeText={setQuery}
          placeholder="Search restaurants or dishes"
          autoCorrect={false}
          returnKeyType="search"
          autoFocus={!route.params?.initialQuery}
        />
        {query.length > 0 ? (
          <Pressable onPress={() => setQuery("")} hitSlop={10} style={styles.clear}>
            <Text style={{ color: theme.colors.primaryText, fontWeight: "700" }}>
              Clear
            </Text>
          </Pressable>
        ) : null}
      </View>
      <View style={styles.flex}>{body()}</View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  searchWrap: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  clear: { alignSelf: "flex-end", paddingVertical: 8, paddingHorizontal: 4 },
  results: { paddingHorizontal: 16, paddingBottom: 32 },
  dishBlock: { marginBottom: 8 },
  sectionTitle: { fontSize: 16, fontWeight: "700", marginBottom: 10 },
  dishRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
});
