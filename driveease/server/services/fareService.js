/**
 * DriveEase pricing engine.
 *
 * Fuel cost is INCLUDED in every per-KM rate; it is never added separately.
 *
 * PER-KM RATE RESOLUTION (outstation; first match wins)
 *   1. Route-specific rate for the car category            (rateSource: "route")
 *   2. Selected vehicle's own rate                          (rateSource: "vehicle")
 *   3. Most specific matching row of the pricing rate table (rateSource: "rate_table")
 *        score = (category matches ? 4 : 0) + (fuel type matches ? 2 : 0)
 *        rows with category=null / fuelType="any" act as wildcards
 *   4. Global default rate for booking type & AC/non-AC     (rateSource: "default")
 *   The resolved rate is then multiplied by the one-way / round-trip multiplier.
 *
 * LOCAL bookings are priced by package: category price for the package if set,
 * otherwise the package base price (AC / non-AC).
 *
 * SEASONAL RULES: of all active rules matching the pickup date, booking type,
 * category and fuel type, ONLY ONE is applied: the highest `priority`; ties go to
 * the more specific rule, then to the most recently updated. Adjustments never stack.
 *
 * TOTAL = baseFare + seasonalAdjustment + driverAllowance + nightCharges
 *       + tollCharges + parkingCharges + minimumFareAdjustment + GST
 */
import { dayOfWeek, daysInclusive, isTimeInWindow, timeToMinutes, toInstant, endOfDayInstant } from '../utils/dateTime.js';
import { ApiError } from '../utils/ApiError.js';

const round = (n) => Math.round(Number(n) || 0);
const idEq = (a, b) => a != null && b != null && String(a?._id ?? a) === String(b?._id ?? b);

export function resolvePerKmRate({ bookingType, ac, category, vehicle, route, config }) {
  const isAc = ac !== 'non_ac';

  if (bookingType === 'outstation' && route && category) {
    const rp = (route.categoryPricing || []).find((p) => idEq(p.category, category));
    const r = rp && (isAc ? rp.perKmRate : rp.nonAcPerKmRate);
    if (r > 0) return { rate: r, source: 'route' };
  }

  if (bookingType === 'outstation' && vehicle) {
    const r = isAc ? vehicle.perKmRate : vehicle.nonAcPerKmRate;
    if (r > 0) return { rate: r, source: 'vehicle' };
  }

  const fuel = vehicle?.fuelType;
  let best = null;
  let bestScore = -1;
  for (const row of config.rateTable || []) {
    if (row.bookingType !== bookingType) continue;
    if (row.category && !idEq(row.category, category)) continue;
    if (row.fuelType && row.fuelType !== 'any' && row.fuelType !== fuel) continue;
    const r = isAc ? row.acRate : row.nonAcRate;
    if (!(r > 0)) continue;
    const score = (row.category ? 4 : 0) + (row.fuelType && row.fuelType !== 'any' ? 2 : 0);
    if (score > bestScore) {
      best = r;
      bestScore = score;
    }
  }
  if (best) return { rate: best, source: 'rate_table' };

  const def = config.defaultRates?.[bookingType];
  const r = def && (isAc ? def.ac : def.nonAc);
  if (r > 0) return { rate: r, source: 'default' };
  return { rate: 0, source: 'none' };
}

function ruleSpecificity(r) {
  return (
    (r.startDate || r.endDate ? 4 : 0) +
    (r.categories?.length ? 2 : 0) +
    (r.fuelTypes?.length ? 1 : 0) +
    (r.bookingType && r.bookingType !== 'all' ? 1 : 0)
  );
}

export function selectPricingRule(rules, { date, bookingType, categoryId, fuelType }) {
  const dow = dayOfWeek(date);
  const matches = (rules || []).filter(
    (r) =>
      r.isActive !== false &&
      (!r.startDate || date >= r.startDate) &&
      (!r.endDate || date <= r.endDate) &&
      (!r.daysOfWeek?.length || r.daysOfWeek.includes(dow)) &&
      (!r.bookingType || r.bookingType === 'all' || r.bookingType === bookingType) &&
      (!r.categories?.length || (categoryId && r.categories.some((c) => idEq(c, categoryId)))) &&
      (!r.fuelTypes?.length || (fuelType && r.fuelTypes.includes(fuelType))),
  );
  matches.sort(
    (a, b) =>
      (b.priority || 0) - (a.priority || 0) ||
      ruleSpecificity(b) - ruleSpecificity(a) ||
      new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0),
  );
  return matches[0] || null;
}

function seasonalAmount(rule, { baseFare, billableKm }) {
  if (!rule) return 0;
  const v = Number(rule.adjustmentValue) || 0;
  if (rule.adjustmentType === 'percentage') return round((baseFare * v) / 100);
  if (rule.adjustmentType === 'per_km') return round(billableKm * v);
  return round(v);
}

const minutesToTime = (mins) => {
  const m = ((mins % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
};

/** Absolute trip window used for availability / overlap checks. */
export function computeTripWindow({ bookingType, tripType, pickupDate, pickupTime, returnDate, route, localPackage }) {
  const pickupAt = toInstant(pickupDate, pickupTime);
  let tripEndAt;
  if (bookingType === 'local') {
    tripEndAt = new Date(pickupAt.getTime() + (localPackage?.hours || 4) * 3600000);
  } else if (tripType === 'round_trip') {
    tripEndAt = endOfDayInstant(returnDate);
  } else {
    const minutes = route?.durationMinutes || 60;
    // allow a 1-hour buffer for the vehicle after drop
    tripEndAt = new Date(pickupAt.getTime() + (minutes + 60) * 60000);
  }
  return { pickupAt, tripEndAt };
}

/**
 * Pure fare computation. All entities are plain objects / documents already validated.
 */
export function computeFare({ input, config, rules = [], route, vehicle, category, localPackage }) {
  const { bookingType, tripType, pickupDate, pickupTime, returnDate } = input;
  const ac = input.acPreference === 'non_ac' ? 'non_ac' : 'ac';
  const isAc = ac === 'ac';
  const acKey = isAc ? 'ac' : 'nonAc';
  const categoryId = category?._id ?? category ?? vehicle?.category;
  const items = [];
  const notes = [];

  let distanceKm;
  let billableKm;
  let ratePerKm = 0;
  let rateSource;
  let baseFare;
  let tripDays = 1;
  let driverAllowance = 0;
  let tollCharges = 0;
  let parkingCharges = 0;
  let extraKmRate;
  let extraHourRate;
  let minimumFare;

  if (bookingType === 'local') {
    if (!localPackage) throw ApiError.badRequest('Please select a local package');
    const cp = (localPackage.categoryPrices || []).find((p) => idEq(p.category, categoryId));
    const catPrice = cp && (isAc ? cp.priceAc : cp.priceNonAc);
    baseFare = round(catPrice > 0 ? catPrice : isAc ? localPackage.basePriceAc : localPackage.basePriceNonAc);
    rateSource = catPrice > 0 ? 'package_category' : 'package';
    distanceKm = localPackage.km;
    billableKm = localPackage.km;

    const localRate = resolvePerKmRate({ bookingType: 'local', ac, category: categoryId, vehicle, config });
    ratePerKm = localRate.rate;
    extraKmRate = localPackage.extraKmRate || config.extraKmCharge?.[acKey] || localRate.rate || 0;
    extraHourRate = localPackage.extraHourRate || config.extraHourCharge?.[acKey] || 0;

    items.push({
      key: 'base',
      label: `Package: ${localPackage.name}`,
      amount: baseFare,
      note: `${localPackage.hours} hrs / ${localPackage.km} km included`,
    });
    driverAllowance = round(config.driverAllowance?.local);
    parkingCharges = round(config.parkingCharges?.local);
    minimumFare = Math.max(config.minimumFare?.local || 0, vehicle?.minimumBookingAmount || 0);
    if (extraKmRate) notes.push(`Extra KM beyond ${localPackage.km} km: ₹${extraKmRate}/km`);
    if (extraHourRate) notes.push(`Extra hour beyond ${localPackage.hours} hrs: ₹${extraHourRate}/hr`);
  } else {
    if (!route) throw ApiError.badRequest('Route is required for outstation bookings');
    const resolved = resolvePerKmRate({ bookingType: 'outstation', ac, category: categoryId, vehicle, route, config });
    if (!resolved.rate) {
      throw ApiError.unprocessable('Pricing is not configured for this selection. Please contact us for a quote.');
    }
    rateSource = resolved.source;

    if (tripType === 'round_trip') {
      tripDays = daysInclusive(pickupDate, returnDate);
      distanceKm = route.distanceKm * 2;
      const minKm = (config.roundTrip?.minKmPerDay || 0) * tripDays;
      billableKm = Math.max(distanceKm, minKm);
      ratePerKm = +(resolved.rate * (config.roundTrip?.rateMultiplier || 1)).toFixed(2);
      if (billableKm > distanceKm) {
        notes.push(`Minimum ${config.roundTrip.minKmPerDay} km/day × ${tripDays} day(s) = ${billableKm} km charged`);
      }
      tollCharges = config.tollCharges?.includeInEstimate === false ? 0 : round((route.tollCharges || config.tollCharges?.defaultOutstation || 0) * 2);
    } else {
      // One-way: one allowance per started 24h of driving (late departures are covered by night charges).
      tripDays = Math.max(1, Math.ceil((route.durationMinutes || 0) / 1440));
      distanceKm = route.distanceKm;
      billableKm = Math.max(distanceKm, config.oneWay?.minKm || 0);
      ratePerKm = +(resolved.rate * (config.oneWay?.rateMultiplier || 1)).toFixed(2);
      if (billableKm > distanceKm) notes.push(`Minimum ${billableKm} km charged for one-way trips`);
      tollCharges = config.tollCharges?.includeInEstimate === false ? 0 : round(route.tollCharges || config.tollCharges?.defaultOutstation || 0);
    }

    baseFare = round(billableKm * ratePerKm);
    extraKmRate = ratePerKm;
    extraHourRate = config.extraHourCharge?.[acKey] || 0;
    items.push({ key: 'base', label: 'Base fare', amount: baseFare, note: `${billableKm} km × ₹${ratePerKm}/km` });
    driverAllowance = round((config.driverAllowance?.outstationPerDay || 0) * tripDays);
    parkingCharges = round(route.parkingCharges || config.parkingCharges?.outstation || 0);
    minimumFare = Math.max(config.minimumFare?.outstation || 0, vehicle?.minimumBookingAmount || 0);
    notes.push(`Extra KM: ₹${extraKmRate}/km`);
  }

  // Seasonal / dynamic pricing (single rule, never stacked)
  const rule = selectPricingRule(rules, {
    date: pickupDate,
    bookingType,
    categoryId,
    fuelType: vehicle?.fuelType,
  });
  const seasonalAdjustment = seasonalAmount(rule, { baseFare, billableKm });
  if (rule && seasonalAdjustment !== 0) {
    const desc =
      rule.adjustmentType === 'percentage'
        ? `${rule.adjustmentValue > 0 ? '+' : ''}${rule.adjustmentValue}% of base fare`
        : rule.adjustmentType === 'per_km'
          ? `${rule.adjustmentValue > 0 ? '+' : ''}₹${rule.adjustmentValue}/km`
          : 'flat adjustment';
    items.push({ key: 'seasonal', label: rule.name, amount: seasonalAdjustment, note: desc });
  }

  if (driverAllowance) {
    items.push({
      key: 'driver',
      label: 'Driver allowance',
      amount: driverAllowance,
      note: bookingType === 'outstation' ? `₹${config.driverAllowance.outstationPerDay} × ${tripDays} day(s)` : undefined,
    });
  }

  // Night charges: pickup (or local drop) inside the configured night window
  let nightCharges = 0;
  const night = config.nightCharges;
  if (night?.amount > 0 && night.startTime && night.endTime) {
    const times = [pickupTime];
    if (bookingType === 'local' && localPackage) {
      times.push(minutesToTime(timeToMinutes(pickupTime) + localPackage.hours * 60));
    }
    if (times.some((t) => isTimeInWindow(t, night.startTime, night.endTime))) {
      nightCharges = round(night.amount);
      items.push({ key: 'night', label: 'Night charges', amount: nightCharges, note: `${night.startTime} – ${night.endTime}` });
    }
  }

  if (tollCharges) items.push({ key: 'toll', label: 'Toll charges (est.)', amount: tollCharges });
  if (parkingCharges) items.push({ key: 'parking', label: 'Parking charges (est.)', amount: parkingCharges });

  let subtotal = baseFare + seasonalAdjustment + driverAllowance + nightCharges + tollCharges + parkingCharges;
  let minimumFareAdjustment = 0;
  if (minimumFare && subtotal < minimumFare) {
    minimumFareAdjustment = round(minimumFare - subtotal);
    subtotal += minimumFareAdjustment;
    items.push({ key: 'minimum', label: 'Minimum fare adjustment', amount: minimumFareAdjustment, note: `Minimum fare ₹${minimumFare}` });
  }

  const gstPercent = config.gstPercent || 0;
  const taxable = subtotal - tollCharges - parkingCharges;
  const gst = gstPercent ? round((taxable * gstPercent) / 100) : 0;
  if (gst) items.push({ key: 'gst', label: `GST (${gstPercent}%)`, amount: gst });

  const total = round(subtotal + gst);
  const waitingChargePerHour = config.waitingCharges?.perHour || 0;
  if (waitingChargePerHour) {
    notes.push(`Waiting: ₹${waitingChargePerHour}/hr after ${config.waitingCharges.freeMinutes || 0} free minutes`);
  }
  if (config.notes) notes.push(config.notes);

  return {
    currency: config.currency || 'INR',
    distanceKm,
    billableKm,
    tripDays,
    ratePerKm,
    rateSource,
    baseFare,
    seasonalAdjustment,
    seasonalRule: rule
      ? {
          id: rule._id,
          name: rule.name,
          adjustmentType: rule.adjustmentType,
          adjustmentValue: rule.adjustmentValue,
          priority: rule.priority,
        }
      : undefined,
    driverAllowance,
    nightCharges,
    tollCharges,
    parkingCharges,
    minimumFareAdjustment,
    subtotal,
    gstPercent,
    gst,
    total,
    extraKmRate,
    extraHourRate,
    waitingChargePerHour,
    items,
    notes,
    appliedRates: {
      bookingType,
      tripType: tripType || null,
      acPreference: ac,
      defaultRates: config.defaultRates,
      driverAllowance: config.driverAllowance,
      nightCharges: config.nightCharges,
      minimumFare: config.minimumFare,
      oneWay: config.oneWay,
      roundTrip: config.roundTrip,
      gstPercent,
      route: route ? { id: route._id, distanceKm: route.distanceKm, tollCharges: route.tollCharges } : null,
      vehicle: vehicle ? { id: vehicle._id, perKmRate: vehicle.perKmRate, nonAcPerKmRate: vehicle.nonAcPerKmRate, fuelType: vehicle.fuelType } : null,
      localPackage: localPackage
        ? { id: localPackage._id, name: localPackage.name, basePriceAc: localPackage.basePriceAc, basePriceNonAc: localPackage.basePriceNonAc }
        : null,
    },
    calculatedAt: new Date(),
  };
}
