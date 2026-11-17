import { Availability, Booking, Driver, Vehicle } from '../models/index.js';
import { BLOCKING_STATUSES } from '../models/constants.js';
import { ApiError } from '../utils/ApiError.js';
import {
  addDays,
  dayOfWeek,
  daysInclusive,
  isTimeInWindow,
  localDateStr,
  timeToMinutes,
  todayStr,
} from '../utils/dateTime.js';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function withinOperatingHours(time, start, end) {
  if (!start || !end || start === end) return true;
  return isTimeInWindow(time, start, end) || time === end;
}

/**
 * Validates the requested schedule against booking settings and admin-configured
 * availability (holidays, blocked dates, blocked slots, restrictions).
 * Throws ApiError(422) with a customer-friendly message on failure.
 */
export async function validateSchedule({ bookingType, tripType, pickupDate, pickupTime, returnDate, pickupAt, cityId, settings, now = new Date() }) {
  const b = settings.booking || {};
  if (b.enabled === false) throw ApiError.unprocessable('Online booking is currently closed. Please call us to book.');
  if (bookingType === 'local' && b.localEnabled === false) throw ApiError.unprocessable('Local bookings are currently unavailable.');
  if (bookingType === 'outstation' && b.outstationEnabled === false) throw ApiError.unprocessable('Outstation bookings are currently unavailable.');

  const minAdvanceMs = (b.minAdvanceHours || 0) * 3600000;
  if (pickupAt.getTime() < now.getTime() + minAdvanceMs) {
    throw ApiError.unprocessable(
      b.minAdvanceHours ? `Pickup must be at least ${b.minAdvanceHours} hour(s) from now.` : 'Pickup time must be in the future.',
    );
  }
  if (b.maxAdvanceDays && pickupDate > addDays(todayStr(), b.maxAdvanceDays)) {
    throw ApiError.unprocessable(`Bookings can be made up to ${b.maxAdvanceDays} days in advance.`);
  }
  if (tripType === 'round_trip') {
    if (!returnDate || returnDate < pickupDate) throw ApiError.unprocessable('Return date must be on or after the pickup date.');
    if (b.maxTripDays && daysInclusive(pickupDate, returnDate) > b.maxTripDays) {
      throw ApiError.unprocessable(`Trips can be at most ${b.maxTripDays} days long.`);
    }
  }
  if (!withinOperatingHours(pickupTime, b.operatingStart, b.operatingEnd)) {
    throw ApiError.unprocessable(`Pickups are available between ${b.operatingStart} and ${b.operatingEnd}.`);
  }

  const entries = await Availability.find({
    isActive: true,
    type: { $in: ['date_block', 'date_open', 'time_block', 'holiday', 'restriction'] },
    startDate: { $lte: pickupDate },
    endDate: { $gte: pickupDate },
    $and: [
      { $or: [{ city: null }, { city: cityId }] },
      { $or: [{ bookingType: 'all' }, { bookingType }] },
    ],
  }).lean();

  const forcedOpen = entries.some((e) => e.type === 'date_open');
  if (!forcedOpen) {
    const closed = entries.find((e) => e.type === 'holiday' || e.type === 'date_block');
    if (closed) {
      throw ApiError.unprocessable(
        `We are not accepting bookings on ${pickupDate}${closed.title ? ` (${closed.title})` : ''}. Please choose another date.`,
      );
    }
    if ((b.closedWeekdays || []).includes(dayOfWeek(pickupDate))) {
      throw ApiError.unprocessable(`We do not accept pickups on ${DAY_NAMES[dayOfWeek(pickupDate)]}s.`);
    }
  }
  const restriction = entries.find((e) => e.type === 'restriction');
  if (restriction) {
    throw ApiError.unprocessable(restriction.reason || restriction.title || 'Bookings are restricted on the selected date.');
  }
  const slot = entries.find((e) => e.type === 'time_block' && isTimeInWindow(pickupTime, e.startTime, e.endTime));
  if (slot) {
    throw ApiError.unprocessable(`The ${slot.startTime}–${slot.endTime} slot is not available on ${pickupDate}. Please choose another time.`);
  }
  return true;
}

/**
 * Returns human-readable conflicts for a vehicle and/or driver over [start, end).
 * A booking's effective vehicle is assignedVehicle, falling back to selectedVehicle.
 */
export async function findResourceConflicts({ vehicleId, driverId, start, end, excludeBookingId, includePending = false }) {
  const conflicts = [];
  const statuses = includePending ? [...BLOCKING_STATUSES, 'pending'] : BLOCKING_STATUSES;
  const base = {
    status: { $in: statuses },
    pickupAt: { $lt: end },
    tripEndAt: { $gt: start },
  };
  if (excludeBookingId) base._id = { $ne: excludeBookingId };
  const fromDate = localDateStr(start);
  const toDate = localDateStr(end);

  if (vehicleId) {
    const vehicle = await Vehicle.findById(vehicleId).lean();
    if (!vehicle) conflicts.push('Vehicle not found');
    else {
      if (!vehicle.isActive) conflicts.push(`${vehicle.name} is inactive`);
      if (vehicle.maintenanceStatus === 'under_maintenance') conflicts.push(`${vehicle.name} is under maintenance`);
      if (vehicle.availabilityStatus === 'unavailable') conflicts.push(`${vehicle.name} is marked unavailable`);
    }
    const clash = await Booking.findOne({
      ...base,
      $or: [{ assignedVehicle: vehicleId }, { assignedVehicle: null, selectedVehicle: vehicleId }],
    })
      .select('bookingRef pickupDate pickupTime status')
      .lean();
    if (clash) conflicts.push(`Vehicle already booked on ${clash.bookingRef} (${clash.pickupDate} ${clash.pickupTime}, ${clash.status})`);
    const block = await Availability.findOne({
      isActive: true,
      type: 'vehicle_block',
      vehicle: vehicleId,
      startDate: { $lte: toDate },
      endDate: { $gte: fromDate },
    }).lean();
    if (block) conflicts.push(`Vehicle blocked ${block.startDate} → ${block.endDate}${block.reason ? `: ${block.reason}` : ''}`);
  }

  if (driverId) {
    const driver = await Driver.findById(driverId).lean();
    if (!driver) conflicts.push('Driver not found');
    else {
      if (!driver.isActive) conflicts.push(`${driver.fullName} is inactive`);
      if (driver.availability === 'on_leave') conflicts.push(`${driver.fullName} is on leave`);
    }
    const clash = await Booking.findOne({ ...base, assignedDriver: driverId })
      .select('bookingRef pickupDate pickupTime status')
      .lean();
    if (clash) conflicts.push(`Driver already assigned to ${clash.bookingRef} (${clash.pickupDate} ${clash.pickupTime}, ${clash.status})`);
    const block = await Availability.findOne({
      isActive: true,
      type: 'driver_block',
      driver: driverId,
      startDate: { $lte: toDate },
      endDate: { $gte: fromDate },
    }).lean();
    if (block) conflicts.push(`Driver blocked ${block.startDate} → ${block.endDate}${block.reason ? `: ${block.reason}` : ''}`);
  }

  return conflicts;
}

/** Sort helper used by the calendar. */
export const byTime = (a, b) => timeToMinutes(a.pickupTime) - timeToMinutes(b.pickupTime);
