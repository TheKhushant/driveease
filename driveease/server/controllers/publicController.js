import { Booking, CarCategory, City, LocalPackage, PricingRule, Route, Testimonial, Vehicle } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { escapeRegex, isObjectId } from '../utils/query.js';
import { getPricingConfig, getSettings, publicSettings } from '../services/settingsService.js';
import { buildQuote, findRoute, startingRate } from '../services/quoteService.js';
import { computeFare } from '../services/fareService.js';
import { createBooking, publicBooking } from '../services/bookingService.js';

const PUBLIC_VEHICLE_FIELDS =
  'name brand model year category images seatingCapacity luggageCapacity acType fuelType perKmRate nonAcPerKmRate minimumBookingAmount description features displayOrder availabilityStatus maintenanceStatus';

const visibleCategoryIds = async () =>
  (await CarCategory.find({ isActive: true, isVisible: true }).select('_id').lean()).map((c) => c._id);

/** Everything the public site needs on first load, in one request. */
export const getSite = asyncHandler(async (_req, res) => {
  const settings = await getSettings();
  const [categories, cities, packages, testimonials, popularRoutes, pricing] = await Promise.all([
    CarCategory.find({ isActive: true, isVisible: true }).sort({ displayOrder: 1, name: 1 }).lean(),
    City.find({ isActive: true }).sort({ displayOrder: 1, name: 1 }).lean(),
    LocalPackage.find({ isActive: true }).sort({ displayOrder: 1, hours: 1 }).select('-categoryPrices').lean(),
    settings.display?.showTestimonials === false
      ? []
      : Testimonial.find({ isActive: true }).sort({ displayOrder: 1, createdAt: -1 }).limit(12).lean(),
    Route.find({ isActive: true, isPopular: true }).populate('fromCity toCity', 'name image slug').limit(8).lean(),
    getPricingConfig(),
  ]);
  res.json({
    success: true,
    data: {
      settings: publicSettings(settings),
      categories,
      cities,
      packages,
      testimonials,
      popularRoutes,
      pricing: { currencySymbol: pricing.currencySymbol, notes: pricing.notes, gstPercent: pricing.gstPercent },
    },
  });
});

export const getLegal = asyncHandler(async (req, res) => {
  const map = { terms: 'terms', privacy: 'privacy', cancellation: 'cancellationPolicy' };
  const field = map[req.params.type];
  if (!field) throw ApiError.notFound();
  const settings = await getSettings();
  res.json({ success: true, data: { content: settings.legal?.[field] || '' } });
});

export const listVehicles = asyncHandler(async (req, res) => {
  const settings = await getSettings();
  if (settings.display?.carSelectionEnabled === false) {
    return res.json({ success: true, data: { items: [], carSelectionEnabled: false } });
  }
  const filter = { isActive: true, isVisible: true, category: { $in: await visibleCategoryIds() } };
  const { category, search, fuelType, acType, minSeats } = req.query;
  if (category) {
    if (!isObjectId(category)) throw ApiError.badRequest('Invalid category');
    filter.category = { $in: filter.category.$in.filter((id) => String(id) === category) };
  }
  if (fuelType) filter.fuelType = String(fuelType);
  if (acType === 'ac' || acType === 'non_ac') filter.acType = { $in: [acType, 'both'] };
  if (minSeats) filter.seatingCapacity = { $gte: Number(minSeats) || 1 };
  if (search) {
    const rx = new RegExp(escapeRegex(String(search).slice(0, 60)), 'i');
    filter.$or = [{ name: rx }, { brand: rx }, { model: rx }];
  }
  const config = await getPricingConfig();
  const vehicles = await Vehicle.find(filter)
    .select(PUBLIC_VEHICLE_FIELDS)
    .populate('category', 'name slug')
    .sort({ displayOrder: 1, name: 1 })
    .lean();
  const items = vehicles.map(({ perKmRate, nonAcPerKmRate, availabilityStatus, maintenanceStatus, ...v }) => ({
    ...v,
    available: availabilityStatus !== 'unavailable' && maintenanceStatus !== 'under_maintenance',
    startingRate: startingRate({ ...v, perKmRate, nonAcPerKmRate, category: v.category?._id }, config),
  }));
  return res.json({ success: true, data: { items, carSelectionEnabled: true } });
});

export const getVehicle = asyncHandler(async (req, res) => {
  const v = await Vehicle.findOne({ _id: req.params.id, isActive: true, isVisible: true })
    .select(PUBLIC_VEHICLE_FIELDS)
    .populate('category', 'name slug')
    .lean();
  if (!v) throw ApiError.notFound('Car not found');
  const { perKmRate, nonAcPerKmRate, ...rest } = v;
  const config = await getPricingConfig();
  res.json({ success: true, data: { ...rest, startingRate: startingRate({ ...v, category: v.category?._id }, config) } });
});

export const listPackages = asyncHandler(async (req, res) => {
  const filter = { isActive: true };
  if (req.query.city && isObjectId(req.query.city)) {
    filter.$or = [{ cities: { $size: 0 } }, { cities: req.query.city }];
  }
  const items = await LocalPackage.find(filter).sort({ displayOrder: 1, hours: 1 }).select('-categoryPrices').lean();
  res.json({ success: true, data: items });
});

/** Destinations reachable from a city (database-driven, both directions for bidirectional routes). */
export const destinationsFrom = asyncHandler(async (req, res) => {
  const { cityId } = req.params;
  if (!isObjectId(cityId)) throw ApiError.badRequest('Invalid city');
  const routes = await Route.find({
    isActive: true,
    $or: [{ fromCity: cityId }, { toCity: cityId, isBidirectional: true }],
  })
    .populate('fromCity toCity', 'name isActive outstationServiceAvailable')
    .lean();
  const items = routes
    .map((r) => {
      const other = String(r.fromCity?._id) === cityId ? r.toCity : r.fromCity;
      return other?.isActive
        ? {
            city: { _id: other._id, name: other.name },
            routeId: r._id,
            distanceKm: r.distanceKm,
            durationMinutes: r.durationMinutes,
            oneWayAvailable: r.oneWayAvailable,
            roundTripAvailable: r.roundTripAvailable,
          }
        : null;
    })
    .filter(Boolean)
    .sort((a, b) => a.city.name.localeCompare(b.city.name));
  res.json({ success: true, data: items });
});

export const lookupRoute = asyncHandler(async (req, res) => {
  const { from, to } = req.query;
  if (!isObjectId(from) || !isObjectId(to)) throw ApiError.badRequest('Select pickup and destination cities');
  const route = await findRoute(from, to);
  if (!route) return res.json({ success: true, data: null, message: 'Route not available' });
  return res.json({
    success: true,
    data: {
      _id: route._id,
      distanceKm: route.distanceKm,
      durationMinutes: route.durationMinutes,
      oneWayAvailable: route.oneWayAvailable,
      roundTripAvailable: route.roundTripAvailable,
      applicableCategories: route.applicableCategories,
    },
  });
});

export const fareEstimate = asyncHandler(async (req, res) => {
  const q = await buildQuote(req.body, { preloaded: { allowNoVehicle: true } });
  res.json({
    success: true,
    data: {
      fare: q.fare,
      route: q.route ? { distanceKm: q.route.distanceKm, durationMinutes: q.route.durationMinutes } : null,
      vehicle: q.vehicle ? { _id: q.vehicle._id, name: q.vehicle.name } : null,
      category: q.category ? { _id: q.category._id, name: q.category.name } : null,
    },
  });
});

/** Estimated fare for every visible car for the given trip (car selection UI). */
export const vehicleEstimates = asyncHandler(async (req, res) => {
  const base = await buildQuote({ ...req.body, category: undefined }, { skipSchedule: true, preloaded: { allowNoVehicle: true } });
  const rules = await PricingRule.find({ isActive: true }).lean();
  const filter = { isActive: true, isVisible: true, category: { $in: await visibleCategoryIds() } };
  if (req.body.category) filter.category = req.body.category;
  const vehicles = await Vehicle.find(filter).lean();
  const ac = base.acPreference;
  const estimates = {};
  for (const v of vehicles) {
    let reason = null;
    if (v.availabilityStatus === 'unavailable' || v.maintenanceStatus === 'under_maintenance') reason = 'Currently unavailable';
    else if (v.acType !== 'both' && v.acType !== ac) reason = v.acType === 'ac' ? 'AC only' : 'Non-AC only';
    else if (req.body.passengers > v.seatingCapacity) reason = `Seats up to ${v.seatingCapacity}`;
    else if (base.route?.applicableCategories?.length && !base.route.applicableCategories.some((c) => String(c) === String(v.category))) {
      reason = 'Not available on this route';
    }
    if (reason) {
      estimates[v._id] = { available: false, reason };
      continue;
    }
    try {
      const fare = computeFare({
        input: { ...req.body, acPreference: ac },
        config: base.config,
        rules,
        route: base.route,
        vehicle: v,
        category: v.category,
        localPackage: base.localPackage,
      });
      estimates[v._id] = { available: true, total: fare.total, ratePerKm: fare.ratePerKm };
    } catch (err) {
      estimates[v._id] = { available: false, reason: err.message };
    }
  }
  res.json({ success: true, data: estimates });
});

export const submitBooking = asyncHandler(async (req, res) => {
  const { booking, whatsappUrl, whatsappMessage } = await createBooking(req.body);
  res.status(201).json({
    success: true,
    message: 'Booking request received',
    data: { booking: publicBooking(booking), whatsappUrl, whatsappMessage },
  });
});

export const trackBooking = asyncHandler(async (req, res) => {
  const ref = String(req.params.ref || '').toUpperCase().slice(0, 30);
  const booking = await Booking.findOne({ bookingRef: ref, customerPhone: req.validatedQuery.phone });
  if (!booking) throw ApiError.notFound('No booking found with this reference and phone number');
  res.json({ success: true, data: publicBooking(booking) });
});
