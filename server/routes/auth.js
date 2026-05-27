import express from "express";
import jwt from "jsonwebtoken";
import passport from "../config/passport.js";
import {
  getMe,
  loginCustomer,
  loginVendor,
  logout,
  registerCustomer,
  registerVendor,
  updateMe,
  sendOTP,
  verifyOTPLogin,
} from "../controllers/auth.js";
import {
  addFavoriteRestaurant,
  getFavoriteRestaurants,
  removeFavoriteRestaurant,
} from "../controllers/favoriteController.js";
import { getPrimaryClientUrl } from "../config/cors.js";
import { authorize, protect } from "../middleware/auth.js";
import { ensureAdminRole, getEffectiveRole } from "../utils/adminAccess.js";

const router = express.Router();

const cookieOptions = {
  httpOnly: true,
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  secure: process.env.NODE_ENV === "production",
  maxAge: 30 * 24 * 60 * 60 * 1000,
};

// Normal auth
router.post("/customer/register", registerCustomer);
router.post("/customer/login", loginCustomer);
router.post("/vendor/register", registerVendor);
router.post("/vendor/login", loginVendor);
router.post("/logout", protect, logout);
router.get("/me", protect, getMe);
router.patch("/me", protect, updateMe);

// OTP
router.post("/otp/send", sendOTP);
router.post("/otp/verify", verifyOTPLogin);

// Favorites
router.get("/favorites", protect, authorize("customer", "admin"), getFavoriteRestaurants);
router.put("/favorites/:restaurantId", protect, authorize("customer", "admin"), addFavoriteRestaurant);
router.delete("/favorites/:restaurantId", protect, authorize("customer", "admin"), removeFavoriteRestaurant);

// Google OAuth
router.get("/google", passport.authenticate("google", { scope: ["profile", "email"], session: false }));

const clientRedirect = (path) => `${getPrimaryClientUrl()}${path}`;

router.get("/google/callback", (req, res, next) => {
  passport.authenticate("google", { session: false }, async (error, user) => {
    if (error || !user) {
      res.redirect(clientRedirect("/customer/login"));
      return;
    }

    try {
      await ensureAdminRole(user);
      const effectiveRole = getEffectiveRole(user);
      const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE || "30d",
      });

      res.cookie("token", token, cookieOptions);

      const redirectMap = {
        admin: "/admin",
        vendor: "/vendor/dashboard",
        customer: "/app",
      };

      res.redirect(clientRedirect(redirectMap[effectiveRole] || "/app"));
    } catch (callbackError) {
      next(callbackError);
    }
  }
  )(req, res, next);
});

export default router;
