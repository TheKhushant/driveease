import { Link } from 'react-router-dom';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
  Ban,
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  Car,
  CheckCircle2,
  Clock,
  IndianRupee,
  MapPin,
  UserCheck,
  Users,
  Wallet,
} from 'lucide-react';
import { useFetch } from '../../hooks/useFetch';
import { EmptyState, ErrorState, PageLoader, StatusBadge } from '../../components/ui/Feedback';
import { PageHeader, SmartImage, StatCard } from '../../components/ui/Misc';
import { bookingRouteLabel, formatDate, formatINR, formatTime } from '../../utils/format';

const monthLabel = (m) => new Date(`${m}-15`).toLocaleDateString('en-IN', { month: 'short' });

function Panel({ title, action, children, className = '' }) {
  return (
    <div className={`card p-5 ${className}`}>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-semibold">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

export default function DashboardPage() {
  const { data, loading, error, reload } = useFetch('/admin/dashboard');
  if (loading && !data) return <PageLoader />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  const s = data.stats;
  const primary = getComputedStyle(document.documentElement).getPropertyValue('--c-primary').trim().replace(/ /g, ',');
  const color = `rgb(${primary || '15,118,110'})`;

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" description="Live overview of bookings, revenue and fleet." />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Total bookings" value={s.totalBookings} icon={CalendarDays} />
        <StatCard label="Pending" value={s.pendingBookings} icon={Clock} tone="amber" hint={`${s.approvedBookings} approved`} />
        <StatCard label="Confirmed" value={s.confirmedBookings} icon={CalendarCheck} tone="sky" hint={`${s.inProgressBookings} in progress`} />
        <StatCard label="Completed" value={s.completedBookings} icon={CheckCircle2} tone="emerald" />
        <StatCard label="Cancelled" value={s.cancelledBookings} icon={Ban} tone="rose" hint={`${s.rejectedBookings} rejected`} />
        <StatCard label="Total revenue" value={formatINR(s.totalRevenue)} icon={IndianRupee} tone="emerald" hint="Payments collected" />
        <StatCard label="This month" value={formatINR(s.monthlyRevenue)} icon={Wallet} tone="violet" />
        <StatCard label="Pending payments" value={formatINR(s.pendingPayments)} icon={Wallet} tone="amber" hint={`${s.pendingPaymentBookings} booking(s)`} />
        <StatCard label="Total cars" value={s.totalCars} icon={Car} tone="slate" />
        <StatCard label="Available vehicles" value={s.availableVehicles} icon={Car} tone="emerald" />
        <StatCard label="Total drivers" value={s.totalDrivers} icon={Users} tone="slate" />
        <StatCard label="Available drivers" value={s.availableDrivers} icon={UserCheck} tone="emerald" />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Revenue (last 12 months)">
          <div className="h-64">
            <ResponsiveContainer>
              <AreaChart data={data.revenueChart} margin={{ left: 0, right: 8, top: 8 }}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="month" tickFormatter={monthLabel} tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : v)} tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} width={40} />
                <Tooltip formatter={(v) => formatINR(v)} labelFormatter={monthLabel} />
                <Area type="monotone" dataKey="revenue" stroke={color} strokeWidth={2} fill="url(#rev)" name="Revenue" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel title="Bookings (last 12 months)">
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={data.bookingChart} margin={{ left: 0, right: 8, top: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="month" tickFormatter={monthLabel} tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} width={30} />
                <Tooltip labelFormatter={monthLabel} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="bookings" name="All" fill={color} radius={[4, 4, 0, 0]} />
                <Bar dataKey="completed" name="Completed" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="cancelled" name="Cancelled/rejected" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Popular destinations">
          {!data.popularDestinations.length ? (
            <EmptyState icon={MapPin} title="No bookings yet" />
          ) : (
            <ul className="space-y-3">
              {data.popularDestinations.map((d) => {
                const max = data.popularDestinations[0].count;
                return (
                  <li key={d.name}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="font-medium text-slate-700">{d.name}</span>
                      <span className="text-slate-500">{d.count}</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100">
                      <div className="h-2 rounded-full bg-primary" style={{ width: `${(d.count / max) * 100}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
        <Panel title="Most-booked vehicles">
          {!data.topVehicles.length ? (
            <EmptyState icon={Car} title="No vehicle bookings yet" />
          ) : (
            <ul className="divide-y divide-slate-100">
              {data.topVehicles.map((v) => (
                <li key={v._id} className="flex items-center gap-3 py-2.5">
                  <SmartImage src={v.image} className="h-10 w-14 rounded-lg" iconClass="h-5 w-5" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink">{v.name}</p>
                    <p className="text-xs text-slate-500">{v.registrationNumber || '—'}</p>
                  </div>
                  <span className="text-sm font-semibold">{v.count} trips</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Recent bookings" action={<Link to="/admin/bookings" className="text-sm font-semibold text-primary">View all</Link>}>
          {!data.recentBookings.length ? (
            <EmptyState title="No bookings yet" description="New booking requests from the website will appear here." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {data.recentBookings.map((b) => (
                <li key={b._id}>
                  <Link to={`/admin/bookings/${b._id}`} className="flex items-center justify-between gap-3 py-2.5 hover:opacity-80">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink">
                        {b.customerName} <span className="font-normal text-slate-400">· {b.bookingRef}</span>
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        {bookingRouteLabel(b)} · {formatDate(b.pickupDate)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="hidden text-sm font-semibold sm:inline">{formatINR(b.fare?.total)}</span>
                      <StatusBadge status={b.status} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="Upcoming trips" action={<Link to="/admin/availability" className="text-sm font-semibold text-primary">Calendar</Link>}>
          {!data.upcomingTrips.length ? (
            <EmptyState icon={CalendarClock} title="No upcoming trips" />
          ) : (
            <ul className="divide-y divide-slate-100">
              {data.upcomingTrips.map((b) => (
                <li key={b._id}>
                  <Link to={`/admin/bookings/${b._id}`} className="flex items-center gap-3 py-2.5 hover:opacity-80">
                    <div className="grid w-12 shrink-0 place-items-center rounded-xl bg-primary-light py-1.5 text-primary">
                      <span className="text-[10px] font-bold uppercase">{formatDate(b.pickupDate, { month: 'short' })}</span>
                      <span className="font-display text-lg font-semibold leading-none">{formatDate(b.pickupDate, { day: '2-digit' })}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink">{bookingRouteLabel(b)}</p>
                      <p className="truncate text-xs text-slate-500">
                        {formatTime(b.pickupTime)} · {b.customerName} · {b.assignedDriver?.fullName || 'No driver'} · {b.assignedVehicle?.name || 'No vehicle'}
                      </p>
                    </div>
                    <StatusBadge status={b.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
