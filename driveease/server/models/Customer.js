import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    phone: { type: String, required: true, trim: true, match: [/^\+?[0-9]{10,15}$/, 'Invalid phone number'] },
    email: { type: String, trim: true, lowercase: true },
    city: { type: String, trim: true },
    totalBookings: { type: Number, default: 0 },
    lastBookingAt: Date,
    notes: { type: String, trim: true, maxlength: 2000 },
    isBlocked: { type: Boolean, default: false },
  },
  { timestamps: true },
);

customerSchema.index({ phone: 1 }, { unique: true });
customerSchema.index({ name: 'text', phone: 'text', email: 'text' });

export default mongoose.model('Customer', customerSchema);
