import mongoose from 'mongoose';
import { FUEL_TYPES, PRICING_RULE_TYPES } from './constants.js';
import { DATE_RE } from '../utils/dateTime.js';

/**
 * Seasonal / dynamic pricing rule. Exactly ONE rule (the highest priority match)
 * is applied per booking — adjustments never stack.
 */
const pricingRuleSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    ruleType: { type: String, enum: PRICING_RULE_TYPES, default: 'custom' },
    description: { type: String, trim: true, maxlength: 500 },
    startDate: { type: String, match: [DATE_RE, 'Use YYYY-MM-DD'] }, // inclusive, optional
    endDate: { type: String, match: [DATE_RE, 'Use YYYY-MM-DD'] }, // inclusive, optional
    daysOfWeek: [{ type: Number, min: 0, max: 6 }], // empty = every day
    bookingType: { type: String, enum: ['all', 'local', 'outstation'], default: 'all' },
    categories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'CarCategory' }], // empty = all
    fuelTypes: [{ type: String, enum: FUEL_TYPES }], // empty = all
    adjustmentType: {
      type: String,
      enum: ['percentage', 'per_km', 'flat'],
      required: true,
      default: 'percentage',
    },
    // percentage: +10 => +10% of base fare; per_km: +2 => ₹2/KM extra; flat: +500 => ₹500.
    // Negative values give discounts.
    adjustmentValue: { type: Number, required: true },
    priority: { type: Number, default: 0, min: 0, max: 1000 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

pricingRuleSchema.index({ isActive: 1, priority: -1 });
pricingRuleSchema.index({ name: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });

pricingRuleSchema.pre('validate', function checkDates(next) {
  if (this.startDate && this.endDate && this.endDate < this.startDate) {
    this.invalidate('endDate', 'End date must be on or after start date');
  }
  if (this.adjustmentType === 'percentage' && this.adjustmentValue <= -100) {
    this.invalidate('adjustmentValue', 'Percentage discount must be greater than -100');
  }
  next();
});

export default mongoose.model('PricingRule', pricingRuleSchema);
