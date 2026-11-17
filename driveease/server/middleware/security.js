import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';

const make = (windowMs, limit, message) =>
  rateLimit({
    windowMs,
    limit: env.isTest ? 10000 : limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { success: false, message },
  });

export const loginLimiter = make(15 * 60 * 1000, 10, 'Too many login attempts. Please try again in 15 minutes.');
export const bookingLimiter = make(60 * 60 * 1000, 20, 'Too many booking requests. Please try again later or call us.');
export const quoteLimiter = make(60 * 1000, 60, 'Too many requests. Please slow down.');
export const apiLimiter = make(15 * 60 * 1000, 1000, 'Too many requests. Please try again later.');

/**
 * Strip keys starting with "$" or containing "." from body/query/params to prevent
 * MongoDB operator injection.
 */
function clean(value, depth = 0) {
  if (depth > 10 || value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map((v) => clean(v, depth + 1));
  for (const key of Object.keys(value)) {
    if (key.startsWith('$') || key.includes('.')) delete value[key];
    else value[key] = clean(value[key], depth + 1);
  }
  return value;
}

export const sanitizeRequest = (req, _res, next) => {
  if (req.body) clean(req.body);
  if (req.params) clean(req.params);
  if (req.query) clean(req.query);
  next();
};
