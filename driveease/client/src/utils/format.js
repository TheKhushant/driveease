export const formatINR = (n, { decimals = 0 } = {}) =>
  `₹${(Number(n) || 0).toLocaleString('en-IN', { maximumFractionDigits: decimals, minimumFractionDigits: 0 })}`;

export const formatDate = (d, opts = { day: '2-digit', month: 'short', year: 'numeric' }) => {
  if (!d) return '—';
  const date = typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d) ? new Date(`${d}T12:00:00`) : new Date(d);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('en-IN', opts);
};

export const formatDateTime = (d) =>
  d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

export const formatTime = (t) => {
  if (!t) return '—';
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${ampm}`;
};

export const formatDuration = (mins) => {
  if (!mins) return '—';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h ? `${h}h${m ? ` ${m}m` : ''}` : `${m}m`;
};

/** Today's date (local) as YYYY-MM-DD */
export const today = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
};

export const addDaysStr = (s, n) => {
  const d = new Date(`${s}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

export const titleCase = (s = '') => s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export const STATUS_STYLES = {
  pending: 'bg-amber-50 text-amber-700 ring-amber-200',
  approved: 'bg-sky-50 text-sky-700 ring-sky-200',
  confirmed: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  in_progress: 'bg-violet-50 text-violet-700 ring-violet-200',
  completed: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  rejected: 'bg-rose-50 text-rose-700 ring-rose-200',
  cancelled: 'bg-slate-100 text-slate-600 ring-slate-200',
  unpaid: 'bg-rose-50 text-rose-700 ring-rose-200',
  partially_paid: 'bg-amber-50 text-amber-700 ring-amber-200',
  paid: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
};

export const BOOKING_STATUSES = ['pending', 'approved', 'confirmed', 'in_progress', 'completed', 'rejected', 'cancelled'];

/** Mirrors server STATUS_TRANSITIONS */
export const STATUS_TRANSITIONS = {
  pending: ['approved', 'confirmed', 'rejected', 'cancelled'],
  approved: ['confirmed', 'pending', 'rejected', 'cancelled'],
  confirmed: ['in_progress', 'approved', 'cancelled'],
  in_progress: ['completed', 'cancelled'],
  completed: [],
  rejected: ['pending'],
  cancelled: ['pending'],
};

export const FUEL_TYPES = ['petrol', 'diesel', 'cng', 'electric', 'hybrid'];
export const AC_LABEL = { ac: 'AC', non_ac: 'Non-AC', both: 'AC / Non-AC' };
export const TRIP_LABEL = { one_way: 'One-way', round_trip: 'Round-trip' };
export const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const bookingRouteLabel = (b) =>
  b.bookingType === 'local'
    ? `${b.pickupCityName} · Local${b.localPackageSnapshot?.name ? ` (${b.localPackageSnapshot.name})` : ''}`
    : `${b.pickupCityName} → ${b.dropCityName}`;
