import mongoose from 'mongoose';
import { FUEL_TYPES } from './constants.js';

/**
 * A Vehicle is both the physical fleet unit (registration, driver, maintenance)
 * and the "car" customers see and select on the public website.
 */
const vehicleSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    brand: { type: String, required: true, trim: true, maxlength: 60 },
    model: { type: String, required: true, trim: true, maxlength: 60 },
    year: { type: Number, min: 1990, max: 2100 },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'CarCategory', required: true },
    images: {
      type: [{ type: String, trim: true }],
      validate: [(v) => v.length <= 12, 'A vehicle can have at most 12 images'],
    },
    registrationNumber: { type: String, trim: true, uppercase: true, maxlength: 20 },
    color: { type: String, trim: true },
    seatingCapacity: { type: Number, required: true, min: 1, max: 60 },
    luggageCapacity: { type: Number, default: 2, min: 0, max: 50 },
    acType: { type: String, enum: ['ac', 'non_ac', 'both'], default: 'both' },
    fuelType: { type: String, enum: FUEL_TYPES, required: true },
    // Vehicle-specific per-KM rates (fuel included). 0 = use pricing tables.
    perKmRate: { type: Number, default: 0, min: 0 },
    nonAcPerKmRate: { type: Number, default: 0, min: 0 },
    minimumBookingAmount: { type: Number, default: 0, min: 0 },
    description: { type: String, trim: true, maxlength: 2000 },
    features: [{ type: String, trim: true, maxlength: 60 }],
    assignedDriver: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver', default: null },
    availabilityStatus: {
      type: String,
      enum: ['available', 'unavailable', 'on_trip'],
      default: 'available',
    },
    maintenanceStatus: {
      type: String,
      enum: ['ok', 'scheduled', 'under_maintenance'],
      default: 'ok',
    },
    lastServiceDate: Date,
    nextServiceDate: Date,
    isVisible: { type: Boolean, default: true }, // show on public website
    displayOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

vehicleSchema.index(
  { registrationNumber: 1 },
  { unique: true, partialFilterExpression: { registrationNumber: { $type: 'string', $gt: '' } } },
);
vehicleSchema.index({ category: 1, displayOrder: 1 });
vehicleSchema.index({ isVisible: 1, isActive: 1 });
vehicleSchema.index({ name: 'text', brand: 'text', model: 'text' });

vehicleSchema.virtual('isBookable').get(function isBookable() {
  return this.isActive && this.availabilityStatus !== 'unavailable' && this.maintenanceStatus !== 'under_maintenance';
});

vehicleSchema.set('toJSON', { virtuals: true });
vehicleSchema.set('toObject', { virtuals: true });

export default mongoose.model('Vehicle', vehicleSchema);
