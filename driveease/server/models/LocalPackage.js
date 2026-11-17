import mongoose from 'mongoose';

const categoryPriceSchema = new mongoose.Schema(
  {
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'CarCategory', required: true },
    priceAc: { type: Number, min: 0, default: 0 },
    priceNonAc: { type: Number, min: 0, default: 0 },
  },
  { _id: false },
);

const localPackageSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 }, // e.g. "8 Hours / 80 KM"
    hours: { type: Number, required: true, min: 1, max: 24 },
    km: { type: Number, required: true, min: 1, max: 1000 },
    basePriceAc: { type: Number, required: true, min: 0 },
    basePriceNonAc: { type: Number, required: true, min: 0 },
    categoryPrices: [categoryPriceSchema], // overrides base price per category
    extraKmRate: { type: Number, min: 0, default: 0 }, // 0 = use global pricing config
    extraHourRate: { type: Number, min: 0, default: 0 },
    cities: [{ type: mongoose.Schema.Types.ObjectId, ref: 'City' }], // empty = all cities
    description: { type: String, trim: true, maxlength: 500 },
    displayOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

localPackageSchema.index({ hours: 1, km: 1 }, { unique: true });

export default mongoose.model('LocalPackage', localPackageSchema);
