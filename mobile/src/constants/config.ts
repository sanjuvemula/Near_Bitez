import Constants from "expo-constants";

/**
 * Environment and backend endpoints.
 *
 * One resolution order, used everywhere — no screen or service builds a URL of
 * its own, so pointing the app at a different backend is a single change here.
 *
 *   1. `EXPO_PUBLIC_API_URL` / `EXPO_PUBLIC_SOCKET_URL` — per-developer, from
 *      a gitignored `.env`. Wins over everything.
 *   2. `app.config.js` `extra`, which selects a profile from APP_ENV at build
 *      time. This is what release builds use.
 *
 * Android note: an emulator cannot reach `localhost` — that resolves to the
 * emulator itself. `10.0.2.2` is the host machine; a physical device needs the
 * machine's LAN IP.
 */

export type AppEnvironment = "development" | "staging" | "production";

const extra = (Constants.expoConfig?.extra ?? {}) as {
  apiUrl?: string;
  socketUrl?: string;
  appEnv?: AppEnvironment;
};

const stripTrailingSlash = (value: string) => value.replace(/\/+$/, "");

export const APP_ENV: AppEnvironment =
  (process.env.EXPO_PUBLIC_APP_ENV as AppEnvironment | undefined) ??
  extra.appEnv ??
  "development";

export const IS_PRODUCTION = APP_ENV === "production";

/**
 * Resolves an endpoint, with no literal fallback.
 *
 * Deliberately not `|| "http://10.0.2.2:5000"`: a default like that is compiled
 * into every bundle, so a release APK would carry a developer machine's address
 * as a readable string even though it is never used. app.config.js always
 * supplies these, so an absent value means the config is broken and should say
 * so rather than silently pointing somewhere wrong.
 */
const resolveEndpoint = (fromEnv: string | undefined, fromConfig: string | undefined, name: string) => {
  const value = fromEnv || fromConfig;
  if (!value) {
    throw new Error(
      `${name} is not configured. app.config.js should provide it via "extra"; check APP_ENV.`
    );
  }
  return stripTrailingSlash(value);
};

export const API_URL = resolveEndpoint(
  process.env.EXPO_PUBLIC_API_URL,
  extra.apiUrl,
  "API_URL"
);

export const SOCKET_URL = resolveEndpoint(
  process.env.EXPO_PUBLIC_SOCKET_URL,
  extra.socketUrl,
  "SOCKET_URL"
);

/**
 * A release build must never ship pointing at a developer machine.
 *
 * Throws at startup rather than shipping quietly, because the failure it
 * prevents — a store build that cannot reach any backend — is invisible until
 * real users hit it.
 */
if (IS_PRODUCTION && /localhost|127\.0\.0\.1|10\.0\.2\.2|192\.168\.|^http:\/\//.test(API_URL)) {
  throw new Error(
    `Production build is pointed at a non-production backend (${API_URL}). Check the production profile in app.config.js.`
  );
}

/** Requests that hang longer than this are treated as network failures. */
export const REQUEST_TIMEOUT_MS = 20000;

/** SecureStore / AsyncStorage keys. Kept here so nothing else hardcodes them. */
export const STORAGE_KEYS = {
  token: "nearbytez.auth.token",
  user: "nearbytez.auth.user",
  theme: "nearbytez.theme",
} as const;
