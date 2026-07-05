import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";
import jwt from "jsonwebtoken";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import User from "../models/User.js";
import {
  ensureAdminRole,
  getEffectiveRole,
  isAdminEmail,
  normalizeEmail,
} from "../utils/adminAccess.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../.env") });

const googleAuthConfigured = Boolean(
  process.env.GOOGLE_CLIENT_ID &&
  process.env.GOOGLE_CLIENT_SECRET
);

const LOCAL_CALLBACK_PATTERN =
  /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/api\/v1\/auth\/google\/callback$/i;

const getJwtSecret = () => process.env.JWT_SECRET || "nearbytez-google-oauth-state-dev";

const getRequestOrigin = (req) => {
  const forwardedProto = String(req?.headers?.["x-forwarded-proto"] || "")
    .split(",")[0]
    .trim();
  const protocol = forwardedProto || req?.protocol || "http";
  const host = req?.headers?.["x-forwarded-host"] || req?.headers?.host;
  return `${protocol}://${host}`;
};

export const getGoogleCallbackUrl = (req) => {
  const configured = String(process.env.GOOGLE_CALLBACK_URL || "").trim();
  const requestCallback = `${getRequestOrigin(req)}/api/v1/auth/google/callback`;

  if (!configured) return requestCallback;
  if (process.env.NODE_ENV === "production" && LOCAL_CALLBACK_PATTERN.test(configured)) {
    return requestCallback;
  }
  return configured;
};

const normalizeGoogleRole = (role) =>
  String(role || "").toLowerCase() === "vendor" ? "vendor" : "customer";

const normalizeGoogleMode = (mode) =>
  String(mode || "").toLowerCase() === "register" ? "register" : "login";

export const createGoogleOAuthState = (req) =>
  jwt.sign(
    {
      role: normalizeGoogleRole(req.query.role),
      mode: normalizeGoogleMode(req.query.mode),
    },
    getJwtSecret(),
    {
      audience: "nearbytez-google-oauth",
      expiresIn: "10m",
      issuer: "nearbytez",
    }
  );

export const getGoogleOAuthIntent = (req) => {
  try {
    const payload = jwt.verify(String(req?.query?.state || ""), getJwtSecret(), {
      audience: "nearbytez-google-oauth",
      issuer: "nearbytez",
    });
    return {
      role: normalizeGoogleRole(payload.role),
      mode: normalizeGoogleMode(payload.mode),
    };
  } catch {
    return {
      role: normalizeGoogleRole(req?.query?.role),
      mode: normalizeGoogleMode(req?.query?.mode),
    };
  }
};

if (googleAuthConfigured) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL || "/api/v1/auth/google/callback",
        passReqToCallback: true,
      },
      async (req, accessToken, refreshToken, profile, done) => {
        try {
          const intent = getGoogleOAuthIntent(req);
          const email = normalizeEmail(profile.emails?.[0]?.value);

          if (!email) {
            return done(new Error("Google account did not provide an email"), null);
          }

          let user = await User.findOne({ email });

          if (user) {
            await ensureAdminRole(user);
            const effectiveRole = getEffectiveRole(user);
            if (intent.role === "vendor" && !["vendor", "admin"].includes(effectiveRole)) {
              return done(null, false, { code: "google_role_mismatch", role: "vendor" });
            }
            return done(null, user);
          }

          user = await User.create({
            name: profile.displayName || email.split("@")[0],
            email,
            password: Math.random().toString(36).slice(-16),
            role: isAdminEmail(email) ? "admin" : intent.role,
            phone: "",
          });

          return done(null, user);
        } catch (error) {
          return done(error, null);
        }
      }
    )
  );
}

export const isGoogleAuthConfigured = () => googleAuthConfigured;

export default passport;
