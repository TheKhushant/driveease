import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Calendar, Clock, MapPin, Navigation, Package } from 'lucide-react';
import { useSite } from '../../context/SiteContext';
import { useFetch } from '../../hooks/useFetch';
import { addDaysStr, formatINR, today } from '../../utils/format';
import { Button } from '../ui/Button';
import { Segmented } from '../ui/Form';

function IconSelect({ icon: Icon, label, children, ...props }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}</span>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
        <select className="input pl-9" {...props}>
          {children}
        </select>
      </div>
    </label>
  );
}

/** Compact hero form; hands off to the full /book page with prefilled values. */
export function HeroBookingForm() {
  const { site, settings } = useSite();
  const navigate = useNavigate();
  const b = settings.booking || {};
  const [s, setS] = useState({
    bookingType: b.outstationEnabled === false ? 'local' : 'outstation',
    tripType: 'one_way',
    pickupCity: '',
    dropCity: '',
    localPackage: '',
    pickupDate: addDaysStr(today(), 1),
    pickupTime: '09:00',
    returnDate: addDaysStr(today(), 2),
  });
  const set = (k) => (e) => setS((x) => ({ ...x, [k]: e.target.value }));
  const { data: destinations } = useFetch(s.bookingType === 'outstation' && s.pickupCity ? `/public/cities/${s.pickupCity}/destinations` : null);
  const packages = site.packages.filter((p) => !p.cities?.length || p.cities.includes(s.pickupCity));

  const submit = (e) => {
    e.preventDefault();
    const q = new URLSearchParams(Object.entries(s).filter(([k, v]) => v && !(k === 'returnDate' && s.tripType !== 'round_trip')));
    navigate(`/book?${q.toString()}`);
  };

  if (b.enabled === false) {
    return (
      <div className="rounded-3xl bg-white p-6 shadow-lift">
        <h3 className="text-lg font-semibold">Online booking is paused</h3>
        <p className="mt-1 text-sm text-slate-500">Please call or WhatsApp us to book your ride.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-3xl bg-white p-5 shadow-lift sm:p-6">
      <Segmented
        className="mb-4 w-full"
        value={s.bookingType}
        onChange={(v) => setS((x) => ({ ...x, bookingType: v }))}
        options={[
          { value: 'outstation', label: 'Outstation', icon: Navigation, disabled: b.outstationEnabled === false },
          { value: 'local', label: 'Local', icon: Package, disabled: b.localEnabled === false },
        ]}
      />
      {s.bookingType === 'outstation' && (
        <div className="mb-4 flex gap-4 text-sm font-semibold text-slate-600">
          {[
            ['one_way', 'One-way'],
            ['round_trip', 'Round-trip'],
          ].map(([val, label]) => (
            <label key={val} className="flex cursor-pointer items-center gap-2">
              <input type="radio" name="tripType" value={val} checked={s.tripType === val} onChange={set('tripType')} className="h-4 w-4 accent-[rgb(var(--c-primary))]" />
              {label}
            </label>
          ))}
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <IconSelect icon={MapPin} label="From" value={s.pickupCity} onChange={(e) => setS((x) => ({ ...x, pickupCity: e.target.value, dropCity: '', localPackage: '' }))} required>
          <option value="">Pickup city</option>
          {site.cities.map((c) => (
            <option key={c._id} value={c._id}>{c.name}</option>
          ))}
        </IconSelect>
        {s.bookingType === 'outstation' ? (
          <IconSelect icon={Navigation} label="To" value={s.dropCity} onChange={set('dropCity')} disabled={!s.pickupCity} required>
            <option value="">{s.pickupCity && destinations && !destinations.length ? 'No routes yet' : 'Destination'}</option>
            {(destinations || []).map((d) => (
              <option key={d.city._id} value={d.city._id}>{d.city.name} · {d.distanceKm} km</option>
            ))}
          </IconSelect>
        ) : (
          <IconSelect icon={Package} label="Package" value={s.localPackage} onChange={set('localPackage')} disabled={!s.pickupCity} required>
            <option value="">Select package</option>
            {packages.map((p) => (
              <option key={p._id} value={p._id}>{p.name} · {formatINR(Math.min(p.basePriceAc, p.basePriceNonAc))}</option>
            ))}
          </IconSelect>
        )}
        <label className="block">
          <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-400">Pickup date</span>
          <div className="relative">
            <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
            <input type="date" min={today()} className="input pl-9" value={s.pickupDate} onChange={set('pickupDate')} required />
          </div>
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-400">Pickup time</span>
          <div className="relative">
            <Clock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
            <input type="time" className="input pl-9" value={s.pickupTime} onChange={set('pickupTime')} required />
          </div>
        </label>
        {s.bookingType === 'outstation' && s.tripType === 'round_trip' && (
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-400">Return date</span>
            <div className="relative">
              <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
              <input type="date" min={s.pickupDate} className="input pl-9" value={s.returnDate} onChange={set('returnDate')} required />
            </div>
          </label>
        )}
      </div>
      <Button type="submit" size="lg" className="mt-5 w-full" icon={ArrowRight}>
        {settings.hero?.ctaText || 'Get fare estimate'}
      </Button>
    </form>
  );
}
