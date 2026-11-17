import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Ban, Search, Users } from 'lucide-react';
import { useDebounce, useFetch } from '../../hooks/useFetch';
import { errorMessage, get, put, del } from '../../services/api';
import { Button } from '../../components/ui/Button';
import { Field, Input, Textarea, Toggle } from '../../components/ui/Form';
import { Badge, EmptyState, ErrorState, Skeleton, Spinner, StatusBadge } from '../../components/ui/Feedback';
import { ConfirmDialog, Modal } from '../../components/ui/Modal';
import { PageHeader, Pagination } from '../../components/ui/Misc';
import { bookingRouteLabel, formatDate, formatINR } from '../../utils/format';

function CustomerModal({ id, onClose, onChanged }) {
  const [data, setData] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(false);

  useEffect(() => {
    if (!id) return;
    setData(null);
    get(`/admin/customers/${id}`)
      .then((d) => {
        setData(d);
        setForm({ name: d.customer.name, email: d.customer.email || '', notes: d.customer.notes || '', isBlocked: d.customer.isBlocked });
      })
      .catch((e) => toast.error(errorMessage(e)));
  }, [id]);

  const save = async () => {
    setSaving(true);
    try {
      await put(`/admin/customers/${id}`, form);
      toast.success('Customer updated');
      onChanged();
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    setSaving(true);
    try {
      await del(`/admin/customers/${id}`);
      toast.success('Customer deleted');
      onChanged();
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
      setConfirm(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={Boolean(id)}
      onClose={onClose}
      title={data?.customer?.name || 'Customer'}
      description={data?.customer?.phone}
      size="lg"
      footer={
        data && (
          <>
            <Button variant="ghost" className="mr-auto text-rose-600" onClick={() => setConfirm(true)}>Delete</Button>
            <Button variant="outline" onClick={onClose}>Close</Button>
            <Button loading={saving} onClick={save}>Save</Button>
          </>
        )
      }
    >
      {!data ? (
        <div className="grid place-items-center py-10"><Spinner /></div>
      ) : (
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Name"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label="Email"><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
            <Field label="Notes" className="sm:col-span-2"><Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
            <div className="sm:col-span-2">
              <Toggle checked={form.isBlocked} onChange={(v) => setForm({ ...form, isBlocked: v })} label="Block online bookings" description="Blocked customers cannot submit new booking requests from the website." />
            </div>
          </div>
          <div>
            <h4 className="mb-2 text-sm font-semibold">Booking history ({data.bookings.length})</h4>
            {!data.bookings.length ? (
              <p className="text-sm text-slate-500">No bookings.</p>
            ) : (
              <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                {data.bookings.map((b) => (
                  <li key={b._id}>
                    <Link to={`/admin/bookings/${b._id}`} className="flex items-center justify-between gap-3 px-3 py-2.5 hover:bg-slate-50">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold">{b.bookingRef}</p>
                        <p className="truncate text-xs text-slate-500">{bookingRouteLabel(b)} · {formatDate(b.pickupDate)}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="text-sm font-semibold">{formatINR(b.finalAmount ?? b.fare?.total)}</span>
                        <StatusBadge status={b.status} />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
      <ConfirmDialog open={confirm} onClose={() => setConfirm(false)} onConfirm={remove} loading={saving} title="Delete customer?" message="Customers with bookings cannot be deleted — block them instead." />
    </Modal>
  );
}

export default function CustomersPage() {
  const [params] = useSearchParams();
  const [search, setSearch] = useState(params.get('search') || '');
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState(null);
  const debounced = useDebounce(search);
  const { data, loading, error, reload } = useFetch('/admin/customers', { page, search: debounced || undefined });
  useEffect(() => setPage(1), [debounced]);

  return (
    <div>
      <PageHeader title="Customers" description="Customers are created automatically from booking requests (matched by phone number)." />
      <div className="card overflow-hidden">
        <div className="border-b border-slate-100 p-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input className="input pl-9" placeholder="Search name, phone or email…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
        {error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : loading && !data ? (
          <div className="space-y-2 p-4">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : !data.items.length ? (
          <EmptyState icon={Users} title={debounced ? 'No matches' : 'No customers yet'} />
        ) : (
          <div className="scrollbar-thin overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-slate-50/80 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3">Bookings</th>
                  <th className="px-4 py-3">Total paid</th>
                  <th className="px-4 py-3">Last booking</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.items.map((c) => (
                  <tr key={c._id} onClick={() => setOpenId(c._id)} className="cursor-pointer hover:bg-slate-50/70">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-ink">{c.name}</p>
                      {c.isBlocked && <Badge className="mt-1 bg-rose-50 text-rose-700 ring-rose-200"><Ban className="h-3 w-3" />Blocked</Badge>}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <p>{c.phone}</p>
                      <p className="text-xs text-slate-500">{c.email || '—'}</p>
                    </td>
                    <td className="px-4 py-3">{c.totalBookings} <span className="text-xs text-slate-500">({c.completedBookings} completed)</span></td>
                    <td className="px-4 py-3 font-semibold">{formatINR(c.totalPaid)}</td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(c.lastBookingAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination pagination={data?.pagination} onPage={setPage} />
      </div>
      <CustomerModal id={openId} onClose={() => setOpenId(null)} onChanged={reload} />
    </div>
  );
}
