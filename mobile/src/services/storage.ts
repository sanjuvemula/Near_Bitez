import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { STORAGE_KEYS } from "@/constants/config";

/**
 * Two-tier persistence.
 *
 * The JWT goes to SecureStore (Keychain / EncryptedSharedPreferences). Only
 * non-sensitive things — cached profile, theme choice — use AsyncStorage,
 * which is plain text on disk.
 *
 * SecureStore is unavailable on web and can throw on some Android OEM builds,
 * so every call degrades gracefully rather than crashing the app.
 */

export const saveToken = async (token: string): Promise<void> => {
  try {
    await SecureStore.setItemAsync(STORAGE_KEYS.token, token);
  } catch {
    // Keychain unavailable — the session still works for this app run.
  }
};

export const getToken = async (): Promise<string | null> => {
  try {
    return await SecureStore.getItemAsync(STORAGE_KEYS.token);
  } catch {
    return null;
  }
};

export const clearToken = async (): Promise<void> => {
  try {
    await SecureStore.deleteItemAsync(STORAGE_KEYS.token);
  } catch {
    // Nothing to clean up.
  }
};

/** Cached profile, used to render immediately while /auth/me revalidates. */
export const saveJson = async <T>(key: string, value: T): Promise<void> => {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Cache write failures are non-fatal.
  }
};

export const readJson = async <T>(key: string): Promise<T | null> => {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
};

export const removeKey = async (key: string): Promise<void> => {
  try {
    await AsyncStorage.removeItem(key);
  } catch {
    // Ignore.
  }
};
