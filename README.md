# NearBites

NearBites is a production-style full-stack food ordering platform built for customer ordering and vendor operations. It is designed to feel like a real startup product: public discovery before login, a dedicated customer app workspace after login, and a modular vendor control center for restaurant teams.

## Product Overview

NearBites supports two connected experiences:

- Customers can discover live restaurants, save favorites, add items to cart, check out, and track orders in real time.
- Vendors can manage restaurant identity, publish menu items with Cloudinary media, update availability instantly, monitor incoming orders, and review revenue and performance trends.

The app is intentionally powered by real backend state rather than demo content. Restaurant listings, menu availability, cart totals, orders, and vendor metrics all come from MongoDB-backed APIs.

## Key Features

### Public experience

- Marketing-grade landing page with live restaurant discovery
- Dynamic restaurant cards powered by backend data
- Smart sorting for rating, popularity, food quality, delivery speed, and price
- Filters for cuisine, veg/non-veg preference, and price band
- Dedicated customer and vendor login entry points

### Customer experience

- Authenticated customer workspace with sidebar navigation
- Real-time restaurant discovery experience inside the app shell
- Favorites system backed by MongoDB
- Restaurant detail pages with live menu polling
- Cart flow with availability-aware checkout
- Order history and live order tracking
- Profile management for saved delivery details

### Vendor experience

- Refactored vendor dashboard with smaller focused modules
- Dashboard overview for health, queue, and quick actions
- Menu management with live CRUD and availability toggles
- Restaurant profile editor with Cloudinary image upload
- Real-time order panel with controlled status transitions
- Analytics tab for revenue, order trend, and category coverage

## Tech Stack

### Frontend

- React 19
- Vite
- Tailwind CSS
- Framer Motion
- React Router
- React Hot Toast

### Backend

- Node.js
- Express 5
- MongoDB with Mongoose
- JWT auth with HTTP-only cookies
- Multer + Cloudinary for media uploads

## Architecture Notes

- Public discovery and authenticated customer experience are intentionally separated.
- Customer favorites are stored on the user document and exposed via authenticated API routes.
- Vendor functionality is split into overview, restaurant, menu, and order modules on both frontend and backend.
- Restaurant discovery is driven by aggregated live stats such as menu counts, order counts, and delivered volume.

## Project Structure

```text
client/
  src/
    app/                  # routing and route helpers
    components/           # shared UI primitives
    context/              # auth, cart, favorites state
    features/
      customer/           # authenticated customer shell
      home/               # public + customer discovery experience
      order/              # order history and tracking
      profile/            # customer profile
      vendor/             # vendor dashboard, tabs, shared vendor UI

server/
  config/                 # database connection
  controllers/
    vendor/               # modular vendor controllers
  middleware/             # auth and uploads
  models/                 # MongoDB schemas
  routes/                 # API route registration
  services/               # shared restaurant aggregation logic
```

## Setup

### 1. Install dependencies

```bash
npm install
cd client && npm install
```

### 2. Configure environment variables

Create `server/.env` from `server/.env.example`.

```env
PORT=5000
CLIENT_URL=http://localhost:5173
MONGO_URI=mongodb://127.0.0.1:27017/nearbytez
JWT_SECRET=replace-with-a-long-random-secret
JWT_EXPIRE=30d
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

Optional: create `client/.env` from `client/.env.example`.

```env
VITE_API_URL=/api/v1
```

### 3. Start the backend

```bash
npm run dev
```

### 4. Start the frontend

```bash
cd client
npm run dev
```

### 5. Open the app

- Frontend: `http://localhost:5173`
- API health check: `http://localhost:5000/api/v1/health`

## Available Scripts

### Root

- `npm run dev` - start the Express API in watch mode
- `npm run start` - start the Express API normally

### Client

- `npm run dev` - start the Vite app
- `npm run build` - production build
- `npm run preview` - preview the production build
- `npm run lint` - run ESLint

## Screenshots

Add screenshots in these sections when preparing portfolio or demo material:

### Public Landing

- Hero section with live restaurant discovery
- Smart filters and ranked results

### Customer Workspace

- Sidebar layout
- Favorites page
- Cart and order tracking

### Vendor Dashboard

- Overview tab
- Menu management tab
- Orders panel
- Analytics tab

## API Surface

### Auth

- `POST /api/v1/auth/customer/register`
- `POST /api/v1/auth/customer/login`
- `POST /api/v1/auth/vendor/register`
- `POST /api/v1/auth/vendor/login`
- `GET /api/v1/auth/me`
- `PATCH /api/v1/auth/me`
- `GET /api/v1/auth/favorites`
- `PUT /api/v1/auth/favorites/:restaurantId`
- `DELETE /api/v1/auth/favorites/:restaurantId`

### Customer

- `GET /api/v1/restaurants/discover`
- `GET /api/v1/restaurants`
- `GET /api/v1/restaurants/:id`
- `GET /api/v1/cart`
- `POST /api/v1/cart/items`
- `PATCH /api/v1/cart/items/:menuItemId`
- `DELETE /api/v1/cart/items/:menuItemId`
- `DELETE /api/v1/cart`
- `GET /api/v1/orders`
- `POST /api/v1/orders`
- `GET /api/v1/orders/:id`

### Vendor

- `GET /api/v1/vendor/overview`
- `GET /api/v1/vendor/restaurant`
- `PUT /api/v1/vendor/restaurant`
- `GET /api/v1/vendor/menu`
- `POST /api/v1/vendor/menu`
- `PUT /api/v1/vendor/menu/:id`
- `PATCH /api/v1/vendor/menu/:id/availability`
- `DELETE /api/v1/vendor/menu/:id`
- `GET /api/v1/vendor/orders`
- `GET /api/v1/vendor/orders/:id`
- `PATCH /api/v1/vendor/orders/:id/status`

## Verification

The frontend production build was verified successfully with:

```bash
cd client
npm run build
```

## What Changed In This Iteration

- Rebuilt the public landing experience around live discovery data
- Added a dedicated authenticated customer app shell
- Added real favorites backed by MongoDB and customer APIs
- Refactored vendor frontend into modular tabs and shared UI
- Split vendor backend controller responsibilities into focused files
- Removed dead or unrouted screens from the repo
- Replaced boilerplate docs with product-grade setup and feature documentation














# NearBites — Updated Files

## Files to replace in your project:

### Frontend (client/src/)
- `features/home/CustomerHome.jsx` — 6 homepage games + all social features
- `features/order/OrderTracking.jsx` — 6 post-order games + leaderboard + rewards

### Backend (server/)
- `controllers/aiController.js` — Real Anthropic AI with smart fallbacks
- `config/socket.js` — Already complete in your codebase (document 13 is final)

## Games Summary

### Homepage Games (CustomerHome.jsx):
1. 🎰 Spin Wheel — Spin to get a restaurant/food suggestion (+10 XP)
2. 🧠 Mood Matcher — AI picks food based on your mood (real API call)
3. 💰 Price Guesser — Guess dish prices with a slider (up to 25 XP)
4. 🔍 Emoji Decoder — Decode food from emoji clues (up to 20 XP)
5. 🔗 Food Chain — Chain foods by last letter (5-15 XP each)
6. 📊 Higher or Lower — Guess calorie comparisons (8-15 XP each)

### Post-Order Games (OrderTracking.jsx):
1. 🎲 Food Dice — Roll dice, streak for double XP
2. 🧠 Food Trivia — 20 questions, speed bonus XP
3. 🍽️ Tap to Eat — Catch falling food, avoid bombs (speeds up!)
4. 🃏 Memory Match — Match food emoji pairs
5. ⌨️ Speed Typer — Type food names fast
6. 🎰 Spin Wheel — Restaurant spin wheel with JACKPOT (50 XP)

### Real-time Features:
- Area Leaderboard — Players within 2km, updates live via Socket.IO
- Global Records — Per-game high scores, broken record = 10% discount code
- Top 3 for 7 hours = 15% discount code (auto-triggered via socket)
- Delivery countdown synced to restaurant ETA
- XP system synced with CustomerHome XP bar

## AI Fix
Your ANTHROPIC_API_KEY in .env is a Google key (starts with AIzaSy...).
Get the real one from: https://console.anthropic.com/settings/keys
It should start with: sk-ant-api03-...

Until then, the fallback system gives smart, VARIED responses based on:
- Intent detection (healthy/spicy/budget/protein/etc.)
- Time of day (breakfast/lunch/snacks/dinner/latenight)
- User mood context