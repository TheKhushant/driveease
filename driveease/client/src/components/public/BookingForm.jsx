import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { ArrowRight, Building2, Calendar, Clock, Loader2, Mail, MapPin, Phone, Route as RouteIcon, User, Users } from 'lucide-react';
import { useSite } from '../../context/SiteContext';
import { useDebounce, useFetch } from '../../hooks/useFetch';
import { errorMessage, fieldErrors, post } from '../../services/api';
import { addDaysStr, formatDuration, formatINR, formatTime, today } from '../../utils/format';
import { Button } from '../ui/Button';
import { Field, Input, Segmented, Select, Textarea } from '../ui/Form';
import { Alert } from '../ui/Feedback';
import { FareBreakdown } from '../FareBreakdown';
import { CarSelector } from './CarSelector';
import { BookingSuccess } from './BookingSuccess';

const TRIP_FIELDS = ['bookingType', 'tripType', 'pickupCity', 'dropCity', 'localPackage', 'pickupDate', 'pickupTime', 'returnDate', 'passengers', 'acPreference'];

export const DEFAULT_BOOKING = {
  bookingType: 'outstation',
  tripType: 'one_way',
  pickupCity: '',
  dropCity: '',
  localPackage: '',
  pickupDate: addDaysStr(today(), 1),
  pickupTime: '09:00',
  returnDate: addDaysStr(today(), 2),
  passengers: 2,
  acPreference: 'ac',
  category: '',
  vehicle: '',
  customerName: '',
  customerPhone: '',
  customerEmail: '',
  pickupAddress: '',
  dropAddress: '',
  instructions: '',
  agree: false,
};

function Step({ n, title, subtitle, children }) {
  return (
    <section className="card p-5 sm:p-6">
      <div className="mb-5 flex items-start gap-3">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary text-sm font-bold text-white">{n}</span>
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

function tripPayload(v) {
  const p = {
    bookingType: v.bookingType,
    pickupCity: v.pickupCity,
    pickupDate: v.pickupDate,
    pickupTime: v.pickupTime,
    passengers: Number(v.passengers) || 1,
    acPreference: v.acPreference,
  };
  if (v.bookingType === 'local') p.localPackage = v.localPackage;
  else {
    p.tripType = v.tripType;
    p.dropCity = v.dropCity;
    if (v.tripType === 'round_trip') p.returnDate = v.returnDate;
  }
  return p;
}

const isTripReady = (v) =>
  Boolean(
    v.pickupCity &&
      v.pickupDate &&
      v.pickupTime &&
      Number(v.passengers) > 0 &&
      (v.bookingType === 'local' ? v.localPackage : v.dropCity && v.tripType && (v.tripType === 'one_way' || (v.returnDate && v.returnDate >= v.pickupDate))),
  );

export function BookingForm({ initial = {} }) {
  const { site, settings } = useSite();
  const { display = {}, booking: bookingSettings = {} } = settings;
  const form = useForm({ defaultValues: { ...DEFAULT_BOOKING, ...initial }, mode: 'onTouched' });
  const { register, watch, setValue, handleSubmit, setError, formState, reset } = form;
  const v = watch();
  const [result, setResult] = useState(null);
  const [submitError, setSubmitError] = useState('');
  const [quote, setQuote] = useState({ status: 'idle' });
  const [estimates, setEstimates] = useState(null);
  const topRef = useRef();

  const cities = site.cities;
  const pickupCities = cities.filter((c) => (v.bookingType === 'local' ? c.localServiceAvailable !== false : c.outstationServiceAvailable !== false));
  const { data: destinations, loading: destLoading } = useFetch(v.bookingType === 'outstation' && v.pickupCity ? `/public/cities/${v.pickupCity}/destinations` : null);
  const { data: vehicleData } = useFetch('/public/vehicles');
  const vehicles = vehicleData?.items || [];
  const packages = site.packages.filter((p) => !p.cities?.length || p.cities.includes(v.pickupCity));
  const route = destinations?.find((d) => d.city._id === v.dropCity);

  // Keep dependent fields consistent
  useEffect(() => {
    if (!destinations || !v.dropCity) return;
    if (!destinations.some((d) => d.city._id === v.dropCity)) {
      const name = cities.find((c) => c._id === v.dropCity)?.name;
      setValue('dropCity', '');
      if (name) toast(`We don't operate ${cities.find((c) => c._id === v.pickupCity)?.name} → ${name} yet. Please choose another destination.`, { icon: 'ℹ️' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destinations]);

  useEffect(() => {
    if (route && v.tripType === 'one_way' && !route.oneWayAvailable) setValue('tripType', 'round_trip');
    if (route && v.tripType === 'round_trip' && !route.roundTripAvailable) setValue('tripType', 'one_way');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route]);

  useEffect(() => {
    if (v.localPackage && !packages.some((p) => p._id === v.localPackage)) setValue('localPackage', '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [v.pickupCity]);

  useEffect(() => {
    if (v.returnDate && v.pickupDate && v.returnDate < v.pickupDate) setValue('returnDate', v.pickupDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [v.pickupDate]);

  const ready = isTripReady(v);
  const tripKey = useDebounce(ready ? JSON.stringify(tripPayload(v)) : '', 450);
  const quoteKey = useDebounce(ready ? JSON.stringify({ ...tripPayload(v), category: v.category || undefined, vehicle: v.vehicle || undefined }) : '', 450);

  // Per-car estimates for the car selector (server-side calculation)
  useEffect(() => {
    if (!tripKey) {
      setEstimates(null);
      return undefined;
    }
    let live = true;
    post('/public/fare-estimate/vehicles', JSON.parse(tripKey))
      .then((d) => live && setEstimates(d))
      .catch(() => live && setEstimates(null));
    return () => {
      live = false;
    };
  }, [tripKey]);

  // Fare quote for the current selection (also validates dates & availability)
  useEffect(() => {
    if (!quoteKey) {
      setQuote({ status: 'idle' });
      return undefined;
    }
    let live = true;
    setQuote((q) => ({ ...q, status: 'loading' }));
    post('/public/fare-estimate', JSON.parse(quoteKey))
      .then((d) => live && setQuote({ status: 'ok', fare: d.fare, route: d.route }))
      .catch((err) => live && setQuote({ status: 'error', error: errorMessage(err) }));
    return () => {
      live = false;
    };
  }, [quoteKey]);

  const categories = useMemo(() => site.categories, [site.categories]);
  const selectedCar = vehicles.find((c) => c._id === v.vehicle);
  const selectedCat = categories.find((c) => c._id === v.category);

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError('');
    if (bookingSettings.requireCarSelection && !values.vehicle) {
      setSubmitError('Please select a car to continue.');
      return;
    }
    const payload = {
      ...tripPayload(values),
      category: values.category || undefined,
      vehicle: values.vehicle || undefined,
      customerName: values.customerName.trim(),
      customerPhone: values.customerPhone.trim(),
      customerEmail: values.customerEmail.trim() || undefined,
      pickupAddress: values.pickupAddress.trim() || undefined,
      dropAddress: values.dropAddress.trim() || undefined,
      instructions: values.instructions.trim() || undefined,
    };
    try {
      // Saved in MongoDB first; the WhatsApp link is generated only after the save succeeds.
      const res = await post('/public/bookings', payload);
      setResult({ ...res, phone: payload.customerPhone });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      const fe = fieldErrors(err);
      Object.entries(fe).forEach(([name, message]) => setError(name, { message }));
      setSubmitError(errorMessage(err, 'Could not submit your booking'));
      toast.error(errorMessage(err, 'Could not submit your booking'));
    }
  });

  if (result) {
    return (
      <BookingSuccess
        result={result}
        phone={result.phone}
        onNew={() => {
          setResult(null);
          reset({ ...DEFAULT_BOOKING });
        }}
      />
    );
  }

  const e = formState.errors;
  const minDate = today();
  const summary = (
    <div className="card p-5">
      <h3 className="mb-4 text-base font-semibold">Trip summary</h3>
      <ul className="mb-4 space-y-2 text-sm text-slate-600">
        <li className="flex gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
          {cities.find((c) => c._id === v.pickupCity)?.name || 'Pickup city'}
          {v.bookingType === 'outstation' ? ` → ${cities.find((c) => c._id === v.dropCity)?.name || 'Destination'}` : ' · Local'}
        </li>
        {route && <li className="flex gap-2"><RouteIcon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />{route.distanceKm} km · ~{formatDuration(route.durationMinutes)}</li>}
        <li className="flex gap-2"><Calendar className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />{v.pickupDate} · {formatTime(v.pickupTime)}{v.bookingType === 'outstation' && v.tripType === 'round_trip' ? ` → ${v.returnDate}` : ''}</li>
        <li className="flex gap-2"><Users className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />{v.passengers} passenger(s) · {v.acPreference === 'ac' ? 'AC' : 'Non-AC'}</li>
        <li className="flex gap-2"><Building2 className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />{selectedCar?.name || selectedCat?.name || 'Any car'}</li>
      </ul>
      {quote.status === 'idle' && <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-500">Fill in trip details to see your fare estimate.</p>}
      {quote.status === 'loading' && !quote.fare && (
        <p className="flex items-center gap-2 rounded-xl bg-slate-50 p-3 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />Calculating fare…</p>
      )}
      {quote.status === 'error' && <Alert tone="warn">{quote.error}</Alert>}
      {quote.fare && quote.status !== 'error' && (
        <div className={quote.status === 'loading' ? 'opacity-50 transition' : 'transition'}>
          {display.showFareBreakdown !== false ? (
            <FareBreakdown fare={quote.fare} />
          ) : (
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">Estimated total</span>
              <span className="font-display text-2xl font-semibold text-primary">{formatINR(quote.fare.total)}</span>
            </div>
          )}
        </div>
      )}
      <p className="mt-3 text-[11px] text-slate-400">Estimate only. The final fare is confirmed by our team; tolls, parking and extra km/hours are charged as actuals.</p>
    </div>
  );

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-6 lg:grid-cols-[1fr_360px]" ref={topRef}>
      <div className="min-w-0 space-y-6">
        <Step n={1} title="Trip details" subtitle="Where and when do you want to travel?">
          <div className="space-y-5">
            <Segmented
              className="w-full sm:w-auto"
              value={v.bookingType}
              onChange={(val) => setValue('bookingType', val)}
              options={[
                { value: 'outstation', label: 'Outstation', disabled: bookingSettings.outstationEnabled === false },
                { value: 'local', label: 'Local (hourly)', disabled: bookingSettings.localEnabled === false },
              ]}
            />
            {v.bookingType === 'outstation' && (
              <div className="flex gap-2">
                {[
                  { value: 'one_way', label: 'One-way', disabled: route && !route.oneWayAvailable },
                  { value: 'round_trip', label: 'Round-trip', disabled: route && !route.roundTripAvailable },
                ].map((o) => (
                  <label key={o.value} className={`flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition ${v.tripType === o.value ? 'border-primary bg-primary-light text-primary' : 'border-slate-200 text-slate-600'} ${o.disabled ? 'pointer-events-none opacity-40' : ''}`}>
                    <input type="radio" value={o.value} className="sr-only" {...register('tripType')} />
                    {o.label}
                  </label>
                ))}
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Pickup city" required error={e.pickupCity?.message}>
                <Select error={e.pickupCity} placeholder="Select pickup city" options={pickupCities.map((c) => ({ value: c._id, label: c.name }))} {...register('pickupCity', { required: 'Select a pickup city' })} />
              </Field>
              {v.bookingType === 'outstation' ? (
                <Field
                  label="Drop city"
                  required
                  error={e.dropCity?.message}
                  hint={v.pickupCity && destinations && !destinations.length ? 'No routes from this city yet — please call us for a quote.' : route ? `${route.distanceKm} km · approx. ${formatDuration(route.durationMinutes)}` : undefined}
                >
                  <Select
                    error={e.dropCity}
                    disabled={!v.pickupCity || destLoading}
                    placeholder={!v.pickupCity ? 'Select pickup city first' : destLoading ? 'Loading…' : 'Select destination'}
                    options={(destinations || []).map((d) => ({ value: d.city._id, label: `${d.city.name} (${d.distanceKm} km)` }))}
                    {...register('dropCity', { validate: (val, all) => all.bookingType !== 'outstation' || Boolean(val) || 'Select a destination' })}
                  />
                </Field>
              ) : (
                <Field label="Package" required error={e.localPackage?.message} hint={!packages.length && v.pickupCity ? 'No local packages in this city.' : undefined}>
                  <Select
                    error={e.localPackage}
                    disabled={!v.pickupCity}
                    placeholder={v.pickupCity ? 'Select a package' : 'Select pickup city first'}
                    options={packages.map((p) => ({ value: p._id, label: `${p.name} · from ${formatINR(p.basePriceNonAc < p.basePriceAc ? p.basePriceNonAc : p.basePriceAc)}` }))}
                    {...register('localPackage', { validate: (val, all) => all.bookingType !== 'local' || Boolean(val) || 'Select a package' })}
                  />
                </Field>
              )}
              <Field label="Pickup date" required error={e.pickupDate?.message}>
                <Input icon={Calendar} type="date" min={minDate} error={e.pickupDate} {...register('pickupDate', { required: 'Select a date' })} />
              </Field>
              <Field label="Pickup time" required error={e.pickupTime?.message} hint={bookingSettings.operatingStart ? `Pickups ${formatTime(bookingSettings.operatingStart)} – ${formatTime(bookingSettings.operatingEnd)}` : undefined}>
                <Input icon={Clock} type="time" error={e.pickupTime} {...register('pickupTime', { required: 'Select a time' })} />
              </Field>
              {v.bookingType === 'outstation' && v.tripType === 'round_trip' && (
                <Field label="Return date" required error={e.returnDate?.message}>
                  <Input
                    icon={Calendar}
                    type="date"
                    min={v.pickupDate || minDate}
                    error={e.returnDate}
                    {...register('returnDate', { validate: (val, all) => all.tripType !== 'round_trip' || all.bookingType !== 'outstation' || (val && val >= all.pickupDate) || 'Return must be on/after pickup' })}
                  />
                </Field>
              )}
              <Field label="Passengers" required error={e.passengers?.message}>
                <Input icon={Users} type="number" min="1" max="60" error={e.passengers} {...register('passengers', { required: 'Required', min: { value: 1, message: 'At least 1' }, max: { value: 60, message: 'Too many' } })} />
              </Field>
              <Field label="AC preference">
                <Segmented
                  className="w-full"
                  value={v.acPreference}
                  onChange={(val) => setValue('acPreference', val)}
                  options={[
                    { value: 'ac', label: 'AC' },
                    { value: 'non_ac', label: 'Non-AC' },
                  ]}
                />
              </Field>
            </div>
          </div>
        </Step>

        <Step
          n={2}
          title={display.carSelectionEnabled === false ? 'Car category' : 'Choose your car'}
          subtitle={ready ? 'Estimated fares are calculated for your trip.' : 'Complete trip details to see estimated fares.'}
        >
          <CarSelector
            mode={display.carDisplayMode}
            carSelectionEnabled={display.carSelectionEnabled !== false}
            categories={categories}
            vehicles={vehicles}
            estimates={estimates}
            category={v.category}
            vehicle={v.vehicle}
            passengers={Number(v.passengers)}
            onChange={({ category, vehicle }) => {
              setValue('category', category);
              setValue('vehicle', vehicle);
            }}
          />
        </Step>

        <Step n={3} title="Your details" subtitle="We'll contact you on this number to confirm.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name" required error={e.customerName?.message}>
              <Input icon={User} autoComplete="name" error={e.customerName} {...register('customerName', { required: 'Enter your name', minLength: { value: 2, message: 'Enter your full name' } })} />
            </Field>
            <Field label="Mobile number" required error={e.customerPhone?.message}>
              <Input
                icon={Phone}
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="10-digit mobile"
                error={e.customerPhone}
                {...register('customerPhone', { required: 'Enter your mobile number', validate: (val) => /^\+?[0-9]{10,15}$/.test(val.replace(/[\s\-()]/g, '')) || 'Enter a valid mobile number' })}
              />
            </Field>
            <Field label="Email (optional)" error={e.customerEmail?.message}>
              <Input icon={Mail} type="email" autoComplete="email" error={e.customerEmail} {...register('customerEmail', { pattern: { value: /^\S+@\S+\.\S+$/, message: 'Enter a valid email' } })} />
            </Field>
            <Field label="Pickup address / landmark">
              <Input icon={MapPin} {...register('pickupAddress')} />
            </Field>
            {v.bookingType === 'outstation' && (
              <Field label="Drop address / landmark" className="sm:col-span-2">
                <Input icon={MapPin} {...register('dropAddress')} />
              </Field>
            )}
            <Field label="Additional instructions" className="sm:col-span-2">
              <Textarea rows={3} placeholder="Luggage, child seat, flight number, stops…" {...register('instructions', { maxLength: { value: 1000, message: 'Too long' } })} />
            </Field>
            <label className="flex items-start gap-2 text-sm text-slate-600 sm:col-span-2">
              <input type="checkbox" className="mt-0.5 h-4 w-4 accent-[rgb(var(--c-primary))]" {...register('agree', { required: 'Please accept to continue' })} />
              <span>
                I understand the fare is an estimate and agree to the{' '}
                <a href="/terms" target="_blank" className="font-semibold text-primary">terms & conditions</a>.
                {e.agree && <span className="block text-xs font-medium text-rose-600">{e.agree.message}</span>}
              </span>
            </label>
          </div>
        </Step>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
        {summary}
        {submitError && <Alert tone="error">{submitError}</Alert>}
        <Button type="submit" size="lg" className="w-full" loading={formState.isSubmitting} disabled={quote.status === 'error'} icon={ArrowRight}>
          Request booking
        </Button>
        <p className="text-center text-xs text-slate-500">No payment now. Pay the driver in cash or UPI.</p>
      </aside>
    </form>
  );
}
