import { Admin } from '../models/index.js';
import { signToken } from '../middleware/auth.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const admin = await Admin.findOne({ email }).select('+password');
  // Same message for unknown email / wrong password to avoid user enumeration.
  if (!admin || !(await admin.comparePassword(password))) throw ApiError.unauthorized('Invalid email or password');
  if (!admin.isActive) throw ApiError.forbidden('This account is disabled');
  admin.lastLoginAt = new Date();
  await admin.save({ validateBeforeSave: false });
  res.json({ success: true, data: { token: signToken(admin), admin } });
});

export const me = asyncHandler(async (req, res) => {
  res.json({ success: true, data: req.admin });
});

export const updateProfile = asyncHandler(async (req, res) => {
  const { name, email, phone, avatar } = req.body;
  if (email !== req.admin.email && (await Admin.exists({ email, _id: { $ne: req.admin._id } }))) {
    throw ApiError.conflict('Email is already in use');
  }
  Object.assign(req.admin, { name, email, phone, avatar });
  await req.admin.save();
  res.json({ success: true, message: 'Profile updated', data: req.admin });
});

export const changePassword = asyncHandler(async (req, res) => {
  const admin = await Admin.findById(req.admin._id).select('+password');
  if (!(await admin.comparePassword(req.body.currentPassword))) {
    throw ApiError.badRequest('Current password is incorrect');
  }
  admin.password = req.body.newPassword;
  await admin.save();
  res.json({ success: true, message: 'Password changed', data: { token: signToken(admin) } });
});
