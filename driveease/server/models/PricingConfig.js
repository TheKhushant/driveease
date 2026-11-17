import mongoose from 'mongoose';
import { FUEL_TYPES } from './constants.js';
import { TIME_RE } from '../utils/dateTime.js';

const acPair = {
  ac: { type: Number, min: 0, default: 0 },
  nonAc: { type: Number, min: 0, default: 0 },
};

/**
 * Per-KM rate table row (fuel cost is INCLUDED in the rate).
 * The most specific matching row wins:
 *   category match (+4) > fuel type match (+2). Rows with category=null / fuelType='any' are wildcards.
 */
const rateRowSchema = new mongoose.Schema(
  {
    label: { type: String, trim: true, maxlength: 80 },
    bookingType: { type: String, enum: ['local', 'outstation'], required: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'CarCategory', default: null },
    fuelType: { type: String, enum: ['any', ...FUEL_TYPES], default: 'any' },
    acRate: { type: Number, min: 0, required: true },
    nonAcRate: { type: Number, min: 0, required: true },
  },
  { _id: true },
);

const pricingConfigSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'main', unique: true, immutable: true },
    currency: { type: String, default: 'INR' },
    currencySymbol: { type: String, default: '₹' },

    // Fallback per-KM rates when no table row / route / vehicle rate applies.
    defaultRates: {
      local: acPair,
      outstation: acPair,
    },
    rateTable: [rateRowSchema],

    driverAllowance: {
      local: { type: Number, min: 0, default: 0 }, // per booking
      outstationPerDay: { type: Number, min: 0, default: 300 },
    },
    nightCharges: {
      amount: { type: Number, min: 0, default: 250 },
      startTime: { type: String, match: TIME_RE, default: '22:00' },
      endTime: { type: String, match: TIME_RE, default: '06:00' },
    },
    extraKmCharge: acPair, // local packages exceeding KM (per KM), when package has none
    extraHourCharge: acPair, // local packages exceeding hours (per hour)
    waitingCharges: {
      perHour: { type: Number, min: 0, default: 100 },
      freeMinutes: { type: Number, min: 0, default: 30 },
    },
    tollCharges: {
      defaultOutstation: { type: Number, min: 0, default: 0 }, // used when route has none
      includeInEstimate: { type: Boolean, default: true },
    },
    parkingCharges: {
      local: { type: Number, min: 0, default: 0 },
      outstation: { type: Number, min: 0, default: 0 },
    },
    minimumFare: {
      local: { type: Number, min: 0, default: 0 },
      outstation: { type: Number, min: 0, default: 0 },
    },
    oneWay: {
      minKm: { type: Number, min: 0, default: 0 },
      rateMultiplier: { type: Number, min: 0.1, max: 10, default: 1 },
    },
    roundTrip: {
      minKmPerDay: { type: Number, min: 0, default: 250 },
      rateMultiplier: { type: Number, min: 0.1, max: 10, default: 1 },
    },
    gstPercent: { type: Number, min: 0, max: 28, default: 0 },
    notes: { type: String, trim: true, maxlength: 2000 }, // shown to customers under the fare
  },
  { timestamps: true },
);

export default mongoose.model('PricingConfig', pricingConfigSchema);
