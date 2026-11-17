import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Calculator, Save } from 'lucide-react';
import { useFetch, useOptions } from '../../hooks/useFetch';
import { errorMessage, post, put } from '../../services/api';
import { Button } from '../../components/ui/Button';
import { Field, Input, Select, Textarea } from '../../components/ui/Form';
import { Alert, ErrorState, PageLoader } from '../../components/ui/Feedback';
import { PageHeader } from '../../components/ui/Misc';
import { FieldControl, fromFormValue, toFormValue } from '../../components/admin/FormFields';
import { FareBreakdown } from '../../components/FareBreakdown';
import { addDaysStr, today } from '../../utils/format';
import { fuelOptions } from './options';

const rateTableField = {
  name: 'rateTable',
  type: 'rows',
  addLabel: 'Add rate row',
  rowCols: 'sm:grid-cols-3 lg:grid-cols-6',
  fields: [
    { name: 'label', label: 'Label' },
    { name: 'bookingType', label: 'Booking type', type: 'select', options: [{ value: 'outstation', label: 'Outstation' }, { value: 'local', label: 'Local (extra KM)' }], default: 'outstation' },
    { name: 'category', label: 'Category', type: 'select', optionsUrl: '/admin/categories', placeholder: 'Any category' },
    { name: 'fuelType', label: 'Fuel', type: 'select', options: [{ value: 'any', label: 'Any fuel' }, ...fuelOptions], default: 'any' },
    { name: 'acRate', label: 'AC ₹/km', type: 'number', min: 0, required: true },
    { name: 'nonAcRate', label: 'Non-AC ₹/km', type: 'number', min: 0, required: true },
  ],
};

function Card({ title, description, children }) {
  return (
    <section className="card p-5">
      <h3 className="text-base font-semibold">{title}</h3>
      {description && <p className="mb-4 mt-0.5 text-sm text-slate-500">{description}</p>}
      {!description && <div className="mb-4" />}
      {children}
    </section>
  );
}

const num = (register, name, extra = {}) => <Input type="number" step="any" min="0" {...register(name, { valueAsNumber: true, ...extra })} />;

function FareTester() {
  const { options: cities } = useOptions('/admin/cities', { params: { isActive: true } });
  const { options: categories } = useOptions('/admin/categories');
  const { options: packages } = useOptions('/admin/packages');
  const [input, setInput] = useState({ bookingType: 'outstation', tripType: 'one_way', pickupDate: addDaysStr(today(), 7), pickupTime: '10:00', returnDate: addDaysStr(today(), 8), passengers: 2, acPreference: 'ac' });
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setInput((i) => ({ ...i, [k]: e.target.value }));

  const run = async () => {
    setBusy(true);
    setError('');
    setResult(null);
    try {
      setResult(await post('/public/fare-estimate', { ...input, passengers: Number(input.passengers) }));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card title="Fare calculator tester" description="Runs the same server-side engine customers use, with your saved settings (save changes first).">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Booking type">
          <Select value={input.bookingType} onChange={set('bookingType')} options={[{ value: 'outstation', label: 'Outstation' }, { value: 'local', label: 'Local' }]} />
        </Field>
        <Field label="Pickup city"><Select value={input.pickupCity || ''} onChange={set('pickupCity')} placeholder="Select…" options={cities} /></Field>
        {input.bookingType === 'outstation' ? (
          <>
            <Field label="Destination"><Select value={input.dropCity || ''} onChange={set('dropCity')} placeholder="Select…" options={cities} /></Field>
            <Field label="Trip"><Select value={input.tripType} onChange={set('tripType')} options={[{ value: 'one_way', label: 'One-way' }, { value: 'round_trip', label: 'Round-trip' }]} /></Field>
          </>
        ) : (
          <Field label="Package" className="lg:col-span-2"><Select value={input.localPackage || ''} onChange={set('localPackage')} placeholder="Select…" options={packages} /></Field>
        )}
        <Field label="Pickup date"><Input type="date" value={input.pickupDate} onChange={set('pickupDate')} /></Field>
        <Field label="Pickup time"><Input type="time" value={input.pickupTime} onChange={set('pickupTime')} /></Field>
        {input.bookingType === 'outstation' && input.tripType === 'round_trip' && (
          <Field label="Return date"><Input type="date" value={input.returnDate} onChange={set('returnDate')} /></Field>
        )}
        <Field label="Category"><Select value={input.category || ''} onChange={set('category')} placeholder="Any" options={categories} /></Field>
        <Field label="AC"><Select value={input.acPreference} onChange={set('acPreference')} options={[{ value: 'ac', label: 'AC' }, { value: 'non_ac', label: 'Non-AC' }]} /></Field>
      </div>
      <Button className="mt-4" icon={Calculator} loading={busy} onClick={run}>Calculate</Button>
      {error && <Alert tone="error" className="mt-4">{error}</Alert>}
      {result && (
        <div className="mt-4 max-w-md rounded-xl border border-slate-200 p-4">
          <FareBreakdown fare={result.fare} />
          <p className="mt-2 text-xs text-slate-400">Rate source: {result.fare.rateSource} · billable {result.fare.billableKm} km</p>
        </div>
      )}
    </Card>
  );
}

export default function PricingPage() {
  const { data, loading, error, reload } = useFetch('/admin/pricing');
  const form = useForm();
  const { register, handleSubmit, reset, formState } = form;

  useEffect(() => {
    if (!data) return;
    reset({ ...data, rateTable: toFormValue(rateTableField, data.rateTable) });
  }, [data, reset]);

  const onSubmit = handleSubmit(async (v) => {
    const payload = {};
    ['defaultRates', 'driverAllowance', 'nightCharges', 'extraKmCharge', 'extraHourCharge', 'waitingCharges', 'tollCharges', 'parkingCharges', 'minimumFare', 'oneWay', 'roundTrip', 'gstPercent', 'notes', 'currencySymbol'].forEach((k) => {
      payload[k] = v[k];
    });
    payload.rateTable = fromFormValue(rateTableField, v.rateTable);
    try {
      await put('/admin/pricing', JSON.parse(JSON.stringify(payload, (_k, val) => (Number.isNaN(val) ? 0 : val))));
      toast.success('Pricing saved. New rates apply to new bookings only.');
      reload();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  });

  if (loading && !data) return <PageLoader />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  return (
    <form onSubmit={onSubmit} className="space-y-6" noValidate>
      <PageHeader
        title="Pricing Management"
        description="All rates include fuel. Existing bookings keep their original fare snapshot when you change rates."
        actions={<Button type="submit" icon={Save} loading={formState.isSubmitting}>Save pricing</Button>}
      />

      <Alert tone="info">
        <b>How the per-KM rate is chosen (outstation):</b> 1) route-specific rate for the category (Routes) → 2) the car&apos;s own rate (Cars & Vehicles) →
        3) the most specific row below (category + fuel beats category beats any) → 4) default rates. Then: <b>total = base fare + one seasonal adjustment + driver allowance + night charges + tolls + parking (+ minimum-fare top-up + GST)</b>.
      </Alert>

      <Card title="Default per-KM rates" description="Fallback when no table row, route or vehicle rate applies.">
        <div className="grid gap-4 sm:grid-cols-4">
          <Field label="Local AC ₹/km">{num(register, 'defaultRates.local.ac')}</Field>
          <Field label="Local Non-AC ₹/km">{num(register, 'defaultRates.local.nonAc')}</Field>
          <Field label="Outstation AC ₹/km">{num(register, 'defaultRates.outstation.ac')}</Field>
          <Field label="Outstation Non-AC ₹/km">{num(register, 'defaultRates.outstation.nonAc')}</Field>
        </div>
      </Card>

      <Card title="Rate table (category / fuel specific)" description="Configure separate petrol, diesel, CNG… rates per category. Leave category empty for all categories.">
        <FieldControl field={rateTableField} control={form.control} register={register} errors={formState.errors} />
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="One-way & round-trip">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="One-way minimum KM">{num(register, 'oneWay.minKm')}</Field>
            <Field label="One-way rate multiplier" hint="1 = normal, 1.1 = +10%">{num(register, 'oneWay.rateMultiplier')}</Field>
            <Field label="Round-trip minimum KM per day">{num(register, 'roundTrip.minKmPerDay')}</Field>
            <Field label="Round-trip rate multiplier">{num(register, 'roundTrip.rateMultiplier')}</Field>
          </div>
        </Card>
        <Card title="Driver allowance">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Local (per booking) ₹">{num(register, 'driverAllowance.local')}</Field>
            <Field label="Outstation (per day) ₹">{num(register, 'driverAllowance.outstationPerDay')}</Field>
          </div>
        </Card>
        <Card title="Night charges" description="Added once when pickup (or local drop) falls in the window.">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Amount ₹">{num(register, 'nightCharges.amount')}</Field>
            <Field label="From"><Input type="time" {...register('nightCharges.startTime')} /></Field>
            <Field label="To"><Input type="time" {...register('nightCharges.endTime')} /></Field>
          </div>
        </Card>
        <Card title="Extra KM, extra hour & waiting" description="Shown to customers as post-trip rates (local packages may override).">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Extra KM AC ₹/km" hint="0 = use local per-KM rate">{num(register, 'extraKmCharge.ac')}</Field>
            <Field label="Extra KM Non-AC ₹/km">{num(register, 'extraKmCharge.nonAc')}</Field>
            <Field label="Extra hour AC ₹/hr">{num(register, 'extraHourCharge.ac')}</Field>
            <Field label="Extra hour Non-AC ₹/hr">{num(register, 'extraHourCharge.nonAc')}</Field>
            <Field label="Waiting ₹/hr">{num(register, 'waitingCharges.perHour')}</Field>
            <Field label="Free waiting (minutes)">{num(register, 'waitingCharges.freeMinutes')}</Field>
          </div>
        </Card>
        <Card title="Tolls & parking" description="Route tolls take priority; default used when a route has none. Round trips double the toll.">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Default outstation toll ₹">{num(register, 'tollCharges.defaultOutstation')}</Field>
            <Field label="Local parking ₹">{num(register, 'parkingCharges.local')}</Field>
            <Field label="Outstation parking ₹">{num(register, 'parkingCharges.outstation')}</Field>
            <label className="flex items-center gap-2 text-sm sm:col-span-3">
              <input type="checkbox" className="h-4 w-4 accent-[rgb(var(--c-primary))]" {...register('tollCharges.includeInEstimate')} />
              Include estimated tolls in the fare
            </label>
          </div>
        </Card>
        <Card title="Minimum fare & tax">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Local minimum ₹">{num(register, 'minimumFare.local')}</Field>
            <Field label="Outstation minimum ₹">{num(register, 'minimumFare.outstation')}</Field>
            <Field label="GST %" hint="Not applied to tolls/parking">{num(register, 'gstPercent', { max: 28 })}</Field>
          </div>
        </Card>
      </div>

      <Card title="Fare notes shown to customers">
        <Textarea rows={3} {...register('notes')} />
      </Card>

      <div className="flex justify-end">
        <Button type="submit" icon={Save} loading={formState.isSubmitting}>Save pricing</Button>
      </div>

      <FareTester />
    </form>
  );
}
