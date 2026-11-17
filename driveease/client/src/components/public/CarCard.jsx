import { Link } from 'react-router-dom';
import { Briefcase, Check, Fuel, Snowflake, Users } from 'lucide-react';
import { SmartImage } from '../ui/Misc';
import { Button } from '../ui/Button';
import { AC_LABEL, formatINR, titleCase } from '../../utils/format';

/**
 * Car card. `estimate` = { available, total, reason } from the server for the
 * current trip; without it we show the "from ₹X/km" starting rate.
 */
export function CarCard({ car, estimate, selected, onSelect, actionLabel = 'Select car', to }) {
  const unavailable = estimate ? !estimate.available : car.available === false;
  return (
    <div
      className={`group flex flex-col overflow-hidden rounded-2xl border bg-white transition ${
        selected ? 'border-primary shadow-lift ring-2 ring-primary/20' : 'border-slate-200/80 shadow-soft hover:-translate-y-0.5 hover:shadow-lift'
      } ${unavailable ? 'opacity-70' : ''}`}
    >
      <div className="relative">
        <SmartImage src={car.images?.[0]} alt={car.name} className="aspect-[16/10] w-full transition duration-500 group-hover:scale-[1.03]" />
        <span className="absolute left-3 top-3 chip bg-white/95 text-slate-700 shadow-sm">{car.category?.name}</span>
        {selected && (
          <span className="absolute right-3 top-3 grid h-7 w-7 place-items-center rounded-full bg-primary text-white shadow">
            <Check className="h-4 w-4" />
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="text-lg font-semibold leading-tight">{car.name}</h3>
        <p className="text-xs text-slate-500">
          {car.brand} {car.model}
        </p>
        <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs text-slate-600">
          <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5 text-slate-400" />{car.seatingCapacity} seats</span>
          <span className="flex items-center gap-1.5"><Briefcase className="h-3.5 w-3.5 text-slate-400" />{car.luggageCapacity} bags</span>
          <span className="flex items-center gap-1.5"><Snowflake className="h-3.5 w-3.5 text-slate-400" />{AC_LABEL[car.acType]}</span>
          <span className="flex items-center gap-1.5"><Fuel className="h-3.5 w-3.5 text-slate-400" />{titleCase(car.fuelType)}</span>
        </div>
        <div className="mt-auto flex items-end justify-between gap-3 pt-4">
          <div>
            {estimate?.available ? (
              <>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Estimated fare</p>
                <p className="font-display text-xl font-semibold text-ink">{formatINR(estimate.total)}</p>
              </>
            ) : estimate && !estimate.available ? (
              <p className="text-xs font-semibold text-rose-600">{estimate.reason}</p>
            ) : car.startingRate ? (
              <>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Starting from</p>
                <p className="font-display text-xl font-semibold text-ink">
                  ₹{car.startingRate}
                  <span className="text-sm font-medium text-slate-500">/km</span>
                </p>
              </>
            ) : (
              <p className="text-xs text-slate-500">Get a quote</p>
            )}
          </div>
          {(onSelect || to) && (
            <Button size="sm" variant={selected ? 'dark' : 'primary'} disabled={unavailable} onClick={onSelect} to={unavailable ? undefined : to}>
              {selected ? 'Selected' : actionLabel}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export function CategoryCard({ category, selected, onSelect, to, rate }) {
  const Comp = onSelect ? 'button' : 'div';
  return (
    <Comp
      type={onSelect ? 'button' : undefined}
      onClick={onSelect}
      className={`group relative flex w-full flex-col overflow-hidden rounded-2xl border bg-white text-left transition ${
        selected ? 'border-primary shadow-lift ring-2 ring-primary/20' : 'border-slate-200/80 shadow-soft hover:-translate-y-0.5 hover:shadow-lift'
      }`}
    >
      <SmartImage src={category.image} alt={category.name} className="aspect-[16/9] w-full" />
      <div className="p-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-base font-semibold">{category.name}</h3>
          {selected && <Check className="h-4 w-4 text-primary" />}
        </div>
        <p className="mt-0.5 text-xs text-slate-500">
          {category.seatingCapacity ? `Up to ${category.seatingCapacity} seats` : ''}
          {category.luggageCapacity ? ` · ${category.luggageCapacity} bags` : ''}
        </p>
        {(rate || category.startingPrice) && (
          <p className="mt-2 text-sm font-semibold text-primary">{rate ? `Est. ${formatINR(rate)}` : `From ${formatINR(category.startingPrice)}`}</p>
        )}
        {to && <Link to={to} className="absolute inset-0" aria-label={category.name} />}
      </div>
    </Comp>
  );
}
