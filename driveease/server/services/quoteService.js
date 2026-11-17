/**
 * Loads & validates every entity referenced by a booking request, then computes the
 * fare on the server. Used for both fare estimates and booking creation, so the
 * client-submitted amount is never trusted.
 */
import { CarCategory, City, LocalPackage, PricingRule, Route, Vehicle } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { computeFare, computeTripWindow, resolvePerKmRate } from './fareService.js';
import { getPricingConfig, getSettings } from './settingsService.js';
import { validateSchedule } from './availabilityService.js';

const idEq = (a, b) => String(a?._id ?? a) === String(b?._id ?? b);

export async function findRoute(fromId, toId) {
  const direct = await Route.findOne({ fromCity: fromId, toCity: toId, isActive: true }).lean();
  if (direct) return direct;
  return Route.findOne({ fromCity: toId, toCity: fromId, isActive: true, isBidirectional: true }).lean();
}

function assertVehicleUsable(vehicle, { ac, passengers }) {
  if (!vehicle || !vehicle.isActive || !vehicle.isVisible) throw ApiError.unprocessable('The selected car is not available.');
  if (vehicle.availabilityStatus === 'unavailable' || vehicle.maintenanceStatus === 'under_maintenance') {
    throw ApiError.unprocessable(`${vehicle.name} is currently unavailable. Please choose another car.`);
  }
  if (vehicle.acType !== 'both' && vehicle.acType !== ac) {
    throw ApiError.unprocessable(`${vehicle.name} is available only as ${vehicle.acType === 'ac' ? 'AC' : 'Non-AC'}.`);
  }
  if (passengers > vehicle.seatingCapacity) {
    throw ApiError.unprocessable(`${vehicle.name} seats up to ${vehicle.seatingCapacity} passengers.`);
  }
}

/**
 * @param input validated request body (see validators/bookingValidators.js)
 * @param opts.skipSchedule  skip date/time availability checks (vehicle list estimates)
 */
export async function buildQuote(input, { skipSchedule = false, preloaded = {} } = {}) {
  const settings = preloaded.settings || (await getSettings());
  const config = preloaded.config || (await getPricingConfig());
  const ac = input.acPreference === 'non_ac' ? 'non_ac' : 'ac';

  const pickupCity = await City.findOne({ _id: input.pickupCity, isActive: true }).lean();
  if (!pickupCity) throw ApiError.unprocessable('Selected pickup city is not available.');

  let dropCity = null;
  let route = null;
  let localPackage = null;

  if (input.bookingType === 'local') {
    if (pickupCity.localServiceAvailable === false) throw ApiError.unprocessable(`Local service is not available in ${pickupCity.name}.`);
    localPackage = await LocalPackage.findOne({ _id: input.localPackage, isActive: true }).lean();
    if (!localPackage) throw ApiError.unprocessable('Please select a valid local package.');
    if (localPackage.cities?.length && !localPackage.cities.some((c) => idEq(c, pickupCity._id))) {
      throw ApiError.unprocessable(`The ${localPackage.name} package is not offered in ${pickupCity.name}.`);
    }
  } else {
    if (pickupCity.outstationServiceAvailable === false) {
      throw ApiError.unprocessable(`Outstation trips from ${pickupCity.name} are not available.`);
    }
    dropCity = await City.findOne({ _id: input.dropCity, isActive: true }).lean();
    if (!dropCity) throw ApiError.unprocessable('Selected destination city is not available.');
    if (idEq(dropCity._id, pickupCity._id)) throw ApiError.unprocessable('Pickup and destination cities must be different.');
    route = await findRoute(pickupCity._id, dropCity._id);
    if (!route) {
      throw ApiError.unprocessable(
        `We don't have a scheduled route from ${pickupCity.name} to ${dropCity.name} yet. Please contact us for a custom quote.`,
      );
    }
    if (input.tripType === 'one_way' && !route.oneWayAvailable) throw ApiError.unprocessable('One-way trips are not available on this route.');
    if (input.tripType === 'round_trip' && !route.roundTripAvailable) throw ApiError.unprocessable('Round trips are not available on this route.');
  }

  let vehicle = null;
  let category = null;
  if (input.vehicle) {
    vehicle = await Vehicle.findById(input.vehicle).lean();
    assertVehicleUsable(vehicle, { ac, passengers: input.passengers });
    if (input.category && !idEq(input.category, vehicle.category)) {
      throw ApiError.unprocessable('The selected car does not belong to the selected category.');
    }
  } else if (settings.booking?.requireCarSelection && !preloaded.allowNoVehicle) {
    throw ApiError.unprocessable('Please select a car.');
  }

  const categoryId = input.category || vehicle?.category;
  if (categoryId) {
    category = await CarCategory.findOne({ _id: categoryId, isActive: true }).lean();
    if (!category) throw ApiError.unprocessable('Selected car category is not available.');
    if (!vehicle && category.seatingCapacity && input.passengers > category.seatingCapacity) {
      throw ApiError.unprocessable(`${category.name} cars seat up to ${category.seatingCapacity} passengers.`);
    }
  }

  if (route?.applicableCategories?.length && category && !route.applicableCategories.some((c) => idEq(c, category._id))) {
    throw ApiError.unprocessable(`${category.name} cars are not available on this route.`);
  }

  const window = computeTripWindow({ ...input, route, localPackage });
  if (!skipSchedule) {
    await validateSchedule({
      ...input,
      pickupAt: window.pickupAt,
      cityId: pickupCity._id,
      settings,
    });
  }

  const rules = preloaded.rules || (await PricingRule.find({ isActive: true }).lean());
  const fare = computeFare({ input: { ...input, acPreference: ac }, config, rules, route, vehicle, category, localPackage });

  return { fare, settings, config, pickupCity, dropCity, route, category, vehicle, localPackage, window, acPreference: ac };
}

/** "From ₹X/km" for public car cards, independent of a specific trip. */
export function startingRate(vehicle, config) {
  return resolvePerKmRate({ bookingType: 'outstation', ac: vehicle.acType === 'non_ac' ? 'non_ac' : 'ac', category: vehicle.category, vehicle, config }).rate;
}
