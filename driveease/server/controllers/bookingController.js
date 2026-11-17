import { Booking, Driver, Payment, Vehicle } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { buildSort, escapeRegex, getPagination, isObjectId, paginated } from '../utils/query.js';
import { toInstant, endOfDayInstant, isValidDateStr } from '../utils/dateTime.js';
import { assignResources, changeStatus, recomputePayment } from '../services/bookingService.js';
import { findResourceConflicts } from '../services/availabilityService.js';
import { getSettings } from '../services/settingsService.js';
import { buildBookingMessage, buildWhatsAppUrl } from '../services/whatsappService.js';

const POPULATE = [
  { path: 'assignedVehicle', select: 'name registrationNumber seatingCapacity' },
  { path: 'assignedDriver', select: 'fullName phone' },
  { path: 'selectedVehicle', select: 'name registrationNumber' },
];

export function buildBookingFilter(q) {
  const filter = {};
  if (q.status) filter.status = { $in: String(q.status).split(',') };
  if (q.bookingType) filter.bookingType = q.bookingType;
  if (q.tripType) filter.tripType = q.tripType;
  if (q.paymentStatus) filter['payment.status'] = { $in: String(q.paymentStatus).split(',') };
  if (q.customer && isObjectId(q.customer)) filter.customer = q.customer;
  if (q.driver && isObjectId(q.driver)) filter.assignedDriver = q.driver;
  if (q.vehicle && isObjectId(q.vehicle)) {
    filter.$or = [{ assignedVehicle: q.vehicle }, { assignedVehicle: null, selectedVehicle: q.vehicle }];
  }
  // Date range on pickup date (dateField=pickup) or creation date (dateField=created)
  const field = q.dateField === 'created' ? 'createdAt' : 'pickupAt';
  if (q.from && isValidDateStr(q.from)) filter[field] = { ...filter[field], $gte: toInstant(q.from) };
  if (q.to && isValidDateStr(q.to)) filter[field] = { ...filter[field], $lte: endOfDayInstant(q.to) };
  if (q.search) {
    const rx = new RegExp(escapeRegex(String(q.search).trim().slice(0, 60)), 'i');
    const or = [{ bookingRef: rx }, { customerName: rx }, { customerPhone: rx }, { pickupCityName: rx }, { dropCityName: rx }];
    filter.$and = [...(filter.$and || []), { $or: or }];
  }
  return filter;
}

export const listBookings = asyncHandler(async (req, res) => {
  const pg = getPagination(req.query);
  const filter = buildBookingFilter(req.query);
  const sort = buildSort(req.query.sort, ['createdAt', 'pickupAt', 'fare.total', 'status'], { createdAt: -1 });
  const [items, total] = await Promise.all([
    Booking.find(filter).sort(sort).skip(pg.skip).limit(pg.limit).populate(POPULATE).select('-fare.appliedRates -statusHistory'),
    Booking.countDocuments(filter),
  ]);
  res.json({ success: true, data: paginated(items, total, pg) });
});

export const getBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id)
    .populate(POPULATE)
    .populate('customer', 'name phone email totalBookings')
    .populate('route', 'distanceKm durationMinutes');
  if (!booking) throw ApiError.notFound('Booking not found');
  const payments = await Payment.find({ booking: booking._id }).sort({ paidAt: -1 }).populate('recordedBy', 'name');
  const settings = await getSettings();
  const whatsappUrl = buildWhatsAppUrl(
    settings.contact?.whatsappNumber,
    buildBookingMessage(booking, { companyName: settings.branding?.companyName }),
  );
  const customerWhatsappUrl = buildWhatsAppUrl(
    booking.customerPhone,
    `Hello ${booking.customerName}, regarding your ${settings.branding?.companyName || ''} booking ${booking.bookingRef}: `,
  );
  res.json({ success: true, data: { booking, payments, whatsappUrl, customerWhatsappUrl } });
});

export const updateBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id);
  if (!booking) throw ApiError.notFound('Booking not found');
  const before = booking.finalAmount;
  ['adminNotes', 'finalAmount', 'pickupAddress', 'dropAddress', 'customerEmail'].forEach((k) => {
    if (req.body[k] !== undefined) booking[k] = req.body[k];
  });
  if (req.body.finalAmount !== undefined && req.body.finalAmount !== before) {
    booking.statusHistory.push({
      status: booking.status,
      note: `Final amount set to ₹${req.body.finalAmount}`,
      changedBy: req.admin._id,
      changedByName: req.admin.name,
    });
  }
  await booking.save();
  const updated = await recomputePayment(booking._id);
  res.json({ success: true, message: 'Booking updated', data: updated });
});

export const updateStatus = asyncHandler(async (req, res) => {
  const booking = await changeStatus(req.params.id, req.body, req.admin);
  res.json({ success: true, message: `Booking ${booking.status.replace('_', ' ')}`, data: booking });
});

export const assign = asyncHandler(async (req, res) => {
  const booking = await assignResources(req.params.id, req.body, req.admin);
  const populated = await Booking.findById(booking._id).populate(POPULATE);
  res.json({ success: true, message: 'Assignment updated', data: populated });
});

/** Vehicles and drivers with their conflicts for this booking's trip window. */
export const availableResources = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id).lean();
  if (!booking) throw ApiError.notFound('Booking not found');
  const [vehicles, drivers] = await Promise.all([
    Vehicle.find({ isActive: true }).populate('category', 'name').select('name registrationNumber seatingCapacity category acType fuelType').sort({ name: 1 }).lean(),
    Driver.find({ isActive: true }).select('fullName phone availability assignedVehicle').sort({ fullName: 1 }).lean(),
  ]);
  const opts = { start: booking.pickupAt, end: booking.tripEndAt, excludeBookingId: booking._id };
  const vOut = await Promise.all(
    vehicles.map(async (v) => {
      const conflicts = await findResourceConflicts({ ...opts, vehicleId: v._id });
      if (v.seatingCapacity < booking.passengers) conflicts.push(`Seats only ${v.seatingCapacity}`);
      return { ...v, available: conflicts.length === 0, conflicts };
    }),
  );
  const dOut = await Promise.all(
    drivers.map(async (d) => {
      const conflicts = await findResourceConflicts({ ...opts, driverId: d._id });
      return { ...d, available: conflicts.length === 0, conflicts };
    }),
  );
  res.json({ success: true, data: { vehicles: vOut, drivers: dOut } });
});

export const deleteBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id);
  if (!booking) throw ApiError.notFound('Booking not found');
  if (!['cancelled', 'rejected'].includes(booking.status)) {
    throw ApiError.unprocessable('Only cancelled or rejected bookings can be deleted. Cancel it first.');
  }
  await Payment.deleteMany({ booking: booking._id });
  await booking.deleteOne();
  res.json({ success: true, message: 'Booking deleted' });
});
