import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarRange, ChevronLeft, ChevronRight, Settings } from 'lucide-react';
import { useFetch } from '../../hooks/useFetch';
import { ResourceManager } from '../../components/admin/ResourceManager';
import { ActiveBadge, Badge, ErrorState, Spinner, StatusBadge } from '../../components/ui/Feedback';
import { Button } from '../../components/ui/Button';
import { PageHeader } from '../../components/ui/Misc';
import { addDaysStr, DAY_NAMES, formatDate, formatTime, titleCase, today } from '../../utils/format';
import { bookingTypeScope } from './options';

const TYPE_STYLE = {
  holiday: 'bg-rose-100 text-rose-700 ring-rose-200',
  date_block: 'bg-rose-100 text-rose-700 ring-rose-200',
  date_open: 'bg-emerald-100 text-emerald-700 ring-emerald-200',
  time_block: 'bg-amber-100 text-amber-800 ring-amber-200',
  vehicle_block: 'bg-slate-200 text-slate-700 ring-slate-300',
  driver_block: 'bg-sky-100 text-sky-700 ring-sky-200',
  restriction: 'bg-violet-100 text-violet-700 ring-violet-200',
};
const TYPE_LABEL = {
  holiday: 'Holiday (closed)',
  date_block: 'Date unavailable',
  date_open: 'Date available (override)',
  time_block: 'Blocked time slot',
  vehicle_block: 'Vehicle blocked',
  driver_block: 'Driver blocked',
  restriction: 'Booking restriction',
};

const entryLabel = (e) =>
  e.title ||
  (e.type === 'vehicle_block' ? e.vehicle?.name : e.type === 'driver_block' ? e.driver?.fullName : e.type === 'time_block' ? `${e.startTime}–${e.endTime}` : TYPE_LABEL[e.type]);

function MonthCalendar({ month, setMonth, onPickDay, selected }) {
  const { data, loading, error, reload } = useFetch('/admin/availability/calendar', { month });
  const days = useMemo(() => {
    if (!data) return [];
    const startDow = new Date(`${data.first}T12:00:00Z`).getUTCDay();
    const out = [];
    for (let i = 0; i < startDow; i += 1) out.push(null);
    for (let d = data.first; d <= data.last; d = addDaysStr(d, 1)) out.push(d);
    return out;
  }, [data]);

  const shift = (n) => {
    const [y, m] = month.split('-').map(Number);
    const d = new Date(Date.UTC(y, m - 1 + n, 15));
    setMonth(d.toISOString().slice(0, 7));
  };

  const dayInfo = (d) => {
    const entries = data.entries.filter((e) => e.isActive && e.startDate <= d && e.endDate >= d);
    const bookings = data.bookings.filter((b) => b.pickupDate <= d && (b.returnDate || b.pickupDate) >= d);
    const closedWeekday = data.closedWeekdays.includes(new Date(`${d}T12:00:00Z`).getUTCDay());
    return { entries, bookings, closedWeekday };
  };

  return (
    <div className="card p-4">
      <div className="mb-4 flex items-center justify-between">
        <Button size="icon" variant="ghost" onClick={() => shift(-1)} aria-label="Previous month"><ChevronLeft className="h-4 w-4" /></Button>
        <h3 className="text-base font-semibold">{new Date(`${month}-15`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</h3>
        <Button size="icon" variant="ghost" onClick={() => shift(1)} aria-label="Next month"><ChevronRight className="h-4 w-4" /></Button>
      </div>
      {error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : !data || loading ? (
        <div className="grid h-80 place-items-center"><Spinner /></div>
      ) : (
        <>
          <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold uppercase text-slate-400">
            {DAY_NAMES.map((d) => <div key={d} className="py-1">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {days.map((d, i) => {
              if (!d) return <div key={`b${i}`} />;
              const info = dayInfo(d);
              const closed = info.entries.some((e) => ['holiday', 'date_block'].includes(e.type)) || info.closedWeekday;
              const open = info.entries.some((e) => e.type === 'date_open');
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => onPickDay(d, info)}
                  className={`flex min-h-[78px] flex-col items-stretch rounded-xl border p-1.5 text-left transition hover:border-primary ${
                    selected === d ? 'border-primary ring-2 ring-primary/20' : 'border-slate-100'
                  } ${closed && !open ? 'bg-rose-50/70' : 'bg-white'} ${d === today() ? 'outline outline-2 outline-secondary/60' : ''}`}
                >
                  <span className={`text-xs font-semibold ${closed && !open ? 'text-rose-600' : 'text-slate-700'}`}>{Number(d.slice(8))}</span>
                  <div className="mt-1 space-y-0.5 overflow-hidden">
                    {info.entries.slice(0, 2).map((e) => (
                      <span key={e._id} className={`block truncate rounded px-1 text-[10px] font-semibold ring-1 ${TYPE_STYLE[e.type]}`}>{entryLabel(e)}</span>
                    ))}
                    {info.bookings.length > 0 && (
                      <span className="block truncate rounded bg-primary-light px-1 text-[10px] font-semibold text-primary">{info.bookings.length} booking(s)</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Operating hours: {formatTime(data.operatingHours.start)} – {formatTime(data.operatingHours.end)}
            {data.closedWeekdays.length ? ` · Closed: ${data.closedWeekdays.map((d) => DAY_NAMES[d]).join(', ')}` : ''}
          </p>
        </>
      )}
    </div>
  );
}

export default function AvailabilityPage() {
  const [month, setMonth] = useState(today().slice(0, 7));
  const [day, setDay] = useState(null);
  const [version, setVersion] = useState(0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Availability Calendar"
        description="Block dates, time slots, vehicles or drivers, mark holidays and set restrictions. Customers can only submit bookings that pass these rules."
        actions={<Button variant="outline" icon={Settings} to="/admin/settings">Operating hours & rules</Button>}
      />
      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <MonthCalendar key={version} month={month} setMonth={setMonth} selected={day?.date} onPickDay={(date, info) => setDay({ date, ...info })} />
        <div className="card p-4">
          {!day ? (
            <div className="grid h-full place-items-center py-10 text-center text-sm text-slate-500">
              <div>
                <CalendarRange className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                Select a date to see bookings and blocks.
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="text-base font-semibold">{formatDate(day.date, { weekday: 'long', day: 'numeric', month: 'long' })}</h3>
              {day.closedWeekday && <Badge className={TYPE_STYLE.holiday}>Closed weekday</Badge>}
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Blocks & rules</p>
                {!day.entries.length ? (
                  <p className="text-sm text-slate-500">None</p>
                ) : (
                  <ul className="space-y-2">
                    {day.entries.map((e) => (
                      <li key={e._id} className="rounded-lg border border-slate-100 p-2 text-sm">
                        <Badge className={TYPE_STYLE[e.type]}>{TYPE_LABEL[e.type]}</Badge>
                        <p className="mt-1 font-medium">{entryLabel(e)}</p>
                        {e.reason && <p className="text-xs text-slate-500">{e.reason}</p>}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Bookings</p>
                {!day.bookings.length ? (
                  <p className="text-sm text-slate-500">No bookings</p>
                ) : (
                  <ul className="space-y-2">
                    {day.bookings.map((b) => (
                      <li key={b._id}>
                        <Link to={`/admin/bookings/${b._id}`} className="block rounded-lg border border-slate-100 p-2 text-sm hover:border-primary">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold">{b.bookingRef}</span>
                            <StatusBadge status={b.status} />
                          </div>
                          <p className="text-xs text-slate-500">
                            {formatTime(b.pickupTime)} · {b.pickupCityName}{b.dropCityName ? ` → ${b.dropCityName}` : ''} · {b.customerName}
                          </p>
                          <p className="text-xs text-slate-500">{b.assignedVehicle?.name || b.selectedVehicleName || 'No car'} · {b.assignedDriver?.fullName || 'No driver'}</p>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <ResourceManager
        embedded
        title="Availability rules"
        endpoint="/admin/availability"
        singular="availability rule"
        searchable={false}
        defaultSort="-startDate"
        onChanged={() => setVersion((v) => v + 1)}
        filters={[{ name: 'type', label: 'All types', options: Object.entries(TYPE_LABEL).map(([value, label]) => ({ value, label })) }]}
        columns={[
          { key: 'type', label: 'Type', render: (r) => <Badge className={TYPE_STYLE[r.type]}>{TYPE_LABEL[r.type]}</Badge> },
          { key: 'title', label: 'Details', render: (r) => <div><p className="font-medium">{entryLabel(r)}</p>{r.reason && <p className="text-xs text-slate-500">{r.reason}</p>}</div> },
          { key: 'dates', label: 'Dates', render: (r) => `${formatDate(r.startDate)}${r.endDate !== r.startDate ? ` → ${formatDate(r.endDate)}` : ''}` },
          { key: 'scope', label: 'Scope', render: (r) => `${titleCase(r.bookingType)}${r.city ? ` · ${r.city.name}` : ''}` },
          { key: 'isActive', label: 'Status', render: (r) => <ActiveBadge active={r.isActive} /> },
        ]}
        fields={[
          { name: 'type', label: 'Type', type: 'select', required: true, options: Object.entries(TYPE_LABEL).map(([value, label]) => ({ value, label })), placeholder: 'Select…' },
          { name: 'title', label: 'Title', placeholder: 'e.g. Diwali' },
          { name: 'startDate', label: 'Start date', type: 'date', required: true },
          { name: 'endDate', label: 'End date', type: 'date', required: true },
          { name: 'startTime', label: 'Slot start', type: 'time', showIf: (v) => v.type === 'time_block' },
          { name: 'endTime', label: 'Slot end', type: 'time', showIf: (v) => v.type === 'time_block' },
          { name: 'vehicle', label: 'Vehicle', type: 'select', optionsUrl: '/admin/vehicles', showIf: (v) => v.type === 'vehicle_block' },
          { name: 'driver', label: 'Driver', type: 'select', optionsUrl: '/admin/drivers', optionLabel: 'fullName', showIf: (v) => v.type === 'driver_block' },
          { name: 'city', label: 'Only for pickup city (optional)', type: 'select', optionsUrl: '/admin/cities', showIf: (v) => !['vehicle_block', 'driver_block'].includes(v.type) },
          { name: 'bookingType', label: 'Applies to', type: 'select', options: bookingTypeScope, default: 'all', showIf: (v) => !['vehicle_block', 'driver_block'].includes(v.type) },
          { name: 'reason', label: 'Reason (shown to customers for restrictions)', type: 'textarea' },
          { name: 'isActive', label: 'Active', type: 'checkbox', default: true },
        ]}
      />
    </div>
  );
}
