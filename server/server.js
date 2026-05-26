import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import morgan from "morgan";
import cron from "node-cron";
import connectDB from "./config/db.js";
import "./config/passport.js";
import { initSocket } from "./config/socket.js";
import GameScore from "./models/GameScore.js";
import authRoutes from "./routes/auth.js";
import restaurantRoutes from "./routes/restaurant.js";
import vendorRoutes from "./routes/vendor.js";
import orderRoutes from "./routes/order.js";
import cartRoutes from "./routes/cart.js";
import adminRoutes from "./routes/adminRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import reviewRoutes from "./routes/reviewRoutes.js";
import promoRoutes from "./routes/promoRoutes.js";
import searchRoutes from "./routes/searchRoutes.js";
import favoriteRoutes from "./routes/favoriteRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";
import tiffinRoutes from "./routes/tiffinRoutes.js";
import gameRoutes from "./routes/gameRoutes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, ".env") });

const getIstDate = (date = new Date()) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);

const getYesterdayIstDate = () => {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return getIstDate(date);
};

const app = express();
const httpServer = createServer(app);

app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:5173",
  credentials: true,
}));
app.use(helmet());
app.use(cookieParser());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
}

app.get("/api/v1/health", (req, res) => {
  res.status(200).json({ success: true, message: "NearBites API is running" });
});

app.use("/api/v1/auth",        authRoutes);
app.use("/api/v1/restaurants", restaurantRoutes);
app.use("/api/v1/vendor",      vendorRoutes);
app.use("/api/v1/orders",      orderRoutes);
app.use("/api/v1/cart",        cartRoutes);
app.use("/api/v1/admin",       adminRoutes);
app.use("/api/v1/chats",       chatRoutes);
app.use("/api/v1/reviews",     reviewRoutes);
app.use("/api/v1/promos",      promoRoutes);
app.use("/api/v1/search",      searchRoutes);
app.use("/api/v1/auth/favorites", favoriteRoutes);
app.use("/api/v1/ai", aiRoutes);
app.use("/api/v1/tiffins", tiffinRoutes);
app.use("/api/v1/games", gameRoutes);

app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

const startServer = async () => {
  try {
    await connectDB();
    const io = initSocket(httpServer);
    app.set("io", io);

    cron.schedule(
      "0 0 * * *",
      async () => {
        try {
          await GameScore.updateMany(
            { date: getYesterdayIstDate(), archived: false },
            { $set: { archived: true } }
          );
          io.to("games:today").emit("leaderboard:update", {
            date: getIstDate(),
            leaderboard: [],
            currentUser: null,
          });
        } catch (error) {
          console.error("Game score archive failed:", error.message);
        }
      },
      { timezone: "Asia/Kolkata" }
    );

    const port = process.env.PORT || 5000;
    httpServer.once("error", (error) => {
      if (error.code === "EADDRINUSE") {
        console.error(`Port ${port} is already in use. Set PORT to a different value and restart the server.`);
      } else {
        console.error(error.message);
      }
      process.exit(1);
    });

    httpServer.listen(port, () => {
      console.log(`NearBites API listening on port ${port}`);
    });
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
};

startServer();









