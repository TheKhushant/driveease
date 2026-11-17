import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  Car,
  CheckCircle2,
  Clock,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Trash2,
  User,
  UserSquare2,
  Users,
} from 'lucide-react';
import { useFetch } from '../../hooks/useFetch';
import { del, errorMessage, get, patch } from '../../services/api';
import { Button } from '../../components/ui/Button';
import { Field, Input, Select, Textarea } from '../../components/ui/Form';
import { Alert, ErrorState, PageLoader, StatusBadge } from '../../components/ui/Feedback';
import { ConfirmDialog, Modal } from '../../components/ui/Modal';
import { FareBreakdown } from '../../components/FareBreakdown';
import { RecordPaymentForm } from '../../components/admin/RecordPaymentForm';
import {
  AC_LABEL,
  formatDate,
  formatDateTime,
  formatDuration,
  formatINR,
  formatTime,
  STATUS_TRANSITIONS,
  titleCase,
  TRIP_LABEL,
} from '../../utils/format';

const ACTION_STYLE = {
  approved: 'primary',
  confirmed: 'primary',
  in_progress: 'dark',
  completed: 'primary',
  rejected: 'danger',
  cancelled: 'danger',
  pending: 'outline',
};
const ACTION_LABEL = {
  approved: 'Approve',
  confirmed: 'Confirm',
  in_progress: 'Start trip',
  completed: 'Mark completed',
  rejected: 'Reject',
  cancelled: 'Cancel booking',
  pending: 'Move to pending',
};

function Section({ title, children, action }) {
  return (
    <section className="card p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

function Row({ icon: Icon, label, children }) {
  return (
    <div className="flex gap-3 py-1.5">
      {Icon && <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />}
      <div className="min-w-0">
        <p className="text-xs text-slate-500">{label}</p>
        <div className="text-sm font-medium text-slate-800">{children || '—'}</div>
      </div>
    </div>
  );
}

function AssignPanel({ booking, onSaved }) {
  const [resources, setResources] = useState(null);
  const [vehicle, setVehicle] = useState(booking.assignedVehicle?._id || '');
  const [driver, setDriver] = useState(booking.assignedDriver?._id || '');
  const [saving, setSaving] = useState(false);
  const [conflicts, setConflicts] = useState([]);
  const locked = ['completed', 'cancelled', 'rejected'].includes(booking.status);

  useEffect(() => {
    get(`/admin/bookings/${booking._id}/resources`).then(setResources).catch((e) => toast.error(errorMessage(e)));
  }, [booking._id, booking.assignedVehicle?._id, booking.assignedDriver?._id]);

  const save = async () => {
    setSaving(true);
    setConflicts([]);
    try {
      const updated = await patch(`/admin/bookings/${booking._id}/assign`, { vehicle: vehicle || null, driver: driver || null });
      toast.success('Assignment saved');
      onSaved(updated);
    } catch (err) {
      setConflicts(err.response?.data?.details || []);
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const label = (r, name) => `${name}${r.available ? '' : ` — ⚠ ${r.conflicts[0]}`}`;
  return (
    <div className="space-y-3">
      {booking.selectedVehicleName && (
        <p className="text-xs text-slate-500">
          Customer selected: <span className="font-semibold text-slate-700">{booking.selectedVehicleName}</span>
        </p>
      )}
      <Field label="Vehicle">
        <Select
          value={vehicle}
          disabled={locked || !resources}
          onChange={(e) => setVehicle(e.target.value)}
          placeholder={booking.selectedVehicle ? '— Use customer-selected car —' : '— Not assigned —'}
          options={(resources?.vehicles || []).map((v) => ({
            value: v._id,
            label: label(v, `${v.name}${v.registrationNumber ? ` (${v.registrationNumber})` : ''} · ${v.seatingCapacity} seats`),
          }))}
        />
      </Field>
      <Field label="Driver">
        <Select
          value={driver}
          disabled={locked || !resources}
          onChange={(e) => setDriver(e.target.value)}
          placeholder="— Not assigned —"
          options={(resources?.drivers || []).map((d) => ({ value: d._id, label: label(d, `${d.fullName} · ${d.phone}`) }))}
        />
      </Field>
      {conflicts.length > 0 && (
        <Alert tone="error">
          <ul className="list-disc pl-4">
            {conflicts.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </Alert>
      )}
      <Button onClick={save} loading={saving} disabled={locked}>
        Save assignment
      </Button>
    </div>
  );
}

export default function BookingDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, loading, error, reload, setData } = useFetch(`/admin/bookings/${id}`);
  const [action, setAction] = useState(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [statusConflicts, setStatusConflicts] = useState([]);
  const [notes, setNotes] = useState('');
  const [finalAmount, setFinalAmount] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (data?.booking) {
      setNotes(data.booking.adminNotes || '');
      setFinalAmount(data.booking.finalAmount ?? '');
    }
  }, [data?.booking]);

  if (loading && !data) return <PageLoader />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  const { booking: b, payments, whatsappUrl, customerWhatsappUrl } = data;
  const allowed = STATUS_TRANSITIONS[b.status] || [];
  const mergeBooking = (updated) => setData((d) => ({ ...d, booking: { ...d.booking, ...updated } }));

  const changeStatus = async () => {
    setBusy(true);
    setStatusConflicts([]);
    try {
      await patch(`/admin/bookings/${b._id}/status`, { status: action, note: note || undefined, reason: note || undefined });
      toast.success(`Booking ${titleCase(action).toLowerCase()}`);
      setAction(null);
      setNote('');
      reload();
    } catch (err) {
      setStatusConflicts(err.response?.data?.details || []);
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const saveNotes = async () => {
    setBusy(true);
    try {
      const updated = await patch(`/admin/bookings/${b._id}`, { adminNotes: notes, finalAmount: finalAmount === '' ? undefined : Number(finalAmount) });
      mergeBooking(updated);
      toast.success('Saved');
      reload();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const deletePayment = async (pid) => {
    try {
      await del(`/admin/payments/${pid}`);
      toast.success('Payment removed');
      reload();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const deleteBooking = async () => {
    setBusy(true);
    try {
      await del(`/admin/bookings/${b._id}`);
      toast.success('Booking deleted');
      navigate('/admin/bookings', { replace: true });
    } catch (err) {
      toast.error(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <Link to="/admin/bookings" className="mb-2 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-primary">
            <ArrowLeft className="h-4 w-4" /> Bookings
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold">{b.bookingRef}</h1>
            <StatusBadge status={b.status} />
            <StatusBadge status={b.payment?.status} />
          </div>
          <p className="mt-1 text-sm text-slate-500">Requested {formatDateTime(b.createdAt)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {allowed.map((s) => (
            <Button key={s} size="sm" variant={ACTION_STYLE[s]} onClick={() => setAction(s)}>
              {ACTION_LABEL[s]}
            </Button>
          ))}
          {['cancelled', 'rejected'].includes(b.status) && (
            <Button size="sm" variant="ghost" icon={Trash2} className="text-rose-600" onClick={() => setDeleting(true)}>
              Delete
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Section title="Trip details">
            <div className="grid gap-x-6 sm:grid-cols-2">
              <Row icon={MapPin} label="Booking type">
                {b.bookingType === 'local' ? `Local${b.localPackageSnapshot?.name ? ` · ${b.localPackageSnapshot.name}` : ''}` : `Outstation · ${TRIP_LABEL[b.tripType]}`}
              </Row>
              <Row icon={MapPin} label="Route">
                {b.pickupCityName}
                {b.dropCityName ? ` → ${b.dropCityName}` : ''}
                {b.route && <span className="block text-xs font-normal text-slate-500">{b.route.distanceKm} km · {formatDuration(b.route.durationMinutes)}</span>}
              </Row>
              <Row icon={Clock} label="Pickup">
                {formatDate(b.pickupDate)} at {formatTime(b.pickupTime)}
              </Row>
              <Row icon={Clock} label="Return">
                {b.returnDate ? formatDate(b.returnDate) : b.bookingType === 'local' ? `Trip ends ~${formatDateTime(b.tripEndAt)}` : 'One-way'}
              </Row>
              <Row icon={MapPin} label="Pickup address">{b.pickupAddress}</Row>
              <Row icon={MapPin} label="Drop address">{b.dropAddress}</Row>
              <Row icon={Car} label="Car">
                {b.categoryName || 'Any category'} · {b.selectedVehicleName || 'Any car'} · {AC_LABEL[b.acPreference]}
              </Row>
              <Row icon={Users} label="Passengers">{b.passengers}</Row>
            </div>
            {b.instructions && (
              <div className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
                <span className="font-semibold">Customer instructions: </span>
                {b.instructions}
              </div>
            )}
          </Section>

          <Section title="Fare (snapshot at booking time)">
            <FareBreakdown fare={b.fare} />
            <p className="mt-3 text-xs text-slate-400">
              Rate source: {titleCase(b.fare.rateSource || '')} · Calculated {formatDateTime(b.fare.calculatedAt)}. Changing pricing later does not modify this booking.
            </p>
          </Section>

          <Section title="Payments">
            <div className="mb-5 grid grid-cols-3 gap-3 text-center">
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Payable</p>
                <p className="font-display text-lg font-semibold">{formatINR(b.finalAmount ?? b.fare.total)}</p>
              </div>
              <div className="rounded-xl bg-emerald-50 p-3">
                <p className="text-xs text-emerald-700">Paid</p>
                <p className="font-display text-lg font-semibold text-emerald-700">{formatINR(b.payment.amountPaid)}</p>
              </div>
              <div className="rounded-xl bg-amber-50 p-3">
                <p className="text-xs text-amber-700">Pending</p>
                <p className="font-display text-lg font-semibold text-amber-700">{formatINR(b.payment.pendingAmount)}</p>
              </div>
            </div>
            {payments.length > 0 && (
              <ul className="mb-5 divide-y divide-slate-100 rounded-xl border border-slate-200">
                {payments.map((p) => (
                  <li key={p._id} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
                    <div>
                      <p className="font-semibold">
                        <span className={p.type === 'refund' ? 'text-rose-600' : 'text-emerald-700'}>
                          {p.type === 'refund' ? '−' : '+'}
                          {formatINR(p.amount)}
                        </span>{' '}
                        · {p.method}
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatDate(p.paidAt)}
                        {p.reference ? ` · Ref ${p.reference}` : ''}
                        {p.collectedBy ? ` · by ${p.collectedBy}` : ''}
                        {p.notes ? ` · ${p.notes}` : ''}
                      </p>
                    </div>
                    <Button size="icon" variant="ghost" className="text-rose-600" title="Delete payment" onClick={() => deletePayment(p._id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            {b.status !== 'rejected' && <RecordPaymentForm booking={b} onSaved={() => reload()} />}
          </Section>
        </div>

        <div className="space-y-6">
          <Section title="Customer">
            <Row icon={User} label="Name">
              {b.customer ? <Link to={`/admin/customers?search=${encodeURIComponent(b.customerPhone)}`} className="hover:text-primary">{b.customerName}</Link> : b.customerName}
            </Row>
            <Row icon={Phone} label="Phone">
              <a href={`tel:${b.customerPhone}`} className="hover:text-primary">{b.customerPhone}</a>
            </Row>
            <Row icon={Mail} label="Email">{b.customerEmail}</Row>
            {b.customer?.totalBookings > 1 && <p className="mt-1 text-xs text-slate-500">Repeat customer · {b.customer.totalBookings} bookings</p>}
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" variant="outline" icon={Phone} href={`tel:${b.customerPhone}`}>Call</Button>
              {customerWhatsappUrl && (
                <Button size="sm" variant="whatsapp" icon={MessageCircle} href={customerWhatsappUrl} target="_blank" rel="noreferrer">
                  WhatsApp
                </Button>
              )}
              {whatsappUrl && (
                <Button size="sm" variant="ghost" href={whatsappUrl} target="_blank" rel="noreferrer" title="Open the booking summary message">
                  Summary msg
                </Button>
              )}
            </div>
          </Section>

          <Section title="Vehicle & driver">
            <AssignPanel booking={b} onSaved={(u) => mergeBooking(u) || reload()} />
            {(b.assignedVehicle || b.assignedDriver) && (
              <div className="mt-4 space-y-1 border-t border-slate-100 pt-3">
                {b.assignedVehicle && <Row icon={Car} label="Assigned vehicle">{b.assignedVehicle.name} {b.assignedVehicle.registrationNumber && `(${b.assignedVehicle.registrationNumber})`}</Row>}
                {b.assignedDriver && <Row icon={UserSquare2} label="Assigned driver">{b.assignedDriver.fullName} · <a href={`tel:${b.assignedDriver.phone}`} className="text-primary">{b.assignedDriver.phone}</a></Row>}
              </div>
            )}
          </Section>

          <Section title="Admin notes & final amount">
            <div className="space-y-3">
              <Field label="Final amount (₹)" hint={`Estimated ${formatINR(b.fare.total)}. Set after the trip if actual charges differ.`}>
                <Input type="number" min="0" value={finalAmount} onChange={(e) => setFinalAmount(e.target.value)} />
              </Field>
              <Field label="Internal notes">
                <Textarea rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} />
              </Field>
              <Button onClick={saveNotes} loading={busy && !action}>Save</Button>
            </div>
          </Section>

          <Section title="Status history">
            <ol className="relative space-y-4 border-l border-slate-200 pl-5">
              {[...b.statusHistory].reverse().map((h, i) => (
                <li key={`${h.changedAt}-${i}`} className="relative">
                  <span className="absolute -left-[27px] top-0.5 grid h-4 w-4 place-items-center rounded-full bg-white ring-2 ring-primary">
                    <CheckCircle2 className="h-3 w-3 text-primary" />
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={h.status} />
                    <span className="text-xs text-slate-500">{formatDateTime(h.changedAt)}</span>
                  </div>
                  {h.note && <p className="mt-1 text-sm text-slate-600">{h.note}</p>}
                  {h.changedByName && <p className="text-xs text-slate-400">by {h.changedByName}</p>}
                </li>
              ))}
            </ol>
            {b.cancellationReason && <p className="mt-3 text-sm text-rose-600">Cancellation reason: {b.cancellationReason}</p>}
            {b.rejectionReason && <p className="mt-3 text-sm text-rose-600">Rejection reason: {b.rejectionReason}</p>}
          </Section>
        </div>
      </div>

      <Modal
        open={Boolean(action)}
        onClose={() => {
          setAction(null);
          setStatusConflicts([]);
        }}
        title={action ? `${ACTION_LABEL[action]}?` : ''}
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setAction(null)}>Back</Button>
            <Button variant={ACTION_STYLE[action] === 'outline' ? 'primary' : ACTION_STYLE[action]} loading={busy} onClick={changeStatus}>
              {ACTION_LABEL[action]}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-slate-600">
            Status will change from <b>{titleCase(b.status)}</b> to <b>{titleCase(action || '')}</b>. The change is recorded with a timestamp.
          </p>
          {['approved', 'confirmed', 'in_progress'].includes(action) && (
            <p className="text-xs text-slate-500">The assigned (or customer-selected) vehicle and driver are checked for overlapping bookings.</p>
          )}
          <Field label={['rejected', 'cancelled'].includes(action) ? 'Reason' : 'Note (optional)'}>
            <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
          {statusConflicts.length > 0 && (
            <Alert tone="error">
              <ul className="list-disc pl-4">
                {statusConflicts.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </Alert>
          )}
        </div>
      </Modal>

      <ConfirmDialog
        open={deleting}
        onClose={() => setDeleting(false)}
        onConfirm={deleteBooking}
        loading={busy}
        title="Delete booking?"
        message="The booking and its payment records will be permanently deleted."
      />
    </div>
  );
}
