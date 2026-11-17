import mongoose from 'mongoose';
import { Booking, Counter, Customer, Driver, Payment, Vehicle } from '../models/index.js';
import { BLOCKING_STATUSES, STATUS_TRANSITIONS } from '../models/constants.js';
import { ApiError } from '../utils/ApiError.js';
import { todayStr } from '../utils/dateTime.js';
import { buildQuote } from './quoteService.js';
import { findResourceConflicts } from './availabilityService.js';
import { buildBookingMessage, buildWhatsAppUrl, normalizeWhatsAppNumber } from './whatsappService.js';

export async function generateBookingRef(prefix = 'DE') {
  const day = todayStr().replace(/-/g, '').slice(2); // YYMMDD
  const seq = await Counter.next(`booking-${day}`);
  return `${prefix}${day}${String(seq).padStart(4, '0')}`;
}

/** Customer-safe booking projection. */
export function publicBooking(b) {
  return {
    bookingRef: b.bookingRef,
    status: b.status,
    bookingType: b.bookingType,
    tripType: b.tripType,
    pickupCityName: b.pickupCityName,
    dropCityName: b.dropCityName,
    pickupDate: b.pickupDate,
    pickupTime: b.pickupTime,
    returnDate: b.returnDate,
    passengers: b.passengers,
    categoryName: b.categoryName,
    selectedVehicleName: b.selectedVehicleName,
    acPreference: b.acPreference,
    localPackage: b.localPackageSnapshot?.name ? b.localPackageSnapshot : undefined,
    customerName: b.customerName,
    fare: {
      total: b.fare.total,
      distanceKm: b.fare.distanceKm,
      billableKm: b.fare.billableKm,
      items: b.fare.items,
      notes: b.fare.notes,
    },
    finalAmount: b.finalAmount,
    paymentStatus: b.payment?.status,
    createdAt: b.createdAt,
  };
}

/**
 * Public booking submission. The fare is recalculated here; any fare sent by the
 * client is ignored. The booking is persisted BEFORE the WhatsApp link is returned.
 */
export async function createBooking(input) {
  const quote = await buildQuote(input);
  const { fare, settings, pickupCity, dropCity, route, category, vehicle, localPackage, window } = quote;

  if (vehicle) {
    const conflicts = await findResourceConflicts({
      vehicleId: vehicle._id,
      start: window.pickupAt,
      end: window.tripEndAt,
      includePending: Boolean(settings.booking?.pendingBlocksVehicle),
    });
    if (conflicts.length) {
      throw ApiError.conflict(`${vehicle.name} is not available for the selected dates. Please choose another car or date.`);
    }
  }

  if (await Customer.exists({ phone: input.customerPhone, isBlocked: true })) {
    throw ApiError.forbidden('We are unable to accept online bookings from this number. Please contact us.');
  }
  const customer = await Customer.findOneAndUpdate(
    { phone: input.customerPhone },
    {
      $set: {
        name: input.customerName,
        ...(input.customerEmail ? { email: input.customerEmail } : {}),
        city: pickupCity.name,
        lastBookingAt: new Date(),
      },
      $inc: { totalBookings: 1 },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true },
  );
  const bookingRef = await generateBookingRef(settings.booking?.bookingRefPrefix || 'DE');
  const booking = await Booking.create({
    bookingRef,
    bookingType: input.bookingType,
    tripType: input.bookingType === 'outstation' ? input.tripType : null,
    pickupCity: pickupCity._id,
    pickupCityName: pickupCity.name,
    dropCity: dropCity?._id,
    dropCityName: dropCity?.name,
    route: route?._id,
    pickupAddress: input.pickupAddress,
    dropAddress: input.dropAddress,
    pickupDate: input.pickupDate,
    pickupTime: input.pickupTime,
    returnDate: input.returnDate,
    pickupAt: window.pickupAt,
    tripEndAt: window.tripEndAt,
    passengers: input.passengers,
    category: category?._id,
    categoryName: category?.name,
    selectedVehicle: vehicle?._id,
    selectedVehicleName: vehicle ? `${vehicle.name}` : undefined,
    acPreference: quote.acPreference,
    localPackage: localPackage?._id,
    localPackageSnapshot: localPackage ? { name: localPackage.name, hours: localPackage.hours, km: localPackage.km } : undefined,
    customer: customer._id,
    customerName: input.customerName,
    customerPhone: input.customerPhone,
    customerEmail: input.customerEmail,
    instructions: input.instructions,
    fare,
    status: 'pending',
    statusHistory: [{ status: 'pending', note: 'Booking request submitted by customer', changedByName: 'Customer' }],
    payment: { status: 'unpaid', amountPaid: 0, pendingAmount: fare.total },
    whatsapp: {
      adminNumber: normalizeWhatsAppNumber(settings.contact?.whatsappNumber),
      generatedAt: new Date(),
    },
  });

  const message = buildBookingMessage(booking, { companyName: settings.branding?.companyName });
  const whatsappUrl = buildWhatsAppUrl(settings.contact?.whatsappNumber, message);
  return { booking, whatsappUrl, whatsappMessage: message };
}

const effectiveVehicle = (b) => b.assignedVehicle || b.selectedVehicle;

async function assertNoConflicts(booking, { vehicleId, driverId }) {
  const conflicts = await findResourceConflicts({
    vehicleId,
    driverId,
    start: booking.pickupAt,
    end: booking.tripEndAt,
    excludeBookingId: booking._id,
  });
  if (conflicts.length) throw ApiError.conflict('Scheduling conflict', conflicts);
}

async function syncResourceStatus(booking, status) {
  const vehicleId = effectiveVehicle(booking);
  if (status === 'in_progress') {
    if (vehicleId) await Vehicle.updateOne({ _id: vehicleId }, { availabilityStatus: 'on_trip' });
    if (booking.assignedDriver) await Driver.updateOne({ _id: booking.assignedDriver }, { availability: 'on_trip' });
  } else if (['completed', 'cancelled'].includes(status)) {
    if (vehicleId) await Vehicle.updateOne({ _id: vehicleId, availabilityStatus: 'on_trip' }, { availabilityStatus: 'available' });
    if (booking.assignedDriver) await Driver.updateOne({ _id: booking.assignedDriver, availability: 'on_trip' }, { availability: 'available' });
  }
}

export async function changeStatus(bookingId, { status, note, reason }, admin) {
  const booking = await Booking.findById(bookingId);
  if (!booking) throw ApiError.notFound('Booking not found');
  if (booking.status === status) throw ApiError.badRequest(`Booking is already ${status.replace('_', ' ')}`);
  const allowed = STATUS_TRANSITIONS[booking.status] || [];
  if (!allowed.includes(status)) {
    throw ApiError.unprocessable(`Cannot change status from "${booking.status}" to "${status}"`);
  }

  if (BLOCKING_STATUSES.includes(status)) {
    await assertNoConflicts(booking, { vehicleId: effectiveVehicle(booking), driverId: booking.assignedDriver });
  }
  if (status === 'rejected') booking.rejectionReason = reason || note;
  if (status === 'cancelled') booking.cancellationReason = reason || note;

  booking.status = status;
  booking.statusHistory.push({ status, note: note || reason, changedBy: admin?._id, changedByName: admin?.name });
  await booking.save();
  await syncResourceStatus(booking, status);
  return booking;
}

export async function assignResources(bookingId, { vehicle, driver }, admin) {
  const booking = await Booking.findById(bookingId);
  if (!booking) throw ApiError.notFound('Booking not found');
  if (['completed', 'cancelled', 'rejected'].includes(booking.status)) {
    throw ApiError.unprocessable(`Cannot assign resources to a ${booking.status} booking`);
  }

  const nextVehicle = vehicle === undefined ? booking.assignedVehicle : vehicle || null;
  const nextDriver = driver === undefined ? booking.assignedDriver : driver || null;

  if (nextVehicle) {
    const v = await Vehicle.findById(nextVehicle).lean();
    if (!v) throw ApiError.notFound('Vehicle not found');
    if (v.seatingCapacity < booking.passengers) {
      throw ApiError.unprocessable(`${v.name} seats ${v.seatingCapacity}, but the booking has ${booking.passengers} passengers`);
    }
  }
  const vehicleChanged = String(nextVehicle || '') !== String(booking.assignedVehicle || '');
  const driverChanged = String(nextDriver || '') !== String(booking.assignedDriver || '');
  await assertNoConflicts(booking, {
    vehicleId: vehicleChanged ? nextVehicle : null,
    driverId: driverChanged ? nextDriver : null,
  });

  booking.assignedVehicle = nextVehicle;
  booking.assignedDriver = nextDriver;
  const parts = [];
  if (vehicleChanged) parts.push(nextVehicle ? 'vehicle assigned' : 'vehicle unassigned');
  if (driverChanged) parts.push(nextDriver ? 'driver assigned' : 'driver unassigned');
  if (parts.length) {
    booking.statusHistory.push({
      status: booking.status,
      note: `Assignment updated: ${parts.join(', ')}`,
      changedBy: admin?._id,
      changedByName: admin?.name,
    });
  }
  await booking.save();
  return booking;
}

/** Recalculate the payment summary on a booking from its payment records. */
export async function recomputePayment(bookingId) {
  const booking = await Booking.findById(bookingId);
  if (!booking) return null;
  const [agg] = await Payment.aggregate([
    { $match: { booking: new mongoose.Types.ObjectId(String(bookingId)) } },
    {
      $group: {
        _id: null,
        paid: { $sum: { $cond: [{ $eq: ['$type', 'refund'] }, { $multiply: ['$amount', -1] }, '$amount'] } },
        last: { $max: '$paidAt' },
      },
    },
  ]);
  const last = await Payment.findOne({ booking: bookingId, type: 'payment' }).sort({ paidAt: -1 }).lean();
  const paid = Math.max(0, agg?.paid || 0);
  const payable = booking.finalAmount ?? booking.fare.total;
  booking.payment.amountPaid = paid;
  booking.payment.pendingAmount = Math.max(0, payable - paid);
  booking.payment.status = paid <= 0 ? 'unpaid' : paid < payable ? 'partially_paid' : 'paid';
  booking.payment.lastPaymentAt = agg?.last || undefined;
  booking.payment.method = last?.method;
  await booking.save();
  return booking;
}
