import jwt from 'jsonwebtoken';
import { Admin } from '../models/index.js';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const signToken = (admin) =>
  jwt.sign({ sub: String(admin._id), role: admin.role }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });

/** Requires a valid Bearer JWT for an active admin. */
export const protect = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) throw ApiError.unauthorized();

  let payload;
  try {
    payload = jwt.verify(token, env.jwtSecret);
  } catch {
    throw ApiError.unauthorized('Session expired or invalid. Please log in again.');
  }
  const admin = await Admin.findById(payload.sub);
  if (!admin || !admin.isActive) throw ApiError.unauthorized('Account not found or disabled');
  if (admin.changedPasswordAfter(payload.iat)) throw ApiError.unauthorized('Password changed. Please log in again.');
  req.admin = admin;
  next();
});

/** Restrict to roles. superadmin always passes. */
export const authorize =
  (...roles) =>
  (req, _res, next) => {
    if (!req.admin) return next(ApiError.unauthorized());
    if (req.admin.role === 'superadmin' || roles.includes(req.admin.role)) return next();
    return next(ApiError.forbidden());
  };
