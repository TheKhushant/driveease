import mongoose from 'mongoose';
import { AVAILABILITY_TYPES } from './constants.js';
import { DATE_RE, TIME_RE } from '../utils/dateTime.js';

const availabilitySchema = new mongoose.Schema(
  {
    type: { type: String, enum: AVAILABILITY_TYPES, required: true },
    title: { type: String, trim: true, maxlength: 120 },
    startDate: { type: String, required: true, match: [DATE_RE, 'Use YYYY-MM-DD'] },
    endDate: { type: String, required: true, match: [DATE_RE, 'Use YYYY-MM-DD'] },
    startTime: { type: String, match: [TIME_RE, 'Use HH:mm'] }, // time_block only
    endTime: { type: String, match: [TIME_RE, 'Use HH:mm'] },
    vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' }, // vehicle_block
    driver: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver' }, // driver_block
    city: { type: mongoose.Schema.Types.ObjectId, ref: 'City' }, // optional scope
    bookingType: { type: String, enum: ['all', 'local', 'outstation'], default: 'all' },
    reason: { type: String, trim: true, maxlength: 500 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

availabilitySchema.index({ type: 1, startDate: 1, endDate: 1 });
availabilitySchema.index({ vehicle: 1, startDate: 1 });
availabilitySchema.index({ driver: 1, startDate: 1 });

availabilitySchema.pre('validate', function check(next) {
  if (this.startDate && this.endDate && this.endDate < this.startDate) {
    this.invalidate('endDate', 'End date must be on or after start date');
  }
  if (this.type === 'time_block') {
    if (!this.startTime || !this.endTime) this.invalidate('startTime', 'Time slot requires start and end time');
    else if (this.startTime === this.endTime) this.invalidate('endTime', 'End time must differ from start time');
  }
  if (this.type === 'vehicle_block' && !this.vehicle) this.invalidate('vehicle', 'Select a vehicle to block');
  if (this.type === 'driver_block' && !this.driver) this.invalidate('driver', 'Select a driver to block');
  next();
});

export default mongoose.model('Availability', availabilitySchema);
