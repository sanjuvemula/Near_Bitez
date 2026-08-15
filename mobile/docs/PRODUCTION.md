# NearBitez — Production Handbook

The operational reference for the live system: what runs where, how to build and
release, and what to do when something breaks.

No secrets appear in this document. Where a credential is needed, it says where
the credential lives, not what it is.

---

## 1. Architecture

```
┌─────────────────────┐     ┌─────────────────────┐
│  React Native app   │     │   React web app     │
│  (Expo, Android)    │     │   (Vite)            │
│  Bearer token       │     │   HTTP-only cookie  │
└──────────┬──────────┘     └──────────┬──────────┘
           │                            │
           └────────────┬───────────────┘
                        ▼
        ┌───────────────────────────────┐
        │  Express API + Socket.IO      │
        │  near-bitez.onrender.com      │
        └───────────────┬───────────────┘
                        ▼
     ┌──────────────┬───────────┬───────────┐
     │ MongoDB Atlas│ Cloudinary│  Resend   │
     │   (data)     │  (images) │  (email)  │
     └──────────────┴───────────┴───────────┘
```

**One backend serves both clients.** The only difference is how the JWT travels:
the web app uses an HTTP-only cookie, the mobile app uses
`Authorization: Bearer <token>` because React Native has no cookie jar. The
server issues both from the same login response, so neither client can break
the other.

### Roles

| Role | Where it works | Notes |
|---|---|---|
| `customer` | Web + mobile | Ordering, tracking, tiffin, games, rewards |
| `vendor` | Web + mobile | Restaurant dashboard |
| `admin` | Web + mobile | Platform management |
| `rider` | **Does not exist** | Not a valid role in the `User` model — see Known Issues |

Authorisation is enforced **server-side** by `protect` + `authorize(...)` on
every protected route. The app's role-based navigation decides what is *shown*,
never what is *permitted*.

---

## 2. Environments

Selected by `APP_ENV`, defined in `app.config.js`, set per build profile in
`eas.json`.

| APP_ENV | App name | Backend |
|---|---|---|
| `development` | NearBitez Dev | `http://10.0.2.2:5000` (emulator → host) |
| `staging` | NearBitez Staging | `https://near-bitez.onrender.com` |
| `production` | NearBitez | `https://near-bitez.onrender.com` |

`src/constants/config.ts` throws at startup if a production build resolves to a
local or plain-HTTP address. A misconfigured release fails on first launch
instead of silently reaching nothing.

> Staging and production currently point at the **same** backend. A separate
> staging deployment is worth adding before there is real order volume, so
> pre-release testing cannot touch live data.

### Environment variables

**Mobile** — build-time only, and never secret. Anything prefixed
`EXPO_PUBLIC_` is compiled into the bundle and readable from a downloaded APK.

| Variable | Purpose |
|---|---|
| `APP_ENV` | Selects the profile. Set by `eas.json`. |
| `EXPO_PUBLIC_API_URL` | Local override for development only |
| `EXPO_PUBLIC_SOCKET_URL` | Local override for development only |

**Backend** — held in the Render dashboard, never in git. Names only:

`MONGO_URI`, `JWT_SECRET`, `PORT`, `CLIENT_URL`,
`CLOUDINARY_CLOUD_NAME` / `_API_KEY` / `_API_SECRET`,
`RESEND_API_KEY`, `GOOGLE_CLIENT_ID` / `_SECRET` / `GOOGLE_CALLBACK_URL`,
`ADMIN_EMAILS`, `GEMINI_API_KEY` (recommendations),
`ANTHROPIC_API_KEY` (quiz generation).

---

## 3. App identity

| | |
|---|---|
| Package / bundle ID | `com.nearbytez.app` |
| Display name | NearBitez |
| Version | `1.0.0` (`VERSION` in `app.config.js`) |
| Version code | `1` (`VERSION_CODE`; `autoIncrement` bumps it per production build) |
| Deep link scheme | `nearbytez://` |

**Never change the package ID after publishing.** A different ID is a different
listing on the Play Store, and existing installs cannot upgrade to it.

### Versioning

- `VERSION` — what users see. Bump by hand: patch for fixes, minor for features.
- `VERSION_CODE` — what Google Play orders uploads by. Must strictly increase.
  `autoIncrement` on the production profile handles it.

---

## 4. Build and release

```bash
# once
npm install -g eas-cli && eas login
cd mobile && eas build:configure

# internal test APK, staging backend
eas build --platform android --profile preview

# Play Store bundle, production backend
eas build --platform android --profile production

# upload to the internal track as a draft
eas submit --platform android --profile production
```

Verify without building natively:

```bash
npx --no-install tsc --noEmit
APP_ENV=production npx expo export --platform android
```

### Signing

EAS generates and stores the upload keystore server-side; it is never in the
repository. `.gitignore` blocks `*.keystore`, `*.jks`, `*.p12`, `*.p8`,
`credentials.json`, `google-play-service-account.json`.

```bash
eas credentials      # create, inspect, or download a backup
```

**Back the keystore up somewhere durable.** Losing it means never being able to
update the published app. Enrol in **Play App Signing** so Google holds the app
signing key and the upload key can be rotated if lost.

### Play Console flow

Internal testing → verify → closed testing → production with a staged rollout
(**5% → 20% → 50% → 100%**), increasing only after crash-free rate holds.

---

## 5. Monitoring after release

Watch in the Play Console (Quality → Android vitals):

| Signal | Act when |
|---|---|
| Crash-free users | below 99% |
| ANR rate | above 0.47% (Google's bad-behaviour threshold) |
| Failed installs | any sustained rise |

The app ships **no crash reporting SDK**. Play Console vitals give crash and ANR
data with stack traces for the store build, which is enough for launch; add
Sentry or Crashlytics if you want breadcrumbs and non-fatal errors.

Backend: Render's dashboard shows request logs and errors. Watch the login
route, `POST /orders`, and `POST /games/score`.

---

## 6. Emergency procedures

### Bad release is live
1. **Halt the rollout** in the Play Console (Release → pause). This stops new
   users receiving it immediately.
2. Google Play has **no rollback**. Recovery is rolling *forward*: fix, bump
   `VERSION_CODE`, build, submit, and resume the rollout.
3. If the previous build is still active on another track, promote it — but its
   `versionCode` must be higher than the bad one, so rebuild it with a bump.

### Backend is down or broken
The mobile app degrades rather than crashing: every screen has an error state
with retry, and GET requests retry once with a longer timeout. A backend
rollback on Render (Deploys → previous → redeploy) does not require an app
release.

### The app cannot log in after a backend change
Check the login response still contains `token`:

```bash
curl -s -X POST https://near-bitez.onrender.com/api/v1/auth/customer/login \
  -H "Content-Type: application/json" \
  -d '{"email":"...","password":"..."}' | grep -o '"token"'
```

No match means `sendAuthResponse` lost the body token and **every mobile client
is locked out**. The cookie keeps the website working, so this failure is
invisible from the web side. This exact regression has happened once.

### Turning the platform off
`PUT /api/v1/admin/settings` with `maintenanceMode: true`, or the toggle in
Admin → Platform settings.

---

## 7. Known issues

Kept in `docs/KNOWN-ISSUES.md`. Current blockers:

1. **Game scores cannot be saved** — a stale unique index on `gamescores`
   (`customer_1_gameKey_1_areaKey_1`) rejects every write. Affects the website
   too. Fix: `db.gamescores.dropIndex("customer_1_gameKey_1_areaKey_1")`.
2. **27 of 30 orders cannot change status** — missing required `deliveryPhone`.
3. **Game scores and reward claims are client-trusted** — no server-side
   validation or duplicate guard.
4. **No rider app** — the role does not exist in the backend.
5. **No in-app account deletion** — required by Play Store policy for apps with
   accounts.

---

## 8. Repository layout

```
Nearbytez/
├── client/     React web app (Vite) — unchanged by the migration
├── server/     Express API + Socket.IO — the single source of truth
└── mobile/     React Native app (Expo)
    ├── app.config.js        environments, identity, permissions
    ├── eas.json             build profiles
    ├── assets/              generated by scripts/generate-icons.mjs
    ├── docs/                this handbook, release guide, known issues, legal
    └── src/
        ├── components/      shared UI primitives
        ├── constants/       config + theme
        ├── context/         Auth, Cart, Theme, Toast, Notification, Vendor, Admin
        ├── features/games/  engines, screens, hooks (isolated per game)
        ├── navigation/      role-based stacks
        ├── screens/         customer, vendor, admin, auth
        ├── services/        apiClient, socket, storage, api modules
        └── types/           API response shapes
```

Backend changes made for mobile, in total — **two files**:

- `server/controllers/auth.js` — returns the JWT in the login body as well as
  the cookie, so native clients can authenticate. The cookie is unchanged.
- `server/controllers/vendor/restaurantController.js` — a partial restaurant
  update no longer fails validation on fields it did not send.
