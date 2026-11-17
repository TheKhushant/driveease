import mongoose from 'mongoose';

const testimonialSchema = new mongoose.Schema(
  {
    customerName: { type: String, required: true, trim: true, maxlength: 80 },
    location: { type: String, trim: true, maxlength: 80 },
    designation: { type: String, trim: true, maxlength: 80 },
    rating: { type: Number, min: 1, max: 5, default: 5 },
    message: { type: String, required: true, trim: true, maxlength: 1000 },
    photo: { type: String, trim: true },
    tripDetails: { type: String, trim: true, maxlength: 120 },
    displayOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

testimonialSchema.index({ isActive: 1, displayOrder: 1 });

export default mongoose.model('Testimonial', testimonialSchema);
