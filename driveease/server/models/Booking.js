import mongoose from 'mongoose';
import {
  AC_TYPES,
  BOOKING_STATUSES,
  BOOKING_TYPES,
  PAYMENT_STATUSES,
  TRIP_TYPES,
} from './constants.js';

const { ObjectId, Mixed } = mongoose.Schema.Types;

const fareItemSchema = new mongoose.Schema(
  { key: String, label: String, amount: Number, note: String },
  { _id: false },
);

/**
 * Immutable pricing snapshot captured at booking time. Later rate changes never
 * modify it; admins may set `finalAmount` separately.
 */
const fareSchema = new mongoose.Schema(
  {
    currency: { type: String, default: 'INR' },
    distanceKm: Number,
    billableKm: Number,
    tripDays: Number,
    ratePerKm: Number,
    rateSource: String,
    baseFare: Number,
    seasonalAdjustment: { type: Number, default: 0 },
    seasonalRule: {
      id: ObjectId,
      name: String,
      adjustmentType: String,
      adjustmentValue: Number,
      priority: Number,
    },
    driverAllowance: { type: Number, default: 0 },
    nightCharges: { type: Number, default: 0 },
    tollCharges: { type: Number, default: 0 },
    parkingCharges: { type: Number, default: 0 },
    minimumFareAdjustment: { type: Number, default: 0 },
    subtotal: Number,
    gstPercent: { type: Number, default: 0 },
    gst: { type: Number, default: 0 },
    total: { type: Number, required: true },
    extraKmRate: Number,
    extraHourRate: Number,
    waitingChargePerHour: Number,
    items: [fareItemSchema],
    notes: [String],
    appliedRates: Mixed, // raw config values used
    calculatedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const statusHistorySchema = new mongoose.Schema(
  {
    status: { type: String, enum: BOOKING_STATUSES },
    note: String,
    changedBy: { type: ObjectId, ref: 'Admin' },
    changedByName: String,
    changedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const bookingSchema = new mongoose.Schema(
  {
    bookingRef: { type: String, required: true, unique: true },
    bookingType: { type: String, enum: BOOKING_TYPES, required: true },
    tripType: { type: String, enum: [...TRIP_TYPES, null], default: null },

    pickupCity: { type: ObjectId, ref: 'City', required: true },
    pickupCityName: String,
    dropCity: { type: ObjectId, ref: 'City' },
    dropCityName: String,
    route: { type: ObjectId, ref: 'Route' },
    pickupAddress: { type: String, trim: true, maxlength: 300 },
    dropAddress: { type: String, trim: true, maxlength: 300 },

    pickupDate: { type: String, required: true }, // YYYY-MM-DD (business local)
    pickupTime: { type: String, required: true }, // HH:mm
    returnDate: String,
    pickupAt: { type: Date, required: true },
    tripEndAt: { type: Date, required: true },

    passengers: { type: Number, required: true, min: 1, max: 60 },
    category: { type: ObjectId, ref: 'CarCategory' },
    categoryName: String,
    selectedVehicle: { type: ObjectId, ref: 'Vehicle' },
    selectedVehicleName: String,
    acPreference: { type: String, enum: AC_TYPES, default: 'ac' },
    localPackage: { type: ObjectId, ref: 'LocalPackage' },
    localPackageSnapshot: { name: String, hours: Number, km: Number },

    customer: { type: ObjectId, ref: 'Customer' },
    customerName: { type: String, required: true, trim: true },
    customerPhone: { type: String, required: true, trim: true },
    customerEmail: { type: String, trim: true, lowercase: true },
    instructions: { type: String, trim: true, maxlength: 1000 },

    fare: { type: fareSchema, required: true },
    finalAmount: { type: Number, min: 0 }, // admin-confirmed amount; defaults to fare.total

    status: { type: String, enum: BOOKING_STATUSES, default: 'pending' },
    statusHistory: [statusHistorySchema],

    assignedVehicle: { type: ObjectId, ref: 'Vehicle' },
    assignedDriver: { type: ObjectId, ref: 'Driver' },
    adminNotes: { type: String, trim: true, maxlength: 3000 },
    cancellationReason: { type: String, trim: true, maxlength: 500 },
    rejectionReason: { type: String, trim: true, maxlength: 500 },

    payment: {
      status: { type: String, enum: PAYMENT_STATUSES, default: 'unpaid' },
      method: String,
      amountPaid: { type: Number, default: 0 },
      pendingAmount: { type: Number, default: 0 },
      lastPaymentAt: Date,
      notes: String,
    },

    whatsapp: {
      adminNumber: String,
      generatedAt: Date,
    },
  },
  { timestamps: true },
);

bookingSchema.index({ status: 1, pickupAt: 1 });
bookingSchema.index({ customerPhone: 1 });
bookingSchema.index({ customer: 1, createdAt: -1 });
bookingSchema.index({ assignedVehicle: 1, pickupAt: 1, tripEndAt: 1 });
bookingSchema.index({ selectedVehicle: 1, pickupAt: 1, tripEndAt: 1 });
bookingSchema.index({ assignedDriver: 1, pickupAt: 1, tripEndAt: 1 });
bookingSchema.index({ createdAt: -1 });
bookingSchema.index({ 'payment.status': 1 });

bookingSchema.virtual('payableAmount').get(function payable() {
  return this.finalAmount ?? this.fare?.total ?? 0;
});

bookingSchema.set('toJSON', { virtuals: true });
bookingSchema.set('toObject', { virtuals: true });

export default mongoose.model('Booking', bookingSchema);
