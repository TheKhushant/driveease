import mongoose from 'mongoose';

const categoryPricingSchema = new mongoose.Schema(
  {
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'CarCategory', required: true },
    perKmRate: { type: Number, min: 0, default: 0 }, // AC, 0 = not overridden
    nonAcPerKmRate: { type: Number, min: 0, default: 0 },
  },
  { _id: false },
);

const routeSchema = new mongoose.Schema(
  {
    fromCity: { type: mongoose.Schema.Types.ObjectId, ref: 'City', required: true },
    toCity: { type: mongoose.Schema.Types.ObjectId, ref: 'City', required: true },
    distanceKm: { type: Number, required: true, min: 1, max: 5000 },
    durationMinutes: { type: Number, required: true, min: 1 },
    applicableCategories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'CarCategory' }], // empty = all
    oneWayAvailable: { type: Boolean, default: true },
    roundTripAvailable: { type: Boolean, default: true },
    isBidirectional: { type: Boolean, default: true }, // also serves toCity → fromCity
    tollCharges: { type: Number, min: 0, default: 0 }, // one direction
    parkingCharges: { type: Number, min: 0, default: 0 },
    categoryPricing: [categoryPricingSchema],
    description: { type: String, trim: true, maxlength: 1000 },
    isPopular: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

routeSchema.index({ fromCity: 1, toCity: 1 }, { unique: true });
routeSchema.index({ toCity: 1 });

routeSchema.pre('validate', function checkCities(next) {
  if (this.fromCity && this.toCity && String(this.fromCity) === String(this.toCity)) {
    this.invalidate('toCity', 'Destination city must be different from the starting city');
  }
  next();
});

export default mongoose.model('Route', routeSchema);
