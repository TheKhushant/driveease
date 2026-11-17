import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Wallet } from 'lucide-react';
import { useDebounce, useFetch } from '../../hooks/useFetch';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Form';
import { EmptyState, ErrorState, Skeleton, StatusBadge } from '../../components/ui/Feedback';
import { Modal } from '../../components/ui/Modal';
import { PageHeader, Pagination, StatCard, Tabs } from '../../components/ui/Misc';
import { RecordPaymentForm } from '../../components/admin/RecordPaymentForm';
import { useSite } from '../../context/SiteContext';
import { formatDate, formatINR, titleCase } from '../../utils/format';

function Outstanding({ onRecord, version }) {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('unpaid,partially_paid');
  const [search, setSearch] = useState('');
  const debounced = useDebounce(search);
  const { data, loading, error, reload } = useFetch('/admin/payments/bookings', { page, paymentStatus: status || undefined, search: debounced || undefined, v: version });
  useEffect(() => setPage(1), [status, debounced]);

  return (
    <>
      {data?.summary && (
        <div className="mb-4 grid gap-3 sm:grid-cols-2">
          <StatCard label="Collected (active bookings)" value={formatINR(data.summary.collected)} icon={Wallet} tone="emerald" />
          <StatCard label="Pending (approved & later)" value={formatINR(data.summary.pending)} icon={Wallet} tone="amber" />
        </div>
      )}
      <div className="card overflow-hidden">
        <div className="flex flex-col gap-2 border-b border-slate-100 p-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input className="input pl-9" placeholder="Search ref, name, phone…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select
            className="sm:w-56"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            options={[
              { value: 'unpaid,partially_paid', label: 'Unpaid & partially paid' },
              { value: 'unpaid', label: 'Unpaid' },
              { value: 'partially_paid', label: 'Partially paid' },
              { value: 'paid', label: 'Paid' },
              { value: '', label: 'All' },
            ]}
          />
        </div>
        {error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : loading && !data ? (
          <div className="space-y-2 p-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : !data.items.length ? (
          <EmptyState icon={Wallet} title="Nothing here" description="No bookings match this payment status." />
        ) : (
          <div className="scrollbar-thin overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-slate-50/80 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Booking</th>
                  <th className="px-4 py-3">Pickup</th>
                  <th className="px-4 py-3 text-right">Payable</th>
                  <th className="px-4 py-3 text-right">Paid</th>
                  <th className="px-4 py-3 text-right">Pending</th>
                  <th className="px-4 py-3">Payment</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.items.map((b) => (
                  <tr key={b._id}>
                    <td className="px-4 py-3">
                      <Link to={`/admin/bookings/${b._id}`} className="font-semibold text-ink hover:text-primary">{b.bookingRef}</Link>
                      <p className="text-xs text-slate-500">{b.customerName} · {b.customerPhone}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {formatDate(b.pickupDate)} <StatusBadge status={b.status} />
                    </td>
                    <td className="px-4 py-3 text-right font-medium">{formatINR(b.finalAmount ?? b.fare?.total)}</td>
                    <td className="px-4 py-3 text-right text-emerald-700">{formatINR(b.payment.amountPaid)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-amber-700">{formatINR(b.payment.pendingAmount)}</td>
                    <td className="px-4 py-3"><StatusBadge status={b.payment.status} /></td>
                    <td className="px-4 py-3 text-right">
                      <Button size="xs" variant="outline" icon={Plus} onClick={() => onRecord(b)}>Record</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination pagination={data?.pagination} onPage={setPage} />
      </div>
    </>
  );
}

function Transactions({ version }) {
  const { settings } = useSite() || {};
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({});
  const { data, loading, error, reload } = useFetch('/admin/payments', { page, ...filters, v: version });
  const set = (k, v) => {
    setPage(1);
    setFilters((f) => ({ ...f, [k]: v || undefined }));
  };

  return (
    <div className="card overflow-hidden">
      <div className="grid gap-2 border-b border-slate-100 p-3 sm:grid-cols-5">
        <input className="input sm:col-span-2" placeholder="Booking ref…" onChange={(e) => set('search', e.target.value)} />
        <Select placeholder="All methods" options={(settings?.paymentMethods || []).map((m) => ({ value: m, label: m }))} onChange={(e) => set('method', e.target.value)} />
        <input type="date" className="input" onChange={(e) => set('from', e.target.value)} aria-label="From" />
        <input type="date" className="input" onChange={(e) => set('to', e.target.value)} aria-label="To" />
      </div>
      {data?.totals && (
        <div className="flex flex-wrap gap-4 border-b border-slate-100 px-4 py-2 text-sm">
          <span>Received: <b className="text-emerald-700">{formatINR(data.totals.payment || 0)}</b></span>
          <span>Refunded: <b className="text-rose-600">{formatINR(data.totals.refund || 0)}</b></span>
        </div>
      )}
      {error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : loading && !data ? (
        <div className="space-y-2 p-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
      ) : !data.items.length ? (
        <EmptyState icon={Wallet} title="No payments recorded" />
      ) : (
        <div className="scrollbar-thin overflow-x-auto">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead className="bg-slate-50/80 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Booking</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Method</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3">Recorded by</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.items.map((p) => (
                <tr key={p._id}>
                  <td className="px-4 py-3">{formatDate(p.paidAt)}</td>
                  <td className="px-4 py-3">
                    {p.booking ? <Link to={`/admin/bookings/${p.booking._id}`} className="font-semibold hover:text-primary">{p.booking.bookingRef}</Link> : p.bookingRef}
                    <p className="text-xs text-slate-500">{p.booking?.customerName}</p>
                  </td>
                  <td className="px-4 py-3">{titleCase(p.type)}</td>
                  <td className="px-4 py-3">{p.method}{p.reference && <p className="text-xs text-slate-500">{p.reference}</p>}</td>
                  <td className={`px-4 py-3 text-right font-semibold ${p.type === 'refund' ? 'text-rose-600' : 'text-emerald-700'}`}>
                    {p.type === 'refund' ? '−' : ''}{formatINR(p.amount)}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{p.recordedBy?.name}{p.collectedBy && <p>Collected: {p.collectedBy}</p>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination pagination={data?.pagination} onPage={setPage} />
    </div>
  );
}

export default function PaymentsPage() {
  const [tab, setTab] = useState('outstanding');
  const [recording, setRecording] = useState(null);
  const [version, setVersion] = useState(0);
  return (
    <div>
      <PageHeader title="Payments" description="Offline payments only (cash, UPI and other methods configured in Website Settings). No online payment gateway is used." />
      <Tabs tabs={[{ value: 'outstanding', label: 'Booking balances' }, { value: 'transactions', label: 'Transactions' }]} value={tab} onChange={setTab} />
      {tab === 'outstanding' ? <Outstanding onRecord={setRecording} version={version} /> : <Transactions version={version} />}
      <Modal open={Boolean(recording)} onClose={() => setRecording(null)} title={`Record payment · ${recording?.bookingRef || ''}`}>
        {recording && (
          <RecordPaymentForm
            booking={recording}
            onSaved={() => {
              setRecording(null);
              setVersion((v) => v + 1);
            }}
          />
        )}
      </Modal>
    </div>
  );
}
