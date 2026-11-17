import { useMemo, useState } from 'react';
import { CarFront, Search } from 'lucide-react';
import { CarCard, CategoryCard } from './CarCard';
import { EmptyState } from '../ui/Feedback';

const catId = (car) => car.category?._id || car.category;

/**
 * Car selection honouring admin display settings:
 *  - carSelectionEnabled=false → categories only
 *  - mode 'categories_first'   → pick a category, then (optionally) a car in it
 *  - mode 'all_cars'           → all cars with search + category filter
 */
export function CarSelector({ mode, carSelectionEnabled, categories, vehicles, estimates, category, vehicle, onChange, passengers }) {
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('');

  const categoryEstimate = useMemo(() => {
    if (!estimates) return {};
    const out = {};
    vehicles.forEach((v) => {
      const e = estimates[v._id];
      if (e?.available && (out[catId(v)] === undefined || e.total < out[catId(v)])) out[catId(v)] = e.total;
    });
    return out;
  }, [estimates, vehicles]);

  const fits = (c) => !c.seatingCapacity || !passengers || passengers <= c.seatingCapacity;

  const categoryGrid = (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
      {categories.map((c) => (
        <CategoryCard
          key={c._id}
          category={c}
          rate={categoryEstimate[c._id]}
          selected={category === c._id}
          onSelect={() => onChange({ category: category === c._id ? '' : c._id, vehicle: '' })}
        />
      ))}
      {!categories.length && <p className="col-span-full text-sm text-slate-500">No car categories available.</p>}
    </div>
  );

  if (!carSelectionEnabled || !vehicles.length) {
    return (
      <div className="space-y-3">
        {categoryGrid}
        {categories.some((c) => !fits(c)) && <p className="text-xs text-slate-500">Some categories may not fit {passengers} passengers.</p>}
      </div>
    );
  }

  if (mode === 'categories_first') {
    const inCategory = vehicles.filter((v) => catId(v) === category);
    return (
      <div className="space-y-5">
        {categoryGrid}
        {category && (
          <div className="animate-fade-up">
            <p className="mb-3 text-sm font-semibold text-slate-700">Choose a car (optional)</p>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <button
                type="button"
                onClick={() => onChange({ category, vehicle: '' })}
                className={`flex min-h-[160px] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-4 text-center transition ${
                  !vehicle ? 'border-primary bg-primary-light text-primary' : 'border-slate-200 text-slate-500 hover:border-slate-300'
                }`}
              >
                <CarFront className="h-8 w-8" />
                <span className="text-sm font-semibold">Any available {categories.find((c) => c._id === category)?.name}</span>
                {categoryEstimate[category] && <span className="text-xs">from ₹{categoryEstimate[category].toLocaleString('en-IN')}</span>}
              </button>
              {inCategory.map((car) => (
                <CarCard key={car._id} car={car} estimate={estimates?.[car._id]} selected={vehicle === car._id} onSelect={() => onChange({ category, vehicle: vehicle === car._id ? '' : car._id })} />
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  const q = search.trim().toLowerCase();
  const shown = vehicles.filter(
    (v) => (!filterCat || catId(v) === filterCat) && (!q || `${v.name} ${v.brand} ${v.model} ${v.category?.name}`.toLowerCase().includes(q)),
  );
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input className="input pl-9" placeholder="Search cars…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>
      <div className="scrollbar-thin -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {[{ _id: '', name: 'All' }, ...categories].map((c) => (
          <button
            key={c._id || 'all'}
            type="button"
            onClick={() => setFilterCat(c._id)}
            className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-semibold transition ${filterCat === c._id ? 'bg-ink text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200'}`}
          >
            {c.name}
          </button>
        ))}
      </div>
      {!shown.length ? (
        <EmptyState icon={CarFront} title="No cars match" description="Try another search or category." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {shown.map((car) => (
            <CarCard
              key={car._id}
              car={car}
              estimate={estimates?.[car._id]}
              selected={vehicle === car._id}
              onSelect={() => onChange(vehicle === car._id ? { category: '', vehicle: '' } : { category: catId(car), vehicle: car._id })}
            />
          ))}
        </div>
      )}
    </div>
  );
}
