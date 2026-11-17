import toast from 'react-hot-toast';
import { CheckCircle2, Copy, MessageCircle, Phone, Search } from 'lucide-react';
import { useSite } from '../../context/SiteContext';
import { Button } from '../ui/Button';
import { Alert } from '../ui/Feedback';
import { FareBreakdown } from '../FareBreakdown';
import { formatDate, formatTime, TRIP_LABEL, AC_LABEL } from '../../utils/format';

export function BookingSuccess({ result, phone, onNew }) {
  const { settings, company } = useSite();
  const { booking: b, whatsappUrl } = result;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(b.bookingRef);
      toast.success('Reference copied');
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="mx-auto max-w-2xl animate-fade-up">
      <div className="card overflow-hidden">
        <div className="bg-gradient-to-br from-primary to-primary-dark px-6 py-8 text-center text-white">
          <CheckCircle2 className="mx-auto h-12 w-12" />
          <h1 className="mt-3 font-display text-2xl font-semibold text-white">Booking request received</h1>
          <p className="mt-1 text-sm text-white/80">{settings.booking?.confirmationMessage || `Our team will review your request and confirm shortly.`}</p>
          <button type="button" onClick={copy} className="mx-auto mt-5 flex items-center gap-2 rounded-xl bg-white/15 px-4 py-2 font-mono text-lg font-semibold tracking-wider hover:bg-white/25">
            {b.bookingRef} <Copy className="h-4 w-4" />
          </button>
          <p className="mt-1 text-xs text-white/70">Your booking reference</p>
        </div>

        <div className="space-y-6 p-6">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-sm font-semibold text-emerald-900">Your booking is saved. Status: Pending review.</p>
            {whatsappUrl ? (
              <>
                <p className="mt-1 text-sm text-emerald-800">
                  To speed things up, send your booking details to {company} on WhatsApp. The message is pre-filled — it is only sent when you press <b>Send</b> in WhatsApp.
                </p>
                <Button variant="whatsapp" icon={MessageCircle} href={whatsappUrl} target="_blank" rel="noreferrer" className="mt-3 w-full sm:w-auto">
                  Send booking details on WhatsApp
                </Button>
              </>
            ) : (
              settings.contact?.phone && (
                <Button variant="outline" icon={Phone} href={`tel:${settings.contact.phone}`} className="mt-3">
                  Call {settings.contact.phone}
                </Button>
              )
            )}
          </div>

          <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
            <div><dt className="text-slate-500">Trip</dt><dd className="font-semibold">{b.bookingType === 'local' ? `Local · ${b.localPackage?.name || ''}` : `${TRIP_LABEL[b.tripType]} · ${b.pickupCityName} → ${b.dropCityName}`}</dd></div>
            <div><dt className="text-slate-500">Pickup</dt><dd className="font-semibold">{formatDate(b.pickupDate)}, {formatTime(b.pickupTime)}</dd></div>
            {b.returnDate && <div><dt className="text-slate-500">Return</dt><dd className="font-semibold">{formatDate(b.returnDate)}</dd></div>}
            <div><dt className="text-slate-500">Car</dt><dd className="font-semibold">{b.selectedVehicleName || b.categoryName || 'Any available'} · {AC_LABEL[b.acPreference]}</dd></div>
            <div><dt className="text-slate-500">Passengers</dt><dd className="font-semibold">{b.passengers}</dd></div>
          </dl>

          <div className="rounded-2xl bg-slate-50 p-4">
            <FareBreakdown fare={b.fare} />
          </div>

          <Alert tone="info">
            No advance payment is needed. Pay the driver or our office in {(settings.paymentMethods || ['Cash', 'UPI']).join(' / ')}
            {settings.upiId ? ` (UPI: ${settings.upiId})` : ''}. Final charges may vary with actual distance, tolls and waiting time.
          </Alert>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" icon={Search} to={`/track?ref=${b.bookingRef}&phone=${encodeURIComponent(phone || '')}`}>
              Track this booking
            </Button>
            <Button variant="ghost" onClick={onNew}>
              Make another booking
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
