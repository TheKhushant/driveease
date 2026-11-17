import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getPricingConfig, getSettings } from '../services/settingsService.js';

const SETTINGS_SECTIONS = [
  'branding',
  'hero',
  'about',
  'services',
  'whyChooseUs',
  'faqs',
  'contact',
  'social',
  'footer',
  'legal',
  'seo',
  'display',
  'booking',
  'paymentMethods',
  'upiId',
];

const PRICING_SECTIONS = [
  'currency',
  'currencySymbol',
  'defaultRates',
  'rateTable',
  'driverAllowance',
  'nightCharges',
  'extraKmCharge',
  'extraHourCharge',
  'waitingCharges',
  'tollCharges',
  'parkingCharges',
  'minimumFare',
  'oneWay',
  'roundTrip',
  'gstPercent',
  'notes',
];

const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date);

/** Deep-merge plain objects; arrays and primitives replace. */
function deepMerge(target, source) {
  const out = { ...(isPlainObject(target) ? target : {}) };
  for (const [k, v] of Object.entries(source)) {
    out[k] = isPlainObject(v) && isPlainObject(out[k]) ? deepMerge(out[k], v) : v;
  }
  return out;
}

/**
 * Apply whitelisted sections. Object sections are merged with existing values so a
 * partial update never wipes sibling fields; array sections are replaced.
 */
function applySections(doc, body, allowed) {
  const keys = Object.keys(body || {}).filter((k) => allowed.includes(k));
  if (!keys.length) throw ApiError.badRequest(`Nothing to update. Allowed sections: ${allowed.join(', ')}`);
  keys.forEach((k) => {
    const current = doc.toObject()[k];
    doc.set(k, isPlainObject(body[k]) ? deepMerge(current, body[k]) : body[k]);
  });
}

export const getAdminSettings = asyncHandler(async (_req, res) => {
  res.json({ success: true, data: await getSettings() });
});

/** PUT /admin/settings — send one or more whole sections, e.g. { hero: {...}, contact: {...} }. */
export const updateSettings = asyncHandler(async (req, res) => {
  const doc = await getSettings();
  const body = { ...req.body };
  if (Array.isArray(body.paymentMethods)) {
    body.paymentMethods = [...new Set(body.paymentMethods.map((m) => String(m).trim()).filter(Boolean))];
    if (!body.paymentMethods.length) throw ApiError.badRequest('Keep at least one payment method');
  }
  applySections(doc, body, SETTINGS_SECTIONS);
  await doc.save();
  res.json({ success: true, message: 'Settings saved', data: doc });
});

export const getPricing = asyncHandler(async (_req, res) => {
  const doc = await getPricingConfig();
  await doc.populate('rateTable.category', 'name');
  res.json({ success: true, data: doc });
});

export const updatePricing = asyncHandler(async (req, res) => {
  const doc = await getPricingConfig();
  const body = { ...req.body };
  if (Array.isArray(body.rateTable)) {
    body.rateTable = body.rateTable.map((r) => ({
      ...r,
      category: r.category?._id || r.category || null,
      fuelType: r.fuelType || 'any',
    }));
  }
  applySections(doc, body, PRICING_SECTIONS);
  await doc.save();
  await doc.populate('rateTable.category', 'name');
  res.json({ success: true, message: 'Pricing saved. New rates apply to new bookings only.', data: doc });
});
