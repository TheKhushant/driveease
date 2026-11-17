import mongoose from 'mongoose';
import { TIME_RE } from '../utils/dateTime.js';

const titled = new mongoose.Schema(
  {
    title: { type: String, trim: true, maxlength: 120 },
    description: { type: String, trim: true, maxlength: 1000 },
    icon: { type: String, trim: true, maxlength: 40 }, // lucide icon name
    image: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { _id: true },
);

const faqSchema = new mongoose.Schema(
  {
    question: { type: String, trim: true, maxlength: 300 },
    answer: { type: String, trim: true, maxlength: 3000 },
    isActive: { type: Boolean, default: true },
  },
  { _id: true },
);

const hexColor = { type: String, match: [/^#[0-9a-fA-F]{6}$/, 'Use a hex colour like #0f766e'] };

/** Single document (key: 'main') holding all admin-editable website content & settings. */
const websiteSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'main', unique: true, immutable: true },

    branding: {
      companyName: { type: String, trim: true, default: 'DriveEase', maxlength: 80 },
      tagline: { type: String, trim: true, maxlength: 160 },
      logo: { type: String, trim: true },
      favicon: { type: String, trim: true },
      primaryColor: { ...hexColor, default: '#0f766e' },
      secondaryColor: { ...hexColor, default: '#f59e0b' },
    },

    hero: {
      heading: { type: String, trim: true, maxlength: 160 },
      subheading: { type: String, trim: true, maxlength: 160 },
      description: { type: String, trim: true, maxlength: 600 },
      bannerImages: [{ type: String, trim: true }],
      ctaText: { type: String, trim: true, maxlength: 40 },
    },

    about: {
      title: { type: String, trim: true, maxlength: 160 },
      content: { type: String, trim: true, maxlength: 5000 },
      image: { type: String, trim: true },
      stats: [
        {
          label: { type: String, trim: true, maxlength: 40 },
          value: { type: String, trim: true, maxlength: 20 },
          _id: false,
        },
      ],
    },

    services: [titled],
    whyChooseUs: [titled],
    faqs: [faqSchema],

    contact: {
      phone: { type: String, trim: true },
      alternatePhone: { type: String, trim: true },
      whatsappNumber: { type: String, trim: true }, // digits incl. country code, e.g. 919876543210
      email: { type: String, trim: true },
      address: { type: String, trim: true, maxlength: 400 },
      mapEmbedUrl: { type: String, trim: true },
      workingHours: { type: String, trim: true, maxlength: 120 },
    },

    social: {
      facebook: String,
      instagram: String,
      twitter: String,
      youtube: String,
      linkedin: String,
    },

    footer: {
      text: { type: String, trim: true, maxlength: 600 },
      copyright: { type: String, trim: true, maxlength: 200 },
    },

    legal: {
      terms: { type: String, maxlength: 50000 },
      privacy: { type: String, maxlength: 50000 },
      cancellationPolicy: { type: String, maxlength: 20000 },
    },

    seo: {
      title: { type: String, trim: true, maxlength: 120 },
      description: { type: String, trim: true, maxlength: 320 },
      keywords: { type: String, trim: true, maxlength: 500 },
      ogImage: { type: String, trim: true },
    },

    // Homepage / car selection display controls
    display: {
      carSelectionEnabled: { type: Boolean, default: true },
      carDisplayMode: { type: String, enum: ['categories_first', 'all_cars'], default: 'categories_first' },
      showPopularDestinations: { type: Boolean, default: true },
      showCars: { type: Boolean, default: true },
      showCategories: { type: Boolean, default: true },
      showServices: { type: Boolean, default: true },
      showWhyChooseUs: { type: Boolean, default: true },
      showTestimonials: { type: Boolean, default: true },
      showFaq: { type: Boolean, default: true },
      showAbout: { type: Boolean, default: true },
      showFareBreakdown: { type: Boolean, default: true },
    },

    booking: {
      enabled: { type: Boolean, default: true },
      localEnabled: { type: Boolean, default: true },
      outstationEnabled: { type: Boolean, default: true },
      operatingStart: { type: String, match: TIME_RE, default: '05:00' },
      operatingEnd: { type: String, match: TIME_RE, default: '23:00' },
      closedWeekdays: [{ type: Number, min: 0, max: 6 }],
      minAdvanceHours: { type: Number, min: 0, default: 2 },
      maxAdvanceDays: { type: Number, min: 1, default: 90 },
      maxTripDays: { type: Number, min: 1, default: 30 },
      pendingBlocksVehicle: { type: Boolean, default: false },
      requireCarSelection: { type: Boolean, default: false },
      bookingRefPrefix: { type: String, trim: true, uppercase: true, default: 'DE', maxlength: 6 },
      confirmationMessage: { type: String, trim: true, maxlength: 600 },
    },

    paymentMethods: {
      type: [{ type: String, trim: true, maxlength: 40 }],
      default: ['Cash', 'UPI'],
    },
    upiId: { type: String, trim: true },
  },
  { timestamps: true },
);

export default mongoose.model('WebsiteSettings', websiteSettingsSchema);
