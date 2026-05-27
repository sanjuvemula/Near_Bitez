# NearBites

NearBites is a full-stack food ordering platform for customer ordering and vendor operations. It includes public restaurant discovery, authenticated customer tools, and a vendor dashboard backed by MongoDB APIs.

## Features

- Public restaurant discovery with live backend data
- Customer auth, profile, favorites, cart, checkout, and order tracking
- Vendor restaurant profile, menu, order, analytics, and chat tools
- Admin chat and protected admin routes
- Real-time updates with Socket.IO
- Cloudinary-backed media uploads
- Email OTP and optional Google OAuth login
- Game score, NearCoins, XP, missions, streaks, and leaderboard APIs
- Installable PWA shell with offline app fallback
- Customer Fun Zone with food games connected to coupons and rewards

## Tech Stack

- React 19, Vite, Tailwind CSS, Framer Motion
- Node.js, Express 5, Socket.IO
- MongoDB with Mongoose
- JWT auth with HTTP-only cookies
- Cloudinary, Resend, Google OAuth

## Project Structure

```text
client/
  src/
    app/
    components/
    config/
    context/
    features/
    hooks/
    services/

server/
  config/
  controllers/
  middleware/
  models/
  routes/
  services/
  utils/
```

## Product Modules

- Customer app: restaurant discovery, sticky search, categories, cart, checkout, orders, favorites, tiffin plans, profile, reviews, and live tracking.
- Shop owner app: dashboard, restaurant profile, menu, inventory, orders, reviews, promos, analytics, logistics, and wallet surfaces.
- Admin app: analytics, user/restaurant/rider management foundations, reports, account controls, and monitoring views.
- Gamification: levels from Beginner Foodie to NearBites Legend, NearCoins, XP, daily streaks, Lucky Hour, daily missions, reward claims, badges, and real-time leaderboards.
- Fun Zone: Delivery Race, Cook Combo, Hungry Monster, Coupon Hunt, Spin Battle, Mystery Food Box, Chef Boss Fight, Food Snake, Restaurant Empire, Blind Taste Challenge, Food Memory, Tap The Burger, Pizza Catcher, Lucky Card Flip, Food Quiz, Delivery Rider Runner, Guess The Dish, and Daily Treasure Hunt.
- PWA: manifest, install prompt, full-screen mobile mode metadata, service worker shell caching, splash/theme color, and offline fallback.

## Local Setup

Install dependencies:

```bash
npm install
cd client
npm install
```

Create `server/.env` from `server/.env.example`. Keep real secrets only in local env files and deployment dashboards.

```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173
CLIENT_URLS=http://localhost:5173,http://127.0.0.1:5173,https://near-bitez.vercel.app
PUBLIC_CLIENT_URL=http://localhost:5173
MONGO_URI=mongodb://127.0.0.1:27017/nearbytez
JWT_SECRET=replace-with-a-long-random-secret-at-least-32-characters
JWT_EXPIRE=30d
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-api-secret
STRIPE_SECRET_KEY=your-stripe-secret-key
RAZORPAY_KEY_ID=your-razorpay-key-id
RAZORPAY_KEY_SECRET=your-razorpay-secret
VAPID_PUBLIC_KEY=your-web-push-public-key
VAPID_PRIVATE_KEY=your-web-push-private-key
```

Optional: create `client/.env` from `client/.env.example`.

```env
VITE_API_URL=/api/v1
VITE_SOCKET_URL=http://localhost:5000
```

Run the backend:

```bash
npm run dev
```

Run the frontend:

```bash
cd client
npm run dev
```

Open:

- Frontend: `http://localhost:5173`
- API health check: `http://localhost:5000/api/v1/health`

## Production Env

Set real values in Render and Vercel. Do not commit them.

Render backend:

```env
NODE_ENV=production
CLIENT_URL=https://near-bitez.vercel.app
CLIENT_URLS=https://near-bitez.vercel.app
PUBLIC_CLIENT_URL=https://near-bitez.vercel.app
GOOGLE_CALLBACK_URL=https://near-bitez.onrender.com/api/v1/auth/google/callback
```

Also set `MONGO_URI`, `JWT_SECRET`, Cloudinary keys, `RESEND_API_KEY`, and any AI keys used by the app.

Vercel frontend:

```env
VITE_API_URL=https://near-bitez.onrender.com/api/v1
VITE_SOCKET_URL=https://near-bitez.onrender.com
```

The frontend has production fallbacks for the current Render backend, but explicit Vercel env values are still recommended.

## Scripts

Root:

- `npm run dev` - start the Express API in watch mode
- `npm run start` - start the Express API normally

Client:

- `npm run dev` - start the Vite app
- `npm run build` - create a production build
- `npm run preview` - preview the production build
- `npm run lint` - run ESLint

## API Surface

Auth:

- `POST /api/v1/auth/customer/register`
- `POST /api/v1/auth/customer/login`
- `POST /api/v1/auth/vendor/register`
- `POST /api/v1/auth/vendor/login`
- `GET /api/v1/auth/me`
- `PATCH /api/v1/auth/me`
- `GET /api/v1/auth/favorites`
- `PUT /api/v1/auth/favorites/:restaurantId`
- `DELETE /api/v1/auth/favorites/:restaurantId`

Customer:

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
- `GET /api/v1/games/feed`
- `PATCH /api/v1/games/score`
- `POST /api/v1/games/claim`
- `GET /api/v1/games/leaderboard`
- `GET /api/v1/games/wheel-segments`
- `GET /api/v1/games/scratch-rewards`

Vendor:

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

## Security Notes

- Do not commit `.env` files, logs, `node_modules`, or build output.
- Rotate any credential that was ever committed to git history.
- Keep the GitHub repository private unless you are ready to publish the code.
- Use HTTPS in production so secure auth cookies, push notifications, payment callbacks, Socket.IO, and PWA install prompts work reliably.

## Deployment Checklist

1. Create MongoDB Atlas, Cloudinary, Google OAuth, Resend, payment, and push-notification credentials.
2. Deploy the API to Render/Railway/Fly with `npm start`, `NODE_ENV=production`, and the production env above.
3. Deploy `client` to Vercel/Netlify with `npm run build`, `VITE_API_URL`, and `VITE_SOCKET_URL`.
4. Add the frontend domain to `CLIENT_URLS` and OAuth callback allowlists.
5. Verify `/api/v1/health`, login, restaurant discovery, cart checkout, Socket.IO order updates, `/app/games`, PWA install, and offline reload.
