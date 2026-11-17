import mongoose from 'mongoose';
import { slugify } from '../utils/slugify.js';

const carCategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    slug: { type: String, unique: true, lowercase: true, trim: true },
    description: { type: String, trim: true, maxlength: 1000 },
    image: { type: String, trim: true },
    seatingCapacity: { type: Number, min: 1, max: 60 },
    luggageCapacity: { type: Number, min: 0, max: 50 },
    startingPrice: { type: Number, min: 0 },
    displayOrder: { type: Number, default: 0 },
    isVisible: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

carCategorySchema.index({ name: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });
carCategorySchema.index({ displayOrder: 1 });

carCategorySchema.pre('validate', function setSlug(next) {
  if (this.isModified('name') || !this.slug) this.slug = slugify(this.name);
  next();
});

export default mongoose.model('CarCategory', carCategorySchema);
