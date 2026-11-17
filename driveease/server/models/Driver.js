import mongoose from 'mongoose';

const driverSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true, maxlength: 80 },
    phone: {
      type: String,
      required: true,
      trim: true,
      match: [/^\+?[0-9]{10,15}$/, 'Invalid phone number'],
    },
    alternatePhone: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    photo: { type: String, trim: true },
    licenseNumber: { type: String, required: true, trim: true, uppercase: true, maxlength: 30 },
    licenseExpiry: Date,
    address: { type: String, trim: true, maxlength: 300 },
    assignedVehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', default: null },
    experienceYears: { type: Number, default: 0, min: 0, max: 60 },
    languages: [{ type: String, trim: true }],
    availability: {
      type: String,
      enum: ['available', 'on_trip', 'off_duty', 'on_leave'],
      default: 'available',
    },
    isActive: { type: Boolean, default: true },
    notes: { type: String, trim: true, maxlength: 2000 },
  },
  { timestamps: true },
);

driverSchema.index({ phone: 1 }, { unique: true });
driverSchema.index({ licenseNumber: 1 }, { unique: true });
driverSchema.index({ fullName: 'text', phone: 'text' });

export default mongoose.model('Driver', driverSchema);
