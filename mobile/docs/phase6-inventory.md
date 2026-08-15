# Phase 6 — Migration Inventory

Compiled by reading `client/src/features/games/**`, `server/controllers/gameController.js`,
`server/config/socket.js` and the game models. Nothing here is assumed; every API and
socket name below was read from source.

---

## 1. Backend surface (unchanged, reused as-is)

`server/routes/gameRoutes.js`, mounted at `/api/v1/games`.

| Route | Auth | Purpose |
|---|---|---|
| `GET /leaderboard` | public | Today's top 20 + current user row |
| `POST\|PATCH /score`, `POST /scores` | customer/admin | Submit a run, returns coins/XP/rank/badges |
| `GET /my-score` | customer/admin | Today's total, rank, top 10 |
| `GET /quiz` | customer/admin | Questions **without** `correct_index` |
| `POST /quiz/answer` | customer/admin | Server-side answer check |
| `GET /scratch-rewards` | customer/admin | Scratch reward for an order |
| `POST /scratch/use` | customer/admin | Atomic single-use marker |
| `GET /wheel-segments` | customer/admin | 8 live restaurants for the wheel |
| `GET /feed` | customer/admin | Games list, rewards, wallet, missions, level, streak |
| `POST /claim` | customer/admin | Claim PLAY / TOP reward |

Related: `POST /api/v1/ai/chat` (recommendations), `GET /api/v1/restaurants/discovery` (wheel fallback).

**Socket events** (`config/socket.js`) — all on the existing shared connection:
`game:join`, `game:leave`, `leaderboard:update`, and the battle set
`battle:join`, `battle:leave`, `battle:searching`, `battle:matched`,
`battle:bot_matched`, `battle:countdown`, `battle:start`, `battle:action`,
`battle:state`, `battle:finish`, `battle:finished`.

**Models**: `GameScore` (daily total, `gamesPlayed[]`, rank, IST date key),
`GameRewardClaim` (written only by `orderController.js`, never by the claim route).

---

## 2. Game-by-game inventory

| Game | Web implementation | Engine | Reusable? | RN approach |
|---|---|---|---|---|
| **Bite Catcher** | `bite-catcher/scenes/GameScene.js` (334 L) + `PhaserGame.jsx` | **Phaser 4** + Arcade physics | ❌ Logic reusable, rendering not | Full rewrite: Reanimated worklet loop + Views |
| **Food Memory** | `ReactGamePlayPage.jsx:848` `FoodMemoryGame` | React state + CSS | ⚠️ Rules reusable | Rewrite with RN views + Reanimated flips |
| **Tray Shuffle** | `ReactGamePlayPage.jsx:2080` `TrayShuffleGame` | React state + CSS transforms | ⚠️ Rules reusable | Rewrite; shuffle via Reanimated positions |
| **Snakes Sprint** | `ReactGamePlayPage.jsx:1642` `SnakesSprintGame` | React state, `SNAKES`/`LADDERS` maps | ✅ Board data reusable verbatim | Rewrite board as RN grid |
| **Hand Cricket** | `hand-cricket/CricketMiniGame.jsx` (**1382 L**) | React state machine | ⚠️ Large | Rewrite — biggest single job |
| **Food Quiz Battle** | No dedicated component — `renderGame` falls back to `CravingSpinnerGame` | Socket battle arena | ❌ | Needs `battle:*` client; **not a real game today** |
| **Delivery Race** | Same fallback | Socket battle arena | ❌ | Same |
| **Spin / Craving Wheel** | `ReactGamePlayPage.jsx:578` + `games/SpinWheel.jsx` | CSS `rotate` transform | ⚠️ | Reanimated rotation, real `/wheel-segments` data |
| **Scratch Card** | `games/ScratchCard.jsx` | Canvas `getContext('2d')` erase | ❌ | Reveal-by-tap or Skia mask |

`ReactGamePlayPage` also holds 8 further prototypes not in `gameCatalog.js`
(`craving-spinner`, `restaurant-duel`, `speed-quiz`, `price-hunt`, `cuisine-match`,
`eta-rush`, `snack-snap`, `lucky-tray`). They are not reachable from the catalog, so
they are **out of scope** unless asked for.

**Catalog vs reality:** `gameCatalog.js` advertises 7 games. Only **5** have distinct
implementations. `food-quiz-battle` and `delivery-race` render the craving spinner.

---

## 3. Bite Catcher — exact rules extracted

Taken from `GameScene.js` so the mobile version plays identically:

| Rule | Value |
|---|---|
| Round length | 35 s |
| Spawn interval | 620 ms |
| Hazard chance | 18 % |
| Good item value | `10 + min(20, combo × 2)` |
| Hazard value | `−20`, combo reset, **−1600 ms** off the clock |
| Fall speed | `random(195, 330) + min(150, score × 0.42)` |
| Missed good item | combo resets to 0 |
| Score floor | 0 |
| Lives | none — the timer is the life |
| Catcher movement | pointer sets target X; catcher lerps at `0.24` |

---

## 4. Security findings (read the backend, did not change it)

Spec §7 and §18 require server-side validation. The current backend does **not** provide it:

1. **`POST /games/score` trusts the client score completely.** `asSafeScore` only clamps
   to `0…100000`. There is no session, no replay of the run, no per-game rate limit.
   Coins (`score × 0.35`) and XP (`score × 0.2`) are minted from that number.
   A crafted request for 100000 points mints ~35000 coins.

2. **`POST /games/claim` has no duplicate-claim prevention.** A `GameRewardClaim` model
   exists but this handler never writes it — it is only used by `orderController.js`.
   With today's score ≥ 120 the endpoint can be called repeatedly, paying 45 coins +
   25 XP every time.

3. **No per-day cap** on submissions; `$inc: { totalScore: points }` accumulates without limit.

### 4a. Score submission is currently broken for every client (database, not code)

Found while verifying `POST /games/score` against the live database. Every submission
returns `500 Could not save game score`:

```
E11000 duplicate key error collection: nearbites.gamescores
index: customer_1_gameKey_1_areaKey_1
dup key: { customer: null, gameKey: null, areaKey: null }
```

The `gamescores` collection carries indexes from **two schema generations**:

| Generation | Fields | Indexes still present |
|---|---|---|
| Old | `customer`, `gameKey`, `areaKey`, `bestScore`, `plays` | `customer_1`, `gameKey_1`, `areaKey_1`, `lastPlayedAt_1`, **`customer_1_gameKey_1_areaKey_1` (UNIQUE)**, `gameKey_1_areaKey_1_bestScore_-1_updatedAt_1` |
| Current (`models/GameScore.js`) | `userId`, `date`, `totalScore`, `gamesPlayed`, `rank` | `userId_1`, `date_1`, `rank_1`, `archived_1`, `date_1_archived_1_totalScore_-1_updatedAt_1` |

Documents written by the current model have no `customer`, `gameKey` or `areaKey`, so
they all collide on `{ null, null, null }` against that unique index. Exactly one such
document exists (19 docs total: 18 old-format, 1 new-format); it took the single
permitted null slot, and **every submission since has failed** — from the web app as
well as the mobile app.

**Effect:** nobody can earn game coins or XP on NearBitez today, and the leaderboard
cannot advance past that one row.

**Fix:** drop the orphaned index. No data is deleted and no code changes:

```js
db.gamescores.dropIndex("customer_1_gameKey_1_areaKey_1")
```

The other five old-generation indexes are dead weight but harmless; they can be dropped
in the same pass. Not done here — this is a production database, and the change is the
owner's call.

**How the app behaves meanwhile:** the failure is surfaced honestly. `useGameSession`
marks the run `failed`, and the result screen says the score was not saved and offers a
retry rather than displaying a reward that was never granted.

These are pre-existing web-app issues, not introduced by the migration. The mobile app
is built so it never *relies* on client trust — it displays only what the server returns —
but the app cannot fix an authority that isn't enforced server-side. Closing these needs a
backend change, which Phase 6 forbids without approval.

What is already correct and was reused unchanged:
- Quiz answers are validated server-side; `correct_index` is stripped from `GET /quiz`.
- `POST /scratch/use` is an atomic `findOneAndUpdate` guarded on `scratchUsed: false`.
- Wheel segments come from live restaurants; nothing is hardcoded.

---

## 5. Wait & Play gating

`useOrderGameAccess.js` unlocks the game zone when the customer has any order whose
status is not `REJECTED`/`CANCELLED`. It calls `GET /orders/:id` or `GET /orders`.
Client-side gating only — it decides visibility, not reward eligibility, so mirroring
it on mobile carries no new risk.

---

## 6. Assets

`bite-catcher/assetFactory.js` generates all sprites **procedurally on a canvas**
(basket + 4 food frames) — there are no image files to port. `sounds.js` synthesises
tones with the Web Audio API (`AudioContext`), which does not exist in React Native;
mobile needs `expo-audio` or silence plus haptics.
