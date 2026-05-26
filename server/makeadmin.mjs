import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
dotenv.config();
await mongoose.connect(process.env.MONGO_URI);
const { default: User } = await import('./models/User.js');
const salt = await bcrypt.genSalt(10);
const hashed = await bcrypt.hash('Admin@123', salt);
const result = await User.findOneAndUpdate(
  { email: 'krishtaliyan132@gmail.com' },
  { password: hashed },
  { new: true }
);
console.log('Password reset! Email:', result.email);
process.exit();
