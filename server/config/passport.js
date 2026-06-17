import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import User from "../models/User.js";
import { ensureAdminRole, isAdminEmail } from "../utils/adminAccess.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../.env") });

const googleAuthConfigured = Boolean(
  process.env.GOOGLE_CLIENT_ID &&
  process.env.GOOGLE_CLIENT_SECRET &&
  process.env.GOOGLE_CALLBACK_URL
);

if (googleAuthConfigured) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value?.toLowerCase();

          if (!email) {
            return done(new Error("Google account did not provide an email"), null);
          }

          let user = await User.findOne({ email });

          if (user) {
            await ensureAdminRole(user);
            return done(null, user);
          }

          user = await User.create({
            name: profile.displayName || email.split("@")[0],
            email,
            password: Math.random().toString(36).slice(-16),
            role: isAdminEmail(email) ? "admin" : "customer",
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
