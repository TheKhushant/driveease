import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { CalendarDays, Search, X } from 'lucide-react';
import { useDebounce, useFetch } from '../../hooks/useFetch';
import { Select } from '../../components/ui/Form';
import { EmptyState, ErrorState, Skeleton, StatusBadge } from '../../components/ui/Feedback';
import { PageHeader, Pagination } from '../../components/ui/Misc';
import { Button } from '../../components/ui/Button';
import { BOOKING_STATUSES, bookingRouteLabel, formatDate, formatDateTime, formatINR, formatTime, titleCase, TRIP_LABEL } from '../../utils/format';

export default function BookingsPage() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const [search, setSearch] = useState(params.get('search') || '');
  const debounced = useDebounce(search);
  const status = params.get('status') || '';
  const filters = {
    status: status || undefined,
    bookingType: params.get('bookingType') || undefined,
    paymentStatus: params.get('paymentStatus') || undefined,
    from: params.get('from') || undefined,
    to: params.get('to') || undefined,
    dateField: params.get('dateField') || undefined,
    page: Number(params.get('page')) || 1,
    search: debounced || undefined,
    sort: params.get('sort') || '-createdAt',
  };
  const { data, loading, error, reload } = useFetch('/admin/bookings', filters);

  const setParam = (k, v) => {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v);
    else next.delete(k);
    if (k !== 'page') next.delete('page');
    setParams(next, { replace: true });
  };

  useEffect(() => {
    if ((params.get('search') || '') !== debounced) setParam('search', debounced);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  const hasFilters = ['bookingType', 'paymentStatus', 'from', 'to', 'search', 'status'].some((k) => params.get(k));

  return (
    <div>
      <PageHeader title="Bookings" description="All booking requests from the website. Click a booking to review, assign and update it." />

      <div className="scrollbar-thin -mx-1 mb-4 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {['', ...BOOKING_STATUSES].map((s) => (
          <button
            key={s || 'all'}
            type="button"
            onClick={() => setParam('status', s)}
            className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-semibold transition ${
              status === s ? 'bg-ink text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:ring-slate-300'
            }`}
          >
            {s ? titleCase(s) : 'All'}
          </button>
        ))}
      </div>

      <div className="card overflow-hidden">
        <div className="grid gap-2 border-b border-slate-100 p-3 md:grid-cols-[1fr_auto_auto_auto_auto_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input className="input pl-9" placeholder="Search ref, name, phone, city…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select
            placeholder="All types"
            value={params.get('bookingType') || ''}
            onChange={(e) => setParam('bookingType', e.target.value)}
            options={[
              { value: 'local', label: 'Local' },
              { value: 'outstation', label: 'Outstation' },
            ]}
          />
          <Select
            placeholder="Any payment"
            value={params.get('paymentStatus') || ''}
            onChange={(e) => setParam('paymentStatus', e.target.value)}
            options={['unpaid', 'partially_paid', 'paid'].map((v) => ({ value: v, label: titleCase(v) }))}
          />
          <Select
            value={params.get('dateField') || 'pickup'}
            onChange={(e) => setParam('dateField', e.target.value === 'pickup' ? '' : e.target.value)}
            options={[
              { value: 'pickup', label: 'Pickup date' },
              { value: 'created', label: 'Booked on' },
            ]}
          />
          <input type="date" className="input" value={params.get('from') || ''} onChange={(e) => setParam('from', e.target.value)} aria-label="From date" />
          <input type="date" className="input" value={params.get('to') || ''} onChange={(e) => setParam('to', e.target.value)} aria-label="To date" />
        </div>
        {hasFilters && (
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2 text-xs text-slate-500">
            <span>{data?.pagination?.total ?? 0} result(s)</span>
            <Button
              size="xs"
              variant="ghost"
              icon={X}
              onClick={() => {
                setSearch('');
                setParams({}, { replace: true });
              }}
            >
              Clear filters
            </Button>
          </div>
        )}

        {error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : loading && !data ? (
          <div className="space-y-2 p-4">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-14" />
            ))}
          </div>
        ) : !data.items.length ? (
          <EmptyState icon={CalendarDays} title={hasFilters ? 'No bookings match these filters' : 'No bookings yet'} description={hasFilters ? undefined : 'Bookings submitted on the website appear here.'} />
        ) : (
          <div className={`scrollbar-thin overflow-x-auto ${loading ? 'opacity-60' : ''}`}>
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-slate-50/80 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Booking</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Trip</th>
                  <th className="px-4 py-3">Pickup</th>
                  <th className="px-4 py-3">Car / Driver</th>
                  <th className="px-4 py-3 text-right">Fare</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.items.map((b) => (
                  <tr key={b._id} onClick={() => navigate(`/admin/bookings/${b._id}`)} className="cursor-pointer hover:bg-slate-50/70">
                    <td className="px-4 py-3">
                      <Link to={`/admin/bookings/${b._id}`} className="font-semibold text-ink hover:text-primary" onClick={(e) => e.stopPropagation()}>
                        {b.bookingRef}
                      </Link>
                      <p className="text-xs text-slate-500">{formatDateTime(b.createdAt)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800">{b.customerName}</p>
                      <p className="text-xs text-slate-500">{b.customerPhone}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800">{bookingRouteLabel(b)}</p>
                      <p className="text-xs text-slate-500">
                        {b.bookingType === 'local' ? 'Local' : TRIP_LABEL[b.tripType]} · {b.categoryName || 'Any car'} · {b.passengers} pax
                      </p>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <p className="font-medium text-slate-800">{formatDate(b.pickupDate)}</p>
                      <p className="text-xs text-slate-500">
                        {formatTime(b.pickupTime)}
                        {b.returnDate ? ` → ${formatDate(b.returnDate)}` : ''}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      <p>{b.assignedVehicle?.name || b.selectedVehicle?.name || <span className="text-slate-400">No car</span>}</p>
                      <p>{b.assignedDriver?.fullName || <span className="text-slate-400">No driver</span>}</p>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <p className="font-semibold text-ink">{formatINR(b.finalAmount ?? b.fare?.total)}</p>
                      <StatusBadge status={b.payment?.status} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={b.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination pagination={data?.pagination} onPage={(p) => setParam('page', String(p))} />
      </div>
    </div>
  );
}
