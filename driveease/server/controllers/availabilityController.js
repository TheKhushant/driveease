import { Availability, Booking } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { addDays, endOfDayInstant, isValidDateStr, toInstant } from '../utils/dateTime.js';
import { isObjectId } from '../utils/query.js';
import { findResourceConflicts } from '../services/availabilityService.js';
import { getSettings } from '../services/settingsService.js';

/** Month view: availability entries + bookings overlapping the month. */
export const calendar = asyncHandler(async (req, res) => {
  const month = String(req.query.month || '');
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw ApiError.badRequest('month must be YYYY-MM');
  const first = `${month}-01`;
  const nextMonthFirst = addDays(`${month}-28`, 4).slice(0, 7) + '-01';
  const last = addDays(nextMonthFirst, -1);

  const [entries, bookings, settings] = await Promise.all([
    Availability.find({ startDate: { $lte: last }, endDate: { $gte: first } })
      .populate('vehicle', 'name registrationNumber')
      .populate('driver', 'fullName')
      .populate('city', 'name')
      .sort({ startDate: 1 })
      .lean(),
    Booking.find({
      status: { $nin: ['rejected', 'cancelled'] },
      pickupAt: { $lte: endOfDayInstant(last) },
      tripEndAt: { $gte: toInstant(first) },
    })
      .select('bookingRef status pickupDate pickupTime returnDate customerName pickupCityName dropCityName bookingType assignedVehicle selectedVehicleName assignedDriver')
      .populate('assignedVehicle', 'name')
      .populate('assignedDriver', 'fullName')
      .sort({ pickupAt: 1 })
      .lean(),
    getSettings(),
  ]);

  res.json({
    success: true,
    data: {
      month,
      first,
      last,
      entries,
      bookings,
      operatingHours: { start: settings.booking?.operatingStart, end: settings.booking?.operatingEnd },
      closedWeekdays: settings.booking?.closedWeekdays || [],
    },
  });
});

/** Ad-hoc conflict check for a vehicle/driver over a date range. */
export const checkResource = asyncHandler(async (req, res) => {
  const { vehicle, driver, from, to, exclude } = req.query;
  if (!isValidDateStr(from) || !isValidDateStr(to || from)) throw ApiError.badRequest('from/to must be YYYY-MM-DD');
  if (vehicle && !isObjectId(vehicle)) throw ApiError.badRequest('Invalid vehicle');
  if (driver && !isObjectId(driver)) throw ApiError.badRequest('Invalid driver');
  const conflicts = await findResourceConflicts({
    vehicleId: vehicle || null,
    driverId: driver || null,
    start: toInstant(from),
    end: endOfDayInstant(to || from),
    excludeBookingId: isObjectId(exclude) ? exclude : undefined,
  });
  res.json({ success: true, data: { available: conflicts.length === 0, conflicts } });
});
