/**
 * Admin CRUD screens built on ResourceManager: categories, cities, routes, local
 * packages, seasonal pricing rules and testimonials.
 */
import { Eye, EyeOff, LayoutGrid, MapPin, MessageSquareQuote, Package, Route as RouteIcon, Star, BadgePercent } from 'lucide-react';
import { ResourceManager } from '../../components/admin/ResourceManager';
import { ActiveBadge, Badge } from '../../components/ui/Feedback';
import { SmartImage } from '../../components/ui/Misc';
import { formatDate, formatDuration, formatINR, titleCase, DAY_NAMES } from '../../utils/format';
import { activeFilter, bookingTypeScope, fuelOptions } from './options';

export function CategoriesPage() {
  return (
    <ResourceManager
      title="Car Categories"
      description="Group cars into categories. Hidden categories (and their cars) are not shown on the website."
      endpoint="/admin/categories"
      singular="category"
      emptyIcon={LayoutGrid}
      defaultSort="displayOrder"
      filters={[activeFilter]}
      columns={[
        {
          key: 'name',
          label: 'Category',
          render: (r) => (
            <div className="flex items-center gap-3">
              <SmartImage src={r.image} className="h-10 w-14 rounded-lg" iconClass="h-5 w-5" />
              <div>
                <p className="font-semibold text-ink">{r.name}</p>
                <p className="text-xs text-slate-500">/{r.slug}</p>
              </div>
            </div>
          ),
        },
        { key: 'seatingCapacity', label: 'Seats', render: (r) => r.seatingCapacity || '—' },
        { key: 'startingPrice', label: 'Starting at', render: (r) => (r.startingPrice ? formatINR(r.startingPrice) : '—') },
        { key: 'displayOrder', label: 'Order' },
        {
          key: 'isVisible',
          label: 'Website',
          render: (r) => (r.isVisible ? <Badge className="bg-emerald-50 text-emerald-700 ring-emerald-200"><Eye className="h-3 w-3" />Visible</Badge> : <Badge><EyeOff className="h-3 w-3" />Hidden</Badge>),
        },
        { key: 'isActive', label: 'Status', render: (r) => <ActiveBadge active={r.isActive} /> },
      ]}
      fields={[
        { name: 'name', label: 'Name', required: true, placeholder: 'e.g. Sedan' },
        { name: 'displayOrder', label: 'Display order', type: 'number', default: 0 },
        { name: 'seatingCapacity', label: 'Max seating', type: 'number', min: 1 },
        { name: 'luggageCapacity', label: 'Luggage (bags)', type: 'number', min: 0 },
        { name: 'startingPrice', label: 'Starting price shown (₹)', type: 'number', min: 0, hint: 'Optional display price' },
        { name: 'description', label: 'Description', type: 'textarea' },
        { name: 'image', label: 'Image', type: 'image', folder: 'categories', span: 2 },
        { name: 'isVisible', label: 'Show on website', type: 'checkbox', default: true },
        { name: 'isActive', label: 'Active (bookable)', type: 'checkbox', default: true },
      ]}
    />
  );
}

export function CitiesPage() {
  return (
    <ResourceManager
      title="Cities"
      description="Cities customers can book from or travel to. Popular cities appear in 'Popular destinations'."
      endpoint="/admin/cities"
      singular="city"
      emptyIcon={MapPin}
      defaultSort="displayOrder"
      filters={[activeFilter, { name: 'isPopular', label: 'Popular?', options: [{ value: 'true', label: 'Popular' }, { value: 'false', label: 'Not popular' }] }]}
      columns={[
        {
          key: 'name',
          label: 'City',
          render: (r) => (
            <div className="flex items-center gap-3">
              <SmartImage src={r.image} className="h-10 w-14 rounded-lg" fallbackIcon={MapPin} iconClass="h-5 w-5" />
              <div>
                <p className="font-semibold text-ink">{r.name}</p>
                <p className="text-xs text-slate-500">{r.state}</p>
              </div>
            </div>
          ),
        },
        {
          key: 'services',
          label: 'Services',
          render: (r) => (
            <div className="flex flex-wrap gap-1">
              {r.localServiceAvailable && <Badge>Local</Badge>}
              {r.outstationServiceAvailable && <Badge>Outstation</Badge>}
              {r.airportPickup && <Badge>Airport</Badge>}
            </div>
          ),
        },
        { key: 'isPopular', label: 'Popular', render: (r) => (r.isPopular ? <Star className="h-4 w-4 fill-amber-400 text-amber-400" /> : '—') },
        { key: 'displayOrder', label: 'Order' },
        { key: 'isActive', label: 'Status', render: (r) => <ActiveBadge active={r.isActive} on="Enabled" off="Disabled" /> },
      ]}
      fields={[
        { name: 'name', label: 'City name', required: true },
        { name: 'state', label: 'State' },
        { name: 'description', label: 'Description', type: 'textarea' },
        { name: 'image', label: 'City image', type: 'image', folder: 'cities', span: 2 },
        { name: 'startingFare', label: 'Starting fare shown (₹)', type: 'number', min: 0 },
        { name: 'displayOrder', label: 'Display order', type: 'number', default: 0 },
        { name: 'highlights', label: 'Highlights (comma separated)', type: 'tags', span: 2, placeholder: 'Deekshabhoomi, Futala Lake' },
        { name: 'notes', label: 'Internal notes / city-specific details', type: 'textarea' },
        { name: 'localServiceAvailable', label: 'Local service available', type: 'checkbox', default: true },
        { name: 'outstationServiceAvailable', label: 'Outstation trips available', type: 'checkbox', default: true },
        { name: 'airportPickup', label: 'Airport pickup', type: 'checkbox' },
        { name: 'railwayPickup', label: 'Railway station pickup', type: 'checkbox', default: true },
        { name: 'isPopular', label: 'Popular destination', type: 'checkbox' },
        { name: 'isActive', label: 'Enabled', type: 'checkbox', default: true },
      ]}
    />
  );
}

export function RoutesPage() {
  return (
    <ResourceManager
      title="Routes"
      description="Outstation routes between cities. Customers can only book routes listed here."
      endpoint="/admin/routes"
      singular="route"
      emptyIcon={RouteIcon}
      searchable={false}
      filters={[activeFilter]}
      columns={[
        {
          key: 'route',
          label: 'Route',
          render: (r) => (
            <div>
              <p className="font-semibold text-ink">
                {r.fromCity?.name} {r.isBidirectional ? '⇄' : '→'} {r.toCity?.name}
              </p>
              {r.isPopular && <span className="text-xs text-amber-600">★ Popular</span>}
            </div>
          ),
        },
        { key: 'distanceKm', label: 'Distance', render: (r) => `${r.distanceKm} km` },
        { key: 'durationMinutes', label: 'Duration', render: (r) => formatDuration(r.durationMinutes) },
        { key: 'tollCharges', label: 'Toll (one way)', render: (r) => formatINR(r.tollCharges) },
        {
          key: 'trips',
          label: 'Trips',
          render: (r) => (
            <div className="flex gap-1">
              {r.oneWayAvailable && <Badge>One-way</Badge>}
              {r.roundTripAvailable && <Badge>Round</Badge>}
            </div>
          ),
        },
        { key: 'cats', label: 'Categories', render: (r) => (r.applicableCategories?.length ? r.applicableCategories.map((c) => c.name).join(', ') : 'All') },
        { key: 'isActive', label: 'Status', render: (r) => <ActiveBadge active={r.isActive} /> },
      ]}
      fields={[
        { name: 'fromCity', label: 'Starting city', type: 'select', optionsUrl: '/admin/cities', required: true },
        { name: 'toCity', label: 'Destination city', type: 'select', optionsUrl: '/admin/cities', required: true },
        { name: 'distanceKm', label: 'Distance (KM, one way)', type: 'number', required: true, min: 1 },
        { name: 'durationMinutes', label: 'Travel time (minutes)', type: 'number', required: true, min: 1, hint: 'e.g. 300 = 5 hours' },
        { name: 'tollCharges', label: 'Toll charges, one way (₹)', type: 'number', min: 0, default: 0 },
        { name: 'parkingCharges', label: 'Parking charges (₹)', type: 'number', min: 0, default: 0 },
        { name: 'applicableCategories', label: 'Vehicle categories allowed (none selected = all)', type: 'multiselect', optionsUrl: '/admin/categories' },
        {
          name: 'categoryPricing',
          label: 'Route-specific per-KM rates (override pricing tables; 0 = no override)',
          type: 'rows',
          addLabel: 'Add category rate',
          fields: [
            { name: 'category', label: 'Category', type: 'select', optionsUrl: '/admin/categories', required: true },
            { name: 'perKmRate', label: 'AC ₹/km', type: 'number', min: 0, default: 0 },
            { name: 'nonAcPerKmRate', label: 'Non-AC ₹/km', type: 'number', min: 0, default: 0 },
          ],
        },
        { name: 'description', label: 'Description', type: 'textarea' },
        { name: 'oneWayAvailable', label: 'One-way available', type: 'checkbox', default: true },
        { name: 'roundTripAvailable', label: 'Round-trip available', type: 'checkbox', default: true },
        { name: 'isBidirectional', label: 'Also serve the reverse direction', type: 'checkbox', default: true },
        { name: 'isPopular', label: 'Show as popular route', type: 'checkbox' },
        { name: 'isActive', label: 'Active', type: 'checkbox', default: true },
      ]}
    />
  );
}

export function PackagesPage() {
  return (
    <ResourceManager
      title="Local Packages"
      description="Hourly packages for local bookings, e.g. 8 Hours / 80 KM."
      endpoint="/admin/packages"
      singular="package"
      emptyIcon={Package}
      defaultSort="displayOrder"
      filters={[activeFilter]}
      columns={[
        { key: 'name', label: 'Package', render: (r) => <span className="font-semibold text-ink">{r.name}</span> },
        { key: 'hk', label: 'Includes', render: (r) => `${r.hours} hrs / ${r.km} km` },
        { key: 'basePriceAc', label: 'AC', render: (r) => formatINR(r.basePriceAc) },
        { key: 'basePriceNonAc', label: 'Non-AC', render: (r) => formatINR(r.basePriceNonAc) },
        { key: 'cp', label: 'Category prices', render: (r) => r.categoryPrices?.length || 0 },
        { key: 'cities', label: 'Cities', render: (r) => (r.cities?.length ? r.cities.map((c) => c.name).join(', ') : 'All') },
        { key: 'isActive', label: 'Status', render: (r) => <ActiveBadge active={r.isActive} /> },
      ]}
      fields={[
        { name: 'name', label: 'Package name', required: true, placeholder: '8 Hours / 80 KM' },
        { name: 'displayOrder', label: 'Display order', type: 'number', default: 0 },
        { name: 'hours', label: 'Hours included', type: 'number', required: true, min: 1, max: 24 },
        { name: 'km', label: 'KM included', type: 'number', required: true, min: 1 },
        { name: 'basePriceAc', label: 'Base price AC (₹)', type: 'number', required: true, min: 0 },
        { name: 'basePriceNonAc', label: 'Base price Non-AC (₹)', type: 'number', required: true, min: 0 },
        { name: 'extraKmRate', label: 'Extra KM rate (₹/km)', type: 'number', min: 0, default: 0, hint: '0 = use Pricing Management' },
        { name: 'extraHourRate', label: 'Extra hour rate (₹/hr)', type: 'number', min: 0, default: 0, hint: '0 = use Pricing Management' },
        {
          name: 'categoryPrices',
          label: 'Price per car category (overrides base price; 0 = use base)',
          type: 'rows',
          addLabel: 'Add category price',
          fields: [
            { name: 'category', label: 'Category', type: 'select', optionsUrl: '/admin/categories', required: true },
            { name: 'priceAc', label: 'AC ₹', type: 'number', min: 0, default: 0 },
            { name: 'priceNonAc', label: 'Non-AC ₹', type: 'number', min: 0, default: 0 },
          ],
        },
        { name: 'cities', label: 'Available in cities (none selected = all)', type: 'multiselect', optionsUrl: '/admin/cities' },
        { name: 'description', label: 'Description', type: 'textarea' },
        { name: 'isActive', label: 'Active', type: 'checkbox', default: true },
      ]}
    />
  );
}

const RULE_TYPES = ['weekday', 'saturday', 'sunday', 'weekend', 'festival', 'holiday', 'rainy_season', 'special_event', 'custom'];

const describeAdjustment = (r) =>
  r.adjustmentType === 'percentage'
    ? `${r.adjustmentValue > 0 ? '+' : ''}${r.adjustmentValue}%`
    : r.adjustmentType === 'per_km'
      ? `${r.adjustmentValue > 0 ? '+' : ''}₹${r.adjustmentValue}/km`
      : `${r.adjustmentValue > 0 ? '+' : ''}${formatINR(r.adjustmentValue)} flat`;

export function SeasonalPricingPage() {
  return (
    <ResourceManager
      title="Seasonal Pricing"
      description="Dynamic rules for weekdays, weekends, festivals, holidays, rainy season and events. Only ONE rule applies per booking: the active matching rule with the highest priority (ties → more specific → most recently updated). Rules never stack."
      endpoint="/admin/pricing-rules"
      singular="pricing rule"
      emptyIcon={BadgePercent}
      defaultSort="-priority"
      filters={[activeFilter, { name: 'ruleType', label: 'All types', options: RULE_TYPES.map((t) => ({ value: t, label: titleCase(t) })) }]}
      columns={[
        {
          key: 'name',
          label: 'Rule',
          render: (r) => (
            <div>
              <p className="font-semibold text-ink">{r.name}</p>
              <p className="text-xs text-slate-500">{titleCase(r.ruleType)}</p>
            </div>
          ),
        },
        { key: 'adj', label: 'Adjustment', render: (r) => <span className={`font-semibold ${r.adjustmentValue >= 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{describeAdjustment(r)}</span> },
        {
          key: 'when',
          label: 'When',
          render: (r) => (
            <div className="text-xs text-slate-600">
              {r.startDate || r.endDate ? `${r.startDate ? formatDate(r.startDate) : '…'} → ${r.endDate ? formatDate(r.endDate) : '…'}` : 'Any date'}
              {r.daysOfWeek?.length ? <div>{r.daysOfWeek.map((d) => DAY_NAMES[d]).join(', ')}</div> : null}
            </div>
          ),
        },
        {
          key: 'scope',
          label: 'Applies to',
          render: (r) => (
            <div className="text-xs text-slate-600">
              {titleCase(r.bookingType)} · {r.categories?.length ? r.categories.map((c) => c.name).join(', ') : 'all categories'}
              {r.fuelTypes?.length ? ` · ${r.fuelTypes.join(', ')}` : ''}
            </div>
          ),
        },
        { key: 'priority', label: 'Priority', render: (r) => <Badge className="bg-slate-900 text-white ring-slate-900">{r.priority}</Badge> },
        { key: 'isActive', label: 'Status', render: (r) => <ActiveBadge active={r.isActive} /> },
      ]}
      fields={[
        { name: 'name', label: 'Rule name', required: true, placeholder: 'Diwali 2026' },
        { name: 'ruleType', label: 'Rule type', type: 'select', options: RULE_TYPES.map((t) => ({ value: t, label: titleCase(t) })), default: 'custom' },
        { name: 'startDate', label: 'Start date (optional)', type: 'date' },
        { name: 'endDate', label: 'End date (optional)', type: 'date' },
        { name: 'daysOfWeek', label: 'Days of week (none = every day)', type: 'days' },
        { name: 'bookingType', label: 'Booking type', type: 'select', options: bookingTypeScope, default: 'all' },
        { name: 'priority', label: 'Priority (higher wins)', type: 'number', default: 0, min: 0, max: 1000 },
        {
          name: 'adjustmentType',
          label: 'Adjustment type',
          type: 'select',
          default: 'percentage',
          options: [
            { value: 'percentage', label: '% of base fare' },
            { value: 'per_km', label: '₹ per KM' },
            { value: 'flat', label: 'Flat ₹ amount' },
          ],
        },
        { name: 'adjustmentValue', label: 'Adjustment value', type: 'number', required: true, hint: 'Positive = surcharge, negative = discount' },
        { name: 'categories', label: 'Car categories (none = all)', type: 'multiselect', optionsUrl: '/admin/categories' },
        { name: 'fuelTypes', label: 'Fuel types (none = all; applies when a car is selected)', type: 'multiselect', options: fuelOptions },
        { name: 'description', label: 'Description', type: 'textarea' },
        { name: 'isActive', label: 'Active', type: 'checkbox', default: true },
      ]}
    />
  );
}

export function TestimonialsPage() {
  return (
    <ResourceManager
      title="Testimonials"
      description="Customer reviews shown on the homepage. Only publish genuine reviews."
      endpoint="/admin/testimonials"
      singular="testimonial"
      emptyIcon={MessageSquareQuote}
      defaultSort="displayOrder"
      filters={[activeFilter]}
      columns={[
        {
          key: 'customerName',
          label: 'Customer',
          render: (r) => (
            <div className="flex items-center gap-3">
              <SmartImage src={r.photo} className="h-9 w-9 rounded-full" iconClass="h-4 w-4" />
              <div>
                <p className="font-semibold text-ink">{r.customerName}</p>
                <p className="text-xs text-slate-500">{r.location}</p>
              </div>
            </div>
          ),
        },
        { key: 'rating', label: 'Rating', render: (r) => <span className="text-amber-500">{'★'.repeat(r.rating)}</span> },
        { key: 'message', label: 'Review', render: (r) => <p className="line-clamp-2 max-w-md text-slate-600">{r.message}</p> },
        { key: 'isActive', label: 'Status', render: (r) => <ActiveBadge active={r.isActive} on="Published" off="Hidden" /> },
      ]}
      fields={[
        { name: 'customerName', label: 'Customer name', required: true },
        { name: 'location', label: 'Location' },
        { name: 'rating', label: 'Rating', type: 'select', options: [5, 4, 3, 2, 1].map((n) => ({ value: n, label: '★'.repeat(n) })), default: 5 },
        { name: 'tripDetails', label: 'Trip', placeholder: 'Nagpur → Pune, Innova' },
        { name: 'message', label: 'Review', type: 'textarea', required: true, rows: 4 },
        { name: 'photo', label: 'Photo', type: 'image', folder: 'testimonials', aspect: 'aspect-square' },
        { name: 'displayOrder', label: 'Display order', type: 'number', default: 0 },
        { name: 'isActive', label: 'Published', type: 'checkbox', default: true },
      ]}
      transformPayload={(p) => ({ ...p, rating: Number(p.rating) })}
    />
  );
}
