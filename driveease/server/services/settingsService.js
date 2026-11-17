import { PricingConfig, WebsiteSettings } from '../models/index.js';
import { DEFAULT_PRICING, DEFAULT_SETTINGS } from '../utils/defaults.js';

/** Returns the singleton settings document, creating it with defaults if missing. */
export async function getSettings() {
  let doc = await WebsiteSettings.findOne({ key: 'main' });
  if (!doc) {
    try {
      doc = await WebsiteSettings.create({ key: 'main', ...DEFAULT_SETTINGS });
    } catch (err) {
      if (err.code !== 11000) throw err; // created concurrently
      doc = await WebsiteSettings.findOne({ key: 'main' });
    }
  }
  return doc;
}

export async function getPricingConfig() {
  let doc = await PricingConfig.findOne({ key: 'main' });
  if (!doc) {
    try {
      doc = await PricingConfig.create({ key: 'main', ...DEFAULT_PRICING });
    } catch (err) {
      if (err.code !== 11000) throw err;
      doc = await PricingConfig.findOne({ key: 'main' });
    }
  }
  return doc;
}

/** Fields that are safe to expose on the public website. */
export function publicSettings(settings) {
  const s = settings.toObject ? settings.toObject() : settings;
  return {
    branding: s.branding,
    hero: s.hero,
    about: s.about,
    services: (s.services || []).filter((x) => x.isActive !== false),
    whyChooseUs: (s.whyChooseUs || []).filter((x) => x.isActive !== false),
    faqs: (s.faqs || []).filter((x) => x.isActive !== false),
    contact: s.contact,
    social: s.social,
    footer: s.footer,
    seo: s.seo,
    display: s.display,
    booking: {
      enabled: s.booking?.enabled,
      localEnabled: s.booking?.localEnabled,
      outstationEnabled: s.booking?.outstationEnabled,
      operatingStart: s.booking?.operatingStart,
      operatingEnd: s.booking?.operatingEnd,
      minAdvanceHours: s.booking?.minAdvanceHours,
      maxAdvanceDays: s.booking?.maxAdvanceDays,
      maxTripDays: s.booking?.maxTripDays,
      requireCarSelection: s.booking?.requireCarSelection,
      confirmationMessage: s.booking?.confirmationMessage,
    },
    paymentMethods: s.paymentMethods,
    upiId: s.upiId,
    hasLegal: {
      terms: Boolean(s.legal?.terms),
      privacy: Boolean(s.legal?.privacy),
      cancellationPolicy: Boolean(s.legal?.cancellationPolicy),
    },
  };
}
