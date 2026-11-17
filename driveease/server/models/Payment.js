import mongoose from 'mongoose';

/** Offline payment record (cash / UPI / other) collected by driver or admin. */
const paymentSchema = new mongoose.Schema(
  {
    booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
    bookingRef: String,
    type: { type: String, enum: ['payment', 'refund'], default: 'payment' },
    amount: { type: Number, required: true, min: [1, 'Amount must be greater than 0'] },
    method: { type: String, required: true, trim: true, maxlength: 40 },
    reference: { type: String, trim: true, maxlength: 100 }, // UPI txn id, receipt no.
    collectedBy: { type: String, trim: true, maxlength: 80 },
    paidAt: { type: Date, default: Date.now },
    notes: { type: String, trim: true, maxlength: 1000 },
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  },
  { timestamps: true },
);

paymentSchema.index({ booking: 1, paidAt: -1 });
paymentSchema.index({ paidAt: -1 });

export default mongoose.model('Payment', paymentSchema);
