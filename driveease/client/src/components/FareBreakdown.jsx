import { Info } from 'lucide-react';
import { formatINR } from '../utils/format';

/** Transparent fare breakdown (used on the booking form, confirmation and admin). */
export function FareBreakdown({ fare, compact = false, title = 'Fare breakdown' }) {
  if (!fare) return null;
  return (
    <div>
      {!compact && <h4 className="mb-3 text-sm font-semibold text-ink">{title}</h4>}
      <dl className="space-y-2 text-sm">
        {(fare.items || []).map((i) => (
          <div key={`${i.key}-${i.label}`} className="flex items-start justify-between gap-3">
            <dt className="text-slate-600">
              {i.label}
              {i.note && <span className="block text-xs text-slate-400">{i.note}</span>}
            </dt>
            <dd className={`shrink-0 font-medium ${i.amount < 0 ? 'text-emerald-600' : 'text-slate-800'}`}>{formatINR(i.amount)}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-3 flex items-center justify-between border-t border-dashed border-slate-200 pt-3">
        <span className="text-sm font-semibold text-ink">Estimated total</span>
        <span className="font-display text-2xl font-semibold text-primary">{formatINR(fare.total)}</span>
      </div>
      {!compact && fare.notes?.length > 0 && (
        <ul className="mt-3 space-y-1 rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
          {fare.notes.map((n) => (
            <li key={n} className="flex gap-1.5">
              <Info className="mt-0.5 h-3 w-3 shrink-0" />
              {n}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
