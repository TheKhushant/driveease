import { Booking, Driver, Payment, Vehicle } from '../models/index.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { env } from '../config/env.js';
import { todayStr, toInstant } from '../utils/dateTime.js';

const tzString = () => {
  const m = env.tzOffsetMinutes;
  const sign = m >= 0 ? '+' : '-';
  const a = Math.abs(m);
  return `${sign}${String(Math.floor(a / 60)).padStart(2, '0')}:${String(a % 60).padStart(2, '0')}`;
};

function lastMonths(n) {
  const today = todayStr();
  let y = Number(today.slice(0, 4));
  let m = Number(today.slice(5, 7));
  const out = [];
  for (let i = 0; i < n; i += 1) {
    out.unshift(`${y}-${String(m).padStart(2, '0')}`);
    m -= 1;
    if (m === 0) {
      m = 12;
      y -= 1;
    }
  }
  return out;
}

export const getDashboard = asyncHandler(async (_req, res) => {
  const tz = tzString();
  const now = new Date();
  const months = lastMonths(12);
  const thisMonth = months[months.length - 1];
  const rangeStart = toInstant(`${months[0]}-01`);
  const monthStart = toInstant(`${thisMonth}-01`);

  const [
    statusCounts,
    revenueAll,
    revenueMonth,
    pendingPayments,
    totalCars,
    busyVehicleIds,
    availableVehicleDocs,
    totalDrivers,
    availableDrivers,
    revenueSeries,
    bookingSeries,
    popularDestinations,
    topVehicles,
    recentBookings,
    upcomingTrips,
  ] = await Promise.all([
    Booking.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Payment.aggregate([
      { $group: { _id: null, total: { $sum: { $cond: [{ $eq: ['$type', 'refund'] }, { $multiply: ['$amount', -1] }, '$amount'] } } } },
    ]),
    Payment.aggregate([
      { $match: { paidAt: { $gte: monthStart } } },
      { $group: { _id: null, total: { $sum: { $cond: [{ $eq: ['$type', 'refund'] }, { $multiply: ['$amount', -1] }, '$amount'] } } } },
    ]),
    Booking.aggregate([
      { $match: { status: { $in: ['approved', 'confirmed', 'in_progress', 'completed'] } } },
      { $group: { _id: null, total: { $sum: '$payment.pendingAmount' }, count: { $sum: { $cond: [{ $gt: ['$payment.pendingAmount', 0] }, 1, 0] } } } },
    ]),
    Vehicle.countDocuments({ isActive: true }),
    Booking.distinct('assignedVehicle', { status: 'in_progress', assignedVehicle: { $ne: null } }),
    Vehicle.find({ isActive: true, availabilityStatus: 'available', maintenanceStatus: { $ne: 'under_maintenance' } }).select('_id').lean(),
    Driver.countDocuments({ isActive: true }),
    Driver.countDocuments({ isActive: true, availability: 'available' }),
    Payment.aggregate([
      { $match: { paidAt: { $gte: rangeStart } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$paidAt', timezone: tz } },
          total: { $sum: { $cond: [{ $eq: ['$type', 'refund'] }, { $multiply: ['$amount', -1] }, '$amount'] } },
        },
      },
    ]),
    Booking.aggregate([
      { $match: { createdAt: { $gte: rangeStart } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$createdAt', timezone: tz } },
          total: { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          cancelled: { $sum: { $cond: [{ $in: ['$status', ['cancelled', 'rejected']] }, 1, 0] } },
        },
      },
    ]),
    Booking.aggregate([
      { $match: { status: { $nin: ['rejected', 'cancelled'] } } },
      { $project: { destination: { $ifNull: ['$dropCityName', '$pickupCityName'] } } },
      { $group: { _id: '$destination', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 6 },
    ]),
    Booking.aggregate([
      { $match: { status: { $nin: ['rejected', 'cancelled'] } } },
      { $project: { vehicle: { $ifNull: ['$assignedVehicle', '$selectedVehicle'] } } },
      { $match: { vehicle: { $ne: null } } },
      { $group: { _id: '$vehicle', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 6 },
      { $lookup: { from: 'vehicles', localField: '_id', foreignField: '_id', as: 'v' } },
      { $unwind: '$v' },
      { $project: { count: 1, name: '$v.name', registrationNumber: '$v.registrationNumber', image: { $first: '$v.images' } } },
    ]),
    Booking.find()
      .sort({ createdAt: -1 })
      .limit(8)
      .select('bookingRef customerName customerPhone bookingType tripType pickupCityName dropCityName pickupDate pickupTime status fare.total createdAt'),
    Booking.find({ pickupAt: { $gte: now }, status: { $in: ['pending', 'approved', 'confirmed'] } })
      .sort({ pickupAt: 1 })
      .limit(8)
      .populate('assignedDriver', 'fullName')
      .populate('assignedVehicle', 'name registrationNumber')
      .select('bookingRef customerName pickupCityName dropCityName pickupDate pickupTime status assignedDriver assignedVehicle bookingType'),
  ]);

  const counts = Object.fromEntries(statusCounts.map((s) => [s._id, s.count]));
  const busy = new Set(busyVehicleIds.map(String));
  const revMap = Object.fromEntries(revenueSeries.map((r) => [r._id, r.total]));
  const bookMap = Object.fromEntries(bookingSeries.map((r) => [r._id, r]));

  res.json({
    success: true,
    data: {
      stats: {
        totalBookings: Object.values(counts).reduce((a, b) => a + b, 0),
        pendingBookings: counts.pending || 0,
        approvedBookings: counts.approved || 0,
        confirmedBookings: counts.confirmed || 0,
        inProgressBookings: counts.in_progress || 0,
        completedBookings: counts.completed || 0,
        cancelledBookings: counts.cancelled || 0,
        rejectedBookings: counts.rejected || 0,
        totalRevenue: revenueAll[0]?.total || 0,
        monthlyRevenue: revenueMonth[0]?.total || 0,
        pendingPayments: pendingPayments[0]?.total || 0,
        pendingPaymentBookings: pendingPayments[0]?.count || 0,
        totalCars,
        availableVehicles: availableVehicleDocs.filter((v) => !busy.has(String(v._id))).length,
        totalDrivers,
        availableDrivers,
      },
      revenueChart: months.map((m) => ({ month: m, revenue: revMap[m] || 0 })),
      bookingChart: months.map((m) => ({
        month: m,
        bookings: bookMap[m]?.total || 0,
        completed: bookMap[m]?.completed || 0,
        cancelled: bookMap[m]?.cancelled || 0,
      })),
      popularDestinations: popularDestinations.map((d) => ({ name: d._id, count: d.count })),
      topVehicles,
      recentBookings,
      upcomingTrips,
    },
  });
});
