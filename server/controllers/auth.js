import jwt from "jsonwebtoken";
import User from "../models/User.js";
import {
  ensureAdminRole,
  getEffectiveRole,
  isAdminEmail,
  normalizeEmail,
} from "../utils/adminAccess.js";
import { generateOTP, saveOTP, verifyOTP, sendOTPEmail } from "../utils/otp.js";

const cookieOptions = {
  httpOnly: true,
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  secure: process.env.NODE_ENV === "production",
  maxAge: 30 * 24 * 60 * 60 * 1000,
};

const signToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || "30d",
  });

const sendAuthResponse = async (user, statusCode, res, message) => {
  await ensureAdminRole(user);
  const token = signToken(user._id);
  res.status(statusCode).cookie("token", token, cookieOptions).json({
    success: true,
    message,
    user: user.toSafeObject(),
  });
};

const createRegisterHandler = (role) => async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;
    const normalizedEmail = normalizeEmail(email);

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: "Name, email, and password are required" });
    }

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({ success: false, message: "Email is already registered" });
    }

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password,
      phone: phone?.trim() || "",
      role: isAdminEmail(normalizedEmail) ? "admin" : role,
    });

    await sendAuthResponse(
      user,
      201,
      res,
      isAdminEmail(normalizedEmail)
        ? "Admin account created successfully"
        : role === "vendor"
        ? "Vendor account created successfully"
        : "Customer account created successfully"
    );
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: Object.values(error.errors).map((item) => item.message).join(", "),
      });
    }
    return res.status(500).json({ success: false, message: "Unable to create account right now" });
  }
};

const createLoginHandler = (role) => async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = normalizeEmail(email);

    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password are required" });
    }

    const user = await User.findOne({ email: normalizedEmail }).select("+password");
    const effectiveRole = getEffectiveRole(user);

    if (!user || (effectiveRole !== role && effectiveRole !== "admin")) {
      return res.status(401).json({
        success: false,
        message: role === "vendor" ? "Invalid vendor credentials" : "Invalid customer credentials",
      });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: role === "vendor" ? "Invalid vendor credentials" : "Invalid customer credentials",
      });
    }

    await sendAuthResponse(
      user,
      200,
      res,
      effectiveRole === "admin"
        ? "Admin login successful"
        : role === "vendor"
        ? "Vendor login successful"
        : "Customer login successful"
    );
  } catch (error) {
    return res.status(500).json({ success: false, message: "Unable to log in right now" });
  }
};

// ─── OTP Routes ───────────────────────────────────────────────────────────────

// Step 1 — Send OTP
export const sendOTP = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: "Email is required" });

    const user = await User.findOne({ email: normalizeEmail(email) });
    if (!user) return res.status(404).json({ success: false, message: "No account found with this email" });

    const otp = generateOTP();
    saveOTP(normalizeEmail(email), otp);
    await sendOTPEmail(normalizeEmail(email), otp, user.name);

    res.json({ success: true, message: "OTP sent to your email" });
  } catch (error) {
    console.error("OTP send error:", error);
    res.status(500).json({ success: false, message: "Unable to send OTP" });
  }
};

// Step 2 — Verify OTP and login
export const verifyOTPLogin = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ success: false, message: "Email and OTP are required" });

    const result = verifyOTP(normalizeEmail(email), otp);
    if (!result.valid) return res.status(400).json({ success: false, message: result.message });

    const user = await User.findOne({ email: normalizeEmail(email) });
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    await sendAuthResponse(user, 200, res, "Login successful");
  } catch (error) {
    res.status(500).json({ success: false, message: "Unable to verify OTP" });
  }
};

export const registerCustomer = createRegisterHandler("customer");
export const loginCustomer = createLoginHandler("customer");
export const registerVendor = createRegisterHandler("vendor");
export const loginVendor = createLoginHandler("vendor");

export const getMe = async (req, res) => {
  res.status(200).json({ success: true, user: req.user.toSafeObject() });
};

export const updateMe = async (req, res) => {
  try {
    const { name, phone, address } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        ...(name !== undefined ? { name: name.trim() } : {}),
        ...(phone !== undefined ? { phone: phone.trim() } : {}),
        ...(address !== undefined ? { address: address.trim() } : {}),
      },
      { new: true, runValidators: true }
    );
    res.status(200).json({ success: true, message: "Profile updated", user: user.toSafeObject() });
  } catch (error) {
    res.status(400).json({ success: false, message: "Unable to update profile" });
  }
};

export const logout = async (req, res) => {
  res.status(200).cookie("token", "", { ...cookieOptions, maxAge: 0 }).json({
    success: true,
    message: "Logged out successfully",
  });
};
