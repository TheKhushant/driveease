import { Booking, Payment } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { endOfDayInstant, isValidDateStr, toInstant } from '../utils/dateTime.js';
import { escapeRegex, getPagination, isObjectId, paginated } from '../utils/query.js';
import { recomputePayment } from '../services/bookingService.js';

export const listPayments = asyncHandler(async (req, res) => {
  const pg = getPagination(req.query);
  const filter = {};
  if (req.query.booking && isObjectId(req.query.booking)) filter.booking = req.query.booking;
  if (req.query.method) filter.method = req.query.method;
  if (req.query.type) filter.type = req.query.type;
  if (req.query.from && isValidDateStr(req.query.from)) filter.paidAt = { $gte: toInstant(req.query.from) };
  if (req.query.to && isValidDateStr(req.query.to)) filter.paidAt = { ...filter.paidAt, $lte: endOfDayInstant(req.query.to) };
  if (req.query.search) filter.bookingRef = new RegExp(escapeRegex(String(req.query.search).slice(0, 40)), 'i');
  const [items, total, sums] = await Promise.all([
    Payment.find(filter)
      .sort({ paidAt: -1 })
      .skip(pg.skip)
      .limit(pg.limit)
      .populate('booking', 'bookingRef customerName customerPhone status')
      .populate('recordedBy', 'name'),
    Payment.countDocuments(filter),
    Payment.aggregate([{ $match: filter }, { $group: { _id: '$type', amount: { $sum: '$amount' } } }]),
  ]);
  const totals = Object.fromEntries(sums.map((s) => [s._id, s.amount]));
  res.json({ success: true, data: { ...paginated(items, total, pg), totals } });
});

/** Bookings with outstanding balances (or any payment status filter). */
export const paymentBookings = asyncHandler(async (req, res) => {
  const pg = getPagination(req.query);
  const filter = { status: { $nin: ['rejected', 'cancelled'] } };
  if (req.query.paymentStatus) filter['payment.status'] = { $in: String(req.query.paymentStatus).split(',') };
  if (req.query.search) {
    const rx = new RegExp(escapeRegex(String(req.query.search).slice(0, 60)), 'i');
    filter.$or = [{ bookingRef: rx }, { customerName: rx }, { customerPhone: rx }];
  }
  const [items, total, summary] = await Promise.all([
    Booking.find(filter)
      .sort({ pickupAt: -1 })
      .skip(pg.skip)
      .limit(pg.limit)
      .select('bookingRef customerName customerPhone status pickupDate fare.total finalAmount payment'),
    Booking.countDocuments(filter),
    Booking.aggregate([
      { $match: { status: { $nin: ['rejected', 'cancelled', 'pending'] } } },
      { $group: { _id: null, pending: { $sum: '$payment.pendingAmount' }, collected: { $sum: '$payment.amountPaid' } } },
    ]),
  ]);
  res.json({ success: true, data: { ...paginated(items, total, pg), summary: summary[0] || { pending: 0, collected: 0 } } });
});

export const createPayment = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.body.booking);
  if (!booking) throw ApiError.notFound('Booking not found');
  if (['rejected'].includes(booking.status)) throw ApiError.unprocessable('Cannot record payments for a rejected booking');
  if (req.body.type === 'refund' && req.body.amount > booking.payment.amountPaid) {
    throw ApiError.unprocessable(`Refund cannot exceed the amount paid (₹${booking.payment.amountPaid})`);
  }
  const payment = await Payment.create({ ...req.body, bookingRef: booking.bookingRef, recordedBy: req.admin._id });
  const updated = await recomputePayment(booking._id);
  res.status(201).json({ success: true, message: 'Payment recorded', data: { payment, booking: updated } });
});

export const deletePayment = asyncHandler(async (req, res) => {
  const payment = await Payment.findById(req.params.id);
  if (!payment) throw ApiError.notFound('Payment not found');
  await payment.deleteOne();
  const booking = await recomputePayment(payment.booking);
  res.json({ success: true, message: 'Payment deleted', data: { booking } });
});
