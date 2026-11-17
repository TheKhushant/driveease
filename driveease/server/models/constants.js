export const BOOKING_TYPES = ['local', 'outstation'];
export const TRIP_TYPES = ['one_way', 'round_trip'];
export const AC_TYPES = ['ac', 'non_ac'];
export const FUEL_TYPES = ['petrol', 'diesel', 'cng', 'electric', 'hybrid'];

export const BOOKING_STATUSES = [
  'pending',
  'approved',
  'rejected',
  'confirmed',
  'in_progress',
  'completed',
  'cancelled',
];

/** Allowed admin status transitions. */
export const STATUS_TRANSITIONS = {
  pending: ['approved', 'rejected', 'confirmed', 'cancelled'],
  approved: ['confirmed', 'rejected', 'cancelled', 'pending'],
  confirmed: ['in_progress', 'cancelled', 'approved'],
  in_progress: ['completed', 'cancelled'],
  completed: [],
  rejected: ['pending'],
  cancelled: ['pending'],
};

/** Statuses that hold a vehicle/driver for the trip window. */
export const BLOCKING_STATUSES = ['approved', 'confirmed', 'in_progress'];

export const PAYMENT_STATUSES = ['unpaid', 'partially_paid', 'paid'];

export const ADMIN_ROLES = ['superadmin', 'admin', 'manager'];

export const PRICING_RULE_TYPES = [
  'weekday',
  'saturday',
  'sunday',
  'weekend',
  'festival',
  'holiday',
  'rainy_season',
  'special_event',
  'custom',
];

export const AVAILABILITY_TYPES = [
  'date_block', // whole date(s) unavailable
  'date_open', // force-open date(s) (overrides closed weekdays / holidays)
  'time_block', // time slot blocked on date(s)
  'holiday', // holiday, no bookings
  'vehicle_block', // a vehicle unavailable for date(s)
  'driver_block', // a driver unavailable for date(s)
  'restriction', // special restriction (e.g. no outstation on a date)
];
