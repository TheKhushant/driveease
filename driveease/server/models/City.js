import mongoose from 'mongoose';
import { slugify } from '../utils/slugify.js';

const citySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    slug: { type: String, unique: true, lowercase: true, trim: true },
    state: { type: String, trim: true, maxlength: 80 },
    description: { type: String, trim: true, maxlength: 2000 },
    image: { type: String, trim: true },
    isPopular: { type: Boolean, default: false }, // show in "Popular destinations"
    localServiceAvailable: { type: Boolean, default: true },
    outstationServiceAvailable: { type: Boolean, default: true },
    airportPickup: { type: Boolean, default: false },
    railwayPickup: { type: Boolean, default: true },
    startingFare: { type: Number, min: 0 },
    highlights: [{ type: String, trim: true, maxlength: 100 }],
    notes: { type: String, trim: true, maxlength: 1000 },
    displayOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

citySchema.index({ name: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });
citySchema.index({ isActive: 1, displayOrder: 1 });

citySchema.pre('validate', function setSlug(next) {
  if (this.isModified('name') || !this.slug) this.slug = slugify(this.name);
  next();
});

export default mongoose.model('City', citySchema);
