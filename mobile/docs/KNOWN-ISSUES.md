# NearBitez Mobile — Known Issues

State at the end of Phase 7. Ordered by what should be dealt with first.
Everything here was reproduced against the real backend, not inferred.

---

## Blockers — fix before real users

### ~~0. The deployed backend cannot log the mobile app in~~ — **RESOLVED**
The backend was redeployed. Production login now returns `token` in the body,
and all 27 endpoints the app uses were re-verified over Bearer auth: auth/me,
discover, restaurants, cart, orders, notifications, tiffins, settings/public,
games (feed / leaderboard / my-score / wheel), the full vendor surface, and the
full admin surface. Socket.IO connects over websocket and accepts `join` and
`game:join`. Cloudinary images serve correctly.

### 1. Game score submission is broken for every client
**Where:** database, not application code.
**Effect:** nobody can earn NearCoins or XP from games — on mobile **or on the
website**. The leaderboard cannot advance.

`POST /games/score` always returns 500:

```
E11000 duplicate key error collection: nearbites.gamescores
index: customer_1_gameKey_1_areaKey_1
dup key: { customer: null, gameKey: null, areaKey: null }
```

The `gamescores` collection carries a **unique** index from a previous schema
(`customer`/`gameKey`/`areaKey`). The current `GameScore` model writes
`userId`/`date` instead, so every new document collides on `{null, null, null}`.
One such document already exists and holds the only permitted slot.

**Fix** — one command, no data deleted:
```js
db.gamescores.dropIndex("customer_1_gameKey_1_areaKey_1")
```
Five further orphaned indexes (`customer_1`, `gameKey_1`, `areaKey_1`,
`lastPlayedAt_1`, `gameKey_1_areaKey_1_bestScore_-1_updatedAt_1`) are dead weight
and can go in the same pass.

**Meanwhile:** the app degrades honestly — the run is marked unsaved with a
retry, and no reward is displayed that was not granted.

### 2. 27 of 30 orders cannot change status
**Where:** existing order documents.
**Effect:** those orders are frozen — vendors cannot advance them from the
mobile app **or the web dashboard**.

They have no `deliveryPhone`, which the `Order` schema requires, so every
`order.save()` throws a ValidationError.

**Fix:** backfill from `customer.phone`, or relax the `required` constraint for
historical records. The mobile order screen warns when an order is in this
state rather than letting the user hit an opaque error.

---

## Security — server-side work, outside the mobile app's control

### 3. Game scores are client-trusted
`POST /games/score` accepts whatever `points` the client sends, clamped only to
`0…100000`, and mints coins at `score × 0.35` and XP at `score × 0.2`. There is
no session, no replay, no per-game rate limit. A crafted request mints ~35 000
coins.

The app never relies on client trust — it displays only what the server returns —
but no client can fix an authority that is not enforced.

### 4. Reward claims have no duplicate guard
`POST /games/claim` never writes the `GameRewardClaim` record that would let it
detect a repeat. With today's score ≥ 120 it can be called repeatedly, paying
45 coins + 25 XP each time. The app blocks a second claim per session, which
stops accidental double-taps but not a determined client.

### 5. `makeadmin.mjs` contains a plaintext password
`server/makeadmin.mjs` hardcodes `Admin@123` for a real admin account and is
committed. The backend is publicly deployed. Rotate the password and remove the
literal.

---

## Not built

### 6. No rider application
`User.role` is `["customer", "vendor", "admin"]` — `"rider"` is not a valid
role. There are no rider routes, no rider controller, and `Order` has no rider
field. The `Rider` model is imported nowhere.

Phase 4 was stopped for this reason rather than shipping screens that 404. The
navigator keeps a placeholder branch so the role, if ever added, has somewhere
to land. **Building it requires backend work first.**

### 7. Three games are web-only
`hand-cricket` (a 1382-line state machine on the web), `food-quiz-battle` and
`delivery-race` (both need the `battle:*` socket layer; neither has a real
implementation on the web either — they fall through to a spinner). They are
listed in the mobile catalogue as **Web only** and cannot be tapped.

### 8. No push notifications
`expo-notifications` is not installed and the backend has no push
infrastructure. In-app notifications work through Socket.IO and
`/api/v1/notifications`. Adding push needs FCM credentials and a server-side
sender.

### 9. No online payments
`Order.paymentMethod` is `enum: ["COD"]` — cash on delivery is the only method
the backend accepts. There is no gateway to test. Nothing in the app implies
otherwise.

### 10. No account deletion in-app
Play Store policy requires an account-deletion route for apps with accounts.
`DELETE /admin/users/:id` is admin-only; there is no self-service equivalent.
Either add one or provide a documented web deletion flow before submission.

---

## Smaller items

### 11. Saved addresses and inventory quantity
Both are UI concepts with no backend field. `User.address` is a single string,
not a list, and menu items have `isAvailable` but no stock count. The mobile
screens reflect what exists rather than inventing storage.

### 12. Quiz endpoint needs an API key
`GET /games/quiz` returns 503 without `ANTHROPIC_API_KEY`. No shipped mobile
game uses it — the quiz game is web-only — so this affects nothing today.

### 13. Socket listeners bind to one connection instance
`reconnectSocket()` replaces the socket. Any screen that subscribed earlier is
left listening to the old instance. Today this is unreachable: reconnects only
happen at login and session restore, both before a role stack mounts. It would
become a live bug if a reconnect were ever triggered while screens are mounted.

### 14. Leaderboard has no deeper pages
`GET /games/leaderboard` serves the top 20 plus the caller's own row, and takes
no page parameter. The list is windowed rather than paged; showing more requires
a backend change.
