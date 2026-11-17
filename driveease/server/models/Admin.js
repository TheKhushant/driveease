import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { ADMIN_ROLES } from './constants.js';

const adminSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Invalid email'],
    },
    password: { type: String, required: true, minlength: 8, select: false },
    role: { type: String, enum: ADMIN_ROLES, default: 'admin' },
    phone: { type: String, trim: true },
    avatar: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
    lastLoginAt: Date,
    passwordChangedAt: Date,
  },
  { timestamps: true },
);

adminSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  if (!this.isNew) this.passwordChangedAt = new Date(Date.now() - 1000);
  next();
});

adminSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

/** True if the password changed after the token was issued. */
adminSchema.methods.changedPasswordAfter = function changedPasswordAfter(jwtIat) {
  if (!this.passwordChangedAt) return false;
  return Math.floor(this.passwordChangedAt.getTime() / 1000) > jwtIat;
};

adminSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.password;
    delete ret.__v;
    return ret;
  },
});

export default mongoose.model('Admin', adminSchema);
