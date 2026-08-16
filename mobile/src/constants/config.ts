import Constants from "expo-constants";

/**
 * Environment and backend endpoints.
 *
 * One resolution order, used everywhere — no screen or service builds a URL of
 * its own, so pointing the app at a different backend is a single change here.
 *
 *   1. `EXPO_PUBLIC_API_URL` / `EXPO_PUBLIC_SOCKET_URL` — per-developer, from
 *      a gitignored `.env`. Wins over everything.
 *   2. In development only: the machine serving the JS bundle, so a phone
 *      running Expo Go reaches the developer's backend without being told an
 *      IP address.
 *   3. `app.config.js` `extra`, which selects a profile from APP_ENV at build
 *      time. This is what release builds use.
 *
 * Android note: an emulator cannot reach `localhost` — that resolves to the
 * emulator itself; `10.0.2.2` is its alias for the host. A physical device
 * needs the machine's LAN address, which step 2 supplies automatically.
 */

export type AppEnvironment = "development" | "staging" | "production";

const extra = (Constants.expoConfig?.extra ?? {}) as {
  apiUrl?: string;
  socketUrl?: string;
  appEnv?: AppEnvironment;
};

const stripTrailingSlash = (value: string) => value.replace(/\/+$/, "");

/** Port the backend listens on locally. */
const DEV_API_PORT = 5000;

/**
 * Works out the development backend from the machine serving the JS bundle.
 *
 * Expo reports that machine as `hostUri` (e.g. `192.168.1.12:8081`). The device
 * has already reached it — that is how the app got here — so the same host with
 * the API port is reachable too.
 *
 * This exists because the obvious default is wrong on real hardware:
 * `10.0.2.2` is the Android *emulator's* alias for its host and means nothing
 * on a physical phone, so Expo Go would fail every request with "can't reach
 * the server" until someone hand-configured their LAN IP.
 *
 * Development only. Release builds take their URL from the build profile.
 */
const deriveDevHost = (): string | undefined => {
  /**
   * Where Expo records the dev server differs by SDK and by how the app was
   * opened, so every known source is tried rather than assuming one. Values
   * look like `192.168.1.12:8081` or `exp://192.168.1.12:8081`.
   */
  const candidates = [
    Constants.expoConfig?.hostUri,
    (Constants.expoGoConfig as { debuggerHost?: string } | undefined)?.debuggerHost,
    (Constants as unknown as { linkingUri?: string }).linkingUri,
    (Constants as unknown as { experienceUrl?: string }).experienceUrl,
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;

    // Strip any scheme, then take the host portion before the port or path.
    const host = candidate
      .replace(/^[a-z+]+:\/\//i, "")
      .split(/[:/?]/)[0]
      ?.trim();

    if (!host) continue;
    // An emulator reaching its host needs the 10.0.2.2 alias, not a loopback
    // address, so fall through to the configured default in that case.
    if (host === "127.0.0.1" || host === "localhost") continue;

    return host;
  }

  return undefined;
};

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
const resolveEndpoint = (
  fromEnv: string | undefined,
  fromConfig: string | undefined,
  name: string,
  devPath: string
) => {
  // An explicit override always wins, whatever the environment.
  if (fromEnv) return stripTrailingSlash(fromEnv);

  // In development, prefer the machine actually serving the bundle over the
  // committed default, so a physical device on Expo Go works with no setup.
  if (APP_ENV === "development") {
    const host = deriveDevHost();
    if (host) return stripTrailingSlash(`http://${host}:${DEV_API_PORT}${devPath}`);
  }

  if (!fromConfig) {
    throw new Error(
      `${name} is not configured. app.config.js should provide it via "extra"; check APP_ENV.`
    );
  }
  return stripTrailingSlash(fromConfig);
};

export const API_URL = resolveEndpoint(
  process.env.EXPO_PUBLIC_API_URL,
  extra.apiUrl,
  "API_URL",
  "/api/v1"
);

export const SOCKET_URL = resolveEndpoint(
  process.env.EXPO_PUBLIC_SOCKET_URL,
  extra.socketUrl,
  "SOCKET_URL",
  ""
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
