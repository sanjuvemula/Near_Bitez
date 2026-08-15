# NearBites Mobile — Phase 1

React Native (Expo + TypeScript) client for the existing NearBites backend.

The web app in `client/` is untouched and keeps working. Both talk to the same
Express API, the same MongoDB, and the same Socket.IO server.

## Run it

```bash
cd mobile
npm install
npm start          # then press 'a' for Android
```

The backend must be running (`npm run dev` from the repo root, port 5000).

### Pointing at the backend

Copy `.env.example` to `.env` and set the host:

| Where the app runs | Use |
|---|---|
| Android emulator | `http://10.0.2.2:5000/api/v1` |
| Physical device (same Wi-Fi) | `http://<your-lan-ip>:5000/api/v1` |
| Production | `https://near-bitez.onrender.com/api/v1` |

`localhost` does **not** work from the Android emulator — that address resolves
to the emulator itself, not your machine.

## The one backend change

`sendAuthResponse` in `server/controllers/auth.js` now also returns the JWT in
the response body.

It previously sent the token **only** as an HTTP-only cookie. React Native has
no cookie jar, so login would have succeeded and every following request would
have 401'd. `protect()` already accepted `Authorization: Bearer`, so this is
additive — the cookie is still set and the web app is unaffected.

Verified: login returns a token, and that token alone (no cookie) authenticates
`/auth/me` and `/orders`, while an unauthenticated request still gets 401.

## Structure

```
src/
  components/    Button, Input, Card, Modal, BottomSheet, Toast, states…
  constants/     config (API URLs), theme (light/dark palettes)
  context/       Auth, Theme, Toast providers
  hooks/         useAuth, useTheme, useToast, useApi, useSocketEvent
  navigation/    RootNavigator + per-role stacks
  screens/       auth/ (real) + Placeholder for everything pending
  services/      apiClient, api/ (endpoint modules), socket, storage
  types/         models, navigation
```

### Key decisions

**Auth storage** — the JWT lives in `expo-secure-store` (Keychain /
EncryptedSharedPreferences). Only the cached profile and theme choice use
AsyncStorage, which is plain text.

**Navigation by role** — `RootNavigator` mounts exactly one stack based on
`user.role`. Login and logout need no imperative navigation; the tree swaps
itself. Only the active role's screens are instantiated.

**One socket** — `services/socket.ts` owns a single connection. Screens
subscribe via `useSocketEvent`; nothing opens its own.

**Errors** — the axios interceptor converts every failure into an `ApiError`
with a message safe to show a user. 5xx bodies are replaced with generic text so
stack traces never reach the UI. A 401 clears the session automatically.

**Styling** — a token-based theme (`useTheme()`) rather than NativeWind.
NativeWind adds babel/metro/CSS-interop layers that can break a build, and the
brief asked for the simplest stable setup. Components read colours from the
hook, not from class strings, so NativeWind can be layered on later without
rewriting them.

## Migrating a screen

Each `Placeholder` names the web file it replaces. To migrate one:

1. Read the web component and its data flow.
2. Add the endpoint to `src/services/api/` if missing.
3. Build the screen with `Screen`, `Card`, `Button`, `Input`, `useApi`.
4. Replace the `children={() => <Placeholder …/>}` entry in
   `src/navigation/stacks.tsx` with `component={YourScreen}`.

Redesign for mobile — do not transcribe the desktop layout.

## Not in Phase 1

- **Games** (`client/src/features/games/`, ~8,500 lines). Phaser does not run in
  React Native. The `gameApi` endpoints are wired so coins and XP keep working,
  but the game screens need a separate decision: rebuild natively, or host in a
  WebView.
- **Maps** — `react-native-maps` is not installed yet. Add it when the order
  tracking screen is migrated.
- **Push notifications**, payments, image upload UI.
