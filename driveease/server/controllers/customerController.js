import { z } from 'zod';
import { Booking, Customer } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { buildSort, escapeRegex, getPagination, paginated, toBool } from '../utils/query.js';
import { opt } from '../validators/common.js';

export const customerUpdateSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: opt(z.string().trim().toLowerCase().email()),
  notes: opt(z.string().max(2000)),
  isBlocked: z.boolean().optional(),
});

export const listCustomers = asyncHandler(async (req, res) => {
  const pg = getPagination(req.query);
  const filter = {};
  if (req.query.search) {
    const rx = new RegExp(escapeRegex(String(req.query.search).slice(0, 60)), 'i');
    filter.$or = [{ name: rx }, { phone: rx }, { email: rx }];
  }
  const blocked = toBool(req.query.isBlocked);
  if (blocked !== undefined) filter.isBlocked = blocked;
  const sort = buildSort(req.query.sort, ['name', 'totalBookings', 'lastBookingAt', 'createdAt'], { lastBookingAt: -1 });
  const [items, total] = await Promise.all([
    Customer.find(filter).sort(sort).skip(pg.skip).limit(pg.limit).lean(),
    Customer.countDocuments(filter),
  ]);
  // Attach lifetime value (completed bookings)
  const ids = items.map((c) => c._id);
  const stats = await Booking.aggregate([
    { $match: { customer: { $in: ids } } },
    {
      $group: {
        _id: '$customer',
        completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
        paid: { $sum: '$payment.amountPaid' },
      },
    },
  ]);
  const map = Object.fromEntries(stats.map((s) => [String(s._id), s]));
  res.json({
    success: true,
    data: paginated(
      items.map((c) => ({ ...c, completedBookings: map[c._id]?.completed || 0, totalPaid: map[c._id]?.paid || 0 })),
      total,
      pg,
    ),
  });
});

export const getCustomer = asyncHandler(async (req, res) => {
  const customer = await Customer.findById(req.params.id);
  if (!customer) throw ApiError.notFound('Customer not found');
  const bookings = await Booking.find({ customer: customer._id })
    .sort({ createdAt: -1 })
    .limit(100)
    .select('bookingRef status bookingType tripType pickupCityName dropCityName pickupDate pickupTime fare.total finalAmount payment createdAt');
  res.json({ success: true, data: { customer, bookings } });
});

export const updateCustomer = asyncHandler(async (req, res) => {
  const customer = await Customer.findById(req.params.id);
  if (!customer) throw ApiError.notFound('Customer not found');
  customer.set(req.body);
  await customer.save();
  res.json({ success: true, message: 'Customer updated', data: customer });
});

export const deleteCustomer = asyncHandler(async (req, res) => {
  const customer = await Customer.findById(req.params.id);
  if (!customer) throw ApiError.notFound('Customer not found');
  const count = await Booking.countDocuments({ customer: customer._id });
  if (count) throw ApiError.conflict(`Cannot delete: customer has ${count} booking(s). Block the customer instead.`);
  await customer.deleteOne();
  res.json({ success: true, message: 'Customer deleted' });
});
