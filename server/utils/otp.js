import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

// Store OTPs in memory (in production use Redis)
const otpStore = new Map();

export const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const saveOTP = (email, otp) => {
  otpStore.set(email.toLowerCase(), {
    otp,
    expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
    attempts: 0,
  });
};

export const verifyOTP = (email, otp) => {
  const record = otpStore.get(email.toLowerCase());

  if (!record) return { valid: false, message: "OTP not found. Please request a new one." };
  if (Date.now() > record.expiresAt) {
    otpStore.delete(email.toLowerCase());
    return { valid: false, message: "OTP expired. Please request a new one." };
  }
  if (record.attempts >= 3) {
    otpStore.delete(email.toLowerCase());
    return { valid: false, message: "Too many attempts. Please request a new OTP." };
  }
  if (record.otp !== otp) {
    record.attempts += 1;
    return { valid: false, message: "Invalid OTP. Please try again." };
  }

  otpStore.delete(email.toLowerCase());
  return { valid: true };
};

export const sendOTPEmail = async (email, otp, name = "") => {
  await resend.emails.send({
    from: "NearBites <onboarding@resend.dev>",
    to: email,
    subject: "Your NearBites verification code",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #fff;">
        <div style="text-align: center; margin-bottom: 32px;">
          <div style="background: #ea580c; display: inline-block; padding: 12px 20px; border-radius: 12px;">
            <span style="color: white; font-size: 20px; font-weight: 900;">NearBites</span>
          </div>
        </div>
        
        <h1 style="font-size: 24px; font-weight: 800; color: #111; margin-bottom: 8px;">
          ${name ? `Hi ${name},` : "Hi there,"}
        </h1>
        <p style="color: #555; font-size: 15px; line-height: 1.6; margin-bottom: 32px;">
          Your verification code for NearBites is:
        </p>
        
        <div style="background: #fff7ed; border: 2px solid #fed7aa; border-radius: 16px; padding: 24px; text-align: center; margin-bottom: 32px;">
          <span style="font-size: 42px; font-weight: 900; color: #ea580c; letter-spacing: 8px;">
            ${otp}
          </span>
        </div>
        
        <p style="color: #888; font-size: 13px; text-align: center;">
          This code expires in <strong>10 minutes</strong>. Do not share it with anyone.
        </p>
        
        <hr style="border: none; border-top: 1px solid #f0f0f0; margin: 24px 0;" />
        <p style="color: #aaa; font-size: 12px; text-align: center;">
          If you didn't request this, you can safely ignore this email.
        </p>
      </div>
    `,
  });
};