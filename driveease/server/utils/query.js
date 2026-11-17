import mongoose from 'mongoose';

export const escapeRegex = (s = '') => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function getPagination(query, { defaultLimit = 20, maxLimit = 100 } = {}) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(maxLimit, Math.max(1, parseInt(query.limit, 10) || defaultLimit));
  return { page, limit, skip: (page - 1) * limit };
}

/**
 * Parse "?sort=-createdAt,name" restricted to allowed fields.
 */
export function buildSort(sortParam, allowed = [], fallback = { createdAt: -1 }) {
  if (!sortParam) return fallback;
  const sort = {};
  String(sortParam)
    .split(',')
    .forEach((part) => {
      const desc = part.startsWith('-');
      const field = desc ? part.slice(1) : part;
      if (allowed.includes(field)) sort[field] = desc ? -1 : 1;
    });
  return Object.keys(sort).length ? sort : fallback;
}

export const paginated = (items, total, { page, limit }) => ({
  items,
  pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) },
});

export const isObjectId = (v) => mongoose.Types.ObjectId.isValid(v) && String(new mongoose.Types.ObjectId(v)) === String(v);

export const toBool = (v) => (v === undefined || v === '' ? undefined : v === true || v === 'true' || v === '1');
