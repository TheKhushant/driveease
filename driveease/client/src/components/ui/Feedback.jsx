import { AlertTriangle, Inbox, Loader2, RefreshCw } from 'lucide-react';
import { STATUS_STYLES, titleCase } from '../../utils/format';

export const Spinner = ({ className = 'h-5 w-5' }) => <Loader2 className={`animate-spin text-primary ${className}`} />;

export function PageLoader({ label = 'Loading…' }) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-slate-500">
      <Spinner className="h-8 w-8" />
      <span className="text-sm">{label}</span>
    </div>
  );
}

export function Skeleton({ className = '' }) {
  return <div className={`animate-pulse rounded-xl bg-slate-200/70 ${className}`} />;
}

export function EmptyState({ icon: Icon = Inbox, title = 'Nothing here yet', description, action }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-primary-light text-primary">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="text-base font-semibold text-ink">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ message = 'Something went wrong', onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-rose-50 text-rose-600">
        <AlertTriangle className="h-6 w-6" />
      </div>
      <h3 className="text-base font-semibold text-ink">Couldn&apos;t load this</h3>
      <p className="mt-1 max-w-sm text-sm text-slate-500">{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="mt-5 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50">
          <RefreshCw className="h-4 w-4" /> Try again
        </button>
      )}
    </div>
  );
}

export function Alert({ tone = 'info', children, className = '' }) {
  const tones = {
    info: 'bg-sky-50 text-sky-800 ring-sky-200',
    warn: 'bg-amber-50 text-amber-800 ring-amber-200',
    error: 'bg-rose-50 text-rose-800 ring-rose-200',
    success: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  };
  return <div className={`rounded-xl px-4 py-3 text-sm ring-1 ${tones[tone]} ${className}`}>{children}</div>;
}

export function Badge({ children, className = 'bg-slate-100 text-slate-700 ring-slate-200' }) {
  return <span className={`chip ring-1 ring-inset ${className}`}>{children}</span>;
}

export const StatusBadge = ({ status }) => (
  <Badge className={STATUS_STYLES[status] || 'bg-slate-100 text-slate-700 ring-slate-200'}>{titleCase(status || '')}</Badge>
);

export const ActiveBadge = ({ active, on = 'Active', off = 'Inactive' }) => (
  <Badge className={active ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-slate-100 text-slate-500 ring-slate-200'}>
    {active ? on : off}
  </Badge>
);
