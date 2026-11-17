import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CarFront, Clock, Mail, MapPin, MessageCircle, Phone, Search } from 'lucide-react';
import { useSite } from '../../context/SiteContext';
import { useDebounce, useFetch } from '../../hooks/useFetch';
import { errorMessage, get } from '../../services/api';
import { BookingForm } from '../../components/public/BookingForm';
import { CarCard } from '../../components/public/CarCard';
import { FareBreakdown } from '../../components/FareBreakdown';
import { Button } from '../../components/ui/Button';
import { Field, Input, Select } from '../../components/ui/Form';
import { Alert, EmptyState, ErrorState, PageLoader, Skeleton, StatusBadge } from '../../components/ui/Feedback';
import { waLink } from '../../layouts/PublicLayout';
import { AC_LABEL, formatDate, formatTime, FUEL_TYPES, titleCase, TRIP_LABEL } from '../../utils/format';

function PageHero({ title, subtitle }) {
  return (
    <div className="border-b border-slate-200 bg-white">
      <div className="container-x py-10">
        <h1 className="text-3xl font-semibold sm:text-4xl">{title}</h1>
        {subtitle && <p className="mt-2 max-w-2xl text-slate-500">{subtitle}</p>}
      </div>
    </div>
  );
}

const PREFILL_KEYS = ['bookingType', 'tripType', 'pickupCity', 'dropCity', 'localPackage', 'pickupDate', 'pickupTime', 'returnDate', 'passengers', 'acPreference', 'category', 'vehicle'];

export function BookPage() {
  const [params] = useSearchParams();
  const { settings } = useSite();
  const initial = useMemo(() => Object.fromEntries(PREFILL_KEYS.filter((k) => params.get(k)).map((k) => [k, params.get(k)])), [params]);
  if (settings.booking?.enabled === false) {
    return (
      <div className="container-x py-16">
        <EmptyState icon={Phone} title="Online booking is paused" description="Please call or WhatsApp us to book your ride." />
      </div>
    );
  }
  return (
    <>
      <PageHero title="Book your ride" subtitle="Get an instant fare estimate and send a booking request. No payment required now." />
      <div className="container-x py-8">
        <BookingForm key={params.toString()} initial={initial} />
      </div>
    </>
  );
}

export function CarsPage() {
  const { site } = useSite();
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const debounced = useDebounce(search);
  const category = params.get('category') || '';
  const [fuelType, setFuel] = useState('');
  const [acType, setAc] = useState('');
  const { data, loading, error, reload } = useFetch('/public/vehicles', { category: category || undefined, search: debounced || undefined, fuelType: fuelType || undefined, acType: acType || undefined });

  return (
    <>
      <PageHero title="Our cars" subtitle="Browse the fleet and pick the right car for your trip. Fuel is included in all per-km rates." />
      <div className="container-x py-8">
        {data && data.carSelectionEnabled === false ? (
          <EmptyState icon={CarFront} title="Choose a car category while booking" description="Our team assigns the best available car in your chosen category." action={<Button to="/book">Book now</Button>} />
        ) : (
          <>
            <div className="mb-6 grid gap-3 md:grid-cols-[1fr_auto_auto]">
              <Input icon={Search} placeholder="Search by name or brand…" value={search} onChange={(e) => setSearch(e.target.value)} />
              <Select className="md:w-44" placeholder="Any fuel" value={fuelType} onChange={(e) => setFuel(e.target.value)} options={FUEL_TYPES.map((f) => ({ value: f, label: titleCase(f) }))} />
              <Select className="md:w-44" placeholder="AC / Non-AC" value={acType} onChange={(e) => setAc(e.target.value)} options={[{ value: 'ac', label: 'AC' }, { value: 'non_ac', label: 'Non-AC' }]} />
            </div>
            <div className="scrollbar-thin -mx-1 mb-6 flex gap-2 overflow-x-auto px-1 pb-1">
              {[{ _id: '', name: 'All categories' }, ...site.categories].map((c) => (
                <button
                  key={c._id || 'all'}
                  type="button"
                  onClick={() => setParams(c._id ? { category: c._id } : {})}
                  className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition ${category === c._id ? 'bg-ink text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:ring-slate-300'}`}
                >
                  {c.name}
                </button>
              ))}
            </div>
            {error ? (
              <ErrorState message={error} onRetry={reload} />
            ) : loading && !data ? (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-80" />)}</div>
            ) : !data.items.length ? (
              <EmptyState icon={CarFront} title="No cars found" description="Try a different filter." />
            ) : (
              <div className={`grid gap-5 sm:grid-cols-2 lg:grid-cols-3 ${loading ? 'opacity-60' : ''}`}>
                {data.items.map((car) => (
                  <CarCard key={car._id} car={car} actionLabel="Book this car" to={`/book?vehicle=${car._id}&category=${car.category?._id || ''}`} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}

export function TrackPage() {
  const [params] = useSearchParams();
  const [ref, setRef] = useState(params.get('ref') || '');
  const [phone, setPhone] = useState(params.get('phone') || '');
  const [state, setState] = useState({ status: 'idle' });

  const lookup = async (e) => {
    e?.preventDefault();
    if (!ref.trim() || !phone.trim()) return;
    setState({ status: 'loading' });
    try {
      const booking = await get(`/public/bookings/${encodeURIComponent(ref.trim().toUpperCase())}`, { phone: phone.trim() });
      setState({ status: 'ok', booking });
    } catch (err) {
      setState({ status: 'error', error: errorMessage(err) });
    }
  };

  useEffect(() => {
    if (params.get('ref') && params.get('phone')) lookup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const b = state.booking;
  return (
    <>
      <PageHero title="Track your booking" subtitle="Enter your booking reference and the mobile number used while booking." />
      <div className="container-x grid gap-6 py-8 lg:grid-cols-[380px_1fr]">
        <form onSubmit={lookup} className="card h-fit space-y-4 p-5">
          <Field label="Booking reference"><Input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="DE2611180001" className="font-mono uppercase" /></Field>
          <Field label="Mobile number"><Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} /></Field>
          <Button type="submit" className="w-full" icon={Search} loading={state.status === 'loading'}>Find booking</Button>
        </form>
        <div>
          {state.status === 'error' && <Alert tone="error">{state.error}</Alert>}
          {b && (
            <div className="card animate-fade-up p-6">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs text-slate-500">Booking</p>
                  <p className="font-mono text-xl font-semibold">{b.bookingRef}</p>
                </div>
                <div className="flex gap-2"><StatusBadge status={b.status} /><StatusBadge status={b.paymentStatus} /></div>
              </div>
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                <div><dt className="text-slate-500">Trip</dt><dd className="font-semibold">{b.bookingType === 'local' ? `Local · ${b.localPackage?.name || ''} · ${b.pickupCityName}` : `${TRIP_LABEL[b.tripType]} · ${b.pickupCityName} → ${b.dropCityName}`}</dd></div>
                <div><dt className="text-slate-500">Pickup</dt><dd className="font-semibold">{formatDate(b.pickupDate)} · {formatTime(b.pickupTime)}</dd></div>
                {b.returnDate && <div><dt className="text-slate-500">Return</dt><dd className="font-semibold">{formatDate(b.returnDate)}</dd></div>}
                <div><dt className="text-slate-500">Car</dt><dd className="font-semibold">{b.selectedVehicleName || b.categoryName || 'Any'} · {AC_LABEL[b.acPreference]}</dd></div>
              </dl>
              <div className="mt-5 rounded-2xl bg-slate-50 p-4"><FareBreakdown fare={b.fare} /></div>
              {b.finalAmount != null && b.finalAmount !== b.fare.total && <p className="mt-3 text-sm font-semibold">Final amount confirmed: ₹{b.finalAmount.toLocaleString('en-IN')}</p>}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export function ContactPage() {
  const { settings, company } = useSite();
  const c = settings.contact || {};
  const wa = waLink(c.whatsappNumber, `Hi ${company}, I have a question.`);
  const mapOk = c.mapEmbedUrl && /^https:\/\/(www\.)?google\.[a-z.]+\/maps\/embed/i.test(c.mapEmbedUrl);
  const items = [
    c.phone && { icon: Phone, label: 'Phone', value: c.phone, href: `tel:${c.phone}` },
    c.alternatePhone && { icon: Phone, label: 'Alternate', value: c.alternatePhone, href: `tel:${c.alternatePhone}` },
    c.email && { icon: Mail, label: 'Email', value: c.email, href: `mailto:${c.email}` },
    c.address && { icon: MapPin, label: 'Address', value: c.address },
    c.workingHours && { icon: Clock, label: 'Hours', value: c.workingHours },
  ].filter(Boolean);
  return (
    <>
      <PageHero title="Contact us" subtitle="Call, WhatsApp or email — we usually respond within minutes." />
      <div className="container-x grid gap-6 py-8 lg:grid-cols-[1fr_1.4fr]">
        <div className="card space-y-4 p-6">
          {items.map((i) => (
            <div key={i.label} className="flex gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-light text-primary"><i.icon className="h-5 w-5" /></div>
              <div>
                <p className="text-xs text-slate-500">{i.label}</p>
                {i.href ? <a href={i.href} className="font-semibold text-ink hover:text-primary">{i.value}</a> : <p className="font-semibold text-ink">{i.value}</p>}
              </div>
            </div>
          ))}
          {!items.length && <p className="text-sm text-slate-500">Contact details will be published soon.</p>}
          <div className="flex flex-wrap gap-2 pt-2">
            {wa && <Button variant="whatsapp" icon={MessageCircle} href={wa} target="_blank" rel="noreferrer">WhatsApp us</Button>}
            <Button variant="outline" to="/book">Book online</Button>
          </div>
        </div>
        <div className="card overflow-hidden">
          {mapOk ? (
            <iframe title="Map" src={c.mapEmbedUrl} className="h-full min-h-[360px] w-full border-0" loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
          ) : (
            <div className="grid h-full min-h-[360px] place-items-center bg-gradient-to-br from-primary-light to-slate-100 text-primary/40"><MapPin className="h-16 w-16" /></div>
          )}
        </div>
      </div>
    </>
  );
}

const LEGAL = {
  terms: 'Terms & Conditions',
  privacy: 'Privacy Policy',
  cancellation: 'Cancellation Policy',
};

export function LegalPage({ type }) {
  const { data, loading, error, reload } = useFetch(`/public/legal/${type}`);
  return (
    <>
      <PageHero title={LEGAL[type]} />
      <div className="container-x py-8">
        <div className="card mx-auto max-w-3xl p-6 sm:p-8">
          {loading ? <PageLoader /> : error ? <ErrorState message={error} onRetry={reload} /> : data.content ? (
            <div className="space-y-4 whitespace-pre-line text-[15px] leading-relaxed text-slate-700">{data.content}</div>
          ) : (
            <p className="text-slate-500">Not published yet.</p>
          )}
        </div>
      </div>
    </>
  );
}

export function NotFoundPage() {
  return (
    <div className="container-x py-24">
      <EmptyState icon={CarFront} title="Page not found" description="The page you're looking for doesn't exist or has moved." action={<Button to="/">Back to home</Button>} />
    </div>
  );
}

