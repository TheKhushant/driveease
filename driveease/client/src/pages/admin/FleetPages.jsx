import { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Car, Eye, EyeOff, History, UserSquare2 } from 'lucide-react';
import { ResourceManager } from '../../components/admin/ResourceManager';
import { ActiveBadge, Badge, EmptyState, Spinner, StatusBadge } from '../../components/ui/Feedback';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Pagination, SmartImage } from '../../components/ui/Misc';
import { useFetch, useOptions } from '../../hooks/useFetch';
import { errorMessage, put } from '../../services/api';
import { AC_LABEL, bookingRouteLabel, formatDate, formatINR, formatTime, titleCase } from '../../utils/format';
import { acOptions, activeFilter, fuelOptions } from './options';

function BookingHistory({ open, onClose, title, url }) {
  const [page, setPage] = useState(1);
  const { data, loading } = useFetch(open ? url : null, { page, limit: 10 });
  return (
    <Modal open={open} onClose={onClose} title={title} size="lg">
      {loading && !data ? (
        <div className="grid place-items-center py-10">
          <Spinner />
        </div>
      ) : !data?.items?.length ? (
        <EmptyState title="No bookings yet" />
      ) : (
        <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
          {data.items.map((b) => (
            <Link key={b._id} to={`/admin/bookings/${b._id}`} className="flex items-center justify-between gap-3 p-3 hover:bg-slate-50">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ink">
                  {b.bookingRef} · {b.customerName}
                </p>
                <p className="truncate text-xs text-slate-500">
                  {bookingRouteLabel(b)} · {formatDate(b.pickupDate)} {formatTime(b.pickupTime)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="text-sm font-semibold">{formatINR(b.finalAmount ?? b.fare?.total)}</span>
                <StatusBadge status={b.status} />
              </div>
            </Link>
          ))}
          <Pagination pagination={data.pagination} onPage={setPage} />
        </div>
      )}
    </Modal>
  );
}

const vehicleStatusTone = {
  available: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  on_trip: 'bg-violet-50 text-violet-700 ring-violet-200',
  unavailable: 'bg-slate-100 text-slate-600 ring-slate-200',
};

export function VehiclesPage() {
  const [history, setHistory] = useState(null);
  const { options: categoryOptions } = useOptions('/admin/categories');
  const toggleVisible = async (row, reload) => {
    try {
      await put(`/admin/vehicles/${row._id}`, { isVisible: !row.isVisible });
      toast.success(row.isVisible ? 'Car hidden from website' : 'Car visible on website');
      reload();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <>
      <ResourceManager
        title="Cars & Vehicles"
        description="Your fleet. Visible cars appear on the website for customers to select."
        endpoint="/admin/vehicles"
        singular="vehicle"
        emptyIcon={Car}
        modalSize="xl"
        defaultSort="displayOrder"
        filters={[
          { name: 'category', label: 'All categories', options: categoryOptions },
          { name: 'fuelType', label: 'All fuels', options: fuelOptions },
          {
            name: 'maintenanceStatus',
            label: 'Maintenance',
            options: [
              { value: 'ok', label: 'OK' },
              { value: 'scheduled', label: 'Service scheduled' },
              { value: 'under_maintenance', label: 'Under maintenance' },
            ],
          },
          activeFilter,
        ].filter((f) => f.options.length)}
        columns={[
          {
            key: 'name',
            label: 'Vehicle',
            render: (r) => (
              <div className="flex items-center gap-3">
                <SmartImage src={r.images?.[0]} className="h-11 w-16 rounded-lg" iconClass="h-5 w-5" />
                <div>
                  <p className="font-semibold text-ink">{r.name}</p>
                  <p className="text-xs text-slate-500">
                    {r.registrationNumber || 'No reg. no.'} · {r.category?.name}
                  </p>
                </div>
              </div>
            ),
          },
          {
            key: 'spec',
            label: 'Specs',
            render: (r) => (
              <p className="text-xs text-slate-600">
                {r.seatingCapacity} seats · {titleCase(r.fuelType)} · {AC_LABEL[r.acType]}
              </p>
            ),
          },
          { key: 'perKmRate', label: 'Rate', render: (r) => (r.perKmRate ? `₹${r.perKmRate}/km` : <span className="text-xs text-slate-400">Pricing table</span>) },
          { key: 'driver', label: 'Driver', render: (r) => r.assignedDriver?.fullName || '—' },
          {
            key: 'status',
            label: 'Status',
            render: (r) => (
              <div className="flex flex-col items-start gap-1">
                <Badge className={vehicleStatusTone[r.availabilityStatus]}>{titleCase(r.availabilityStatus)}</Badge>
                {r.maintenanceStatus !== 'ok' && <Badge className="bg-amber-50 text-amber-700 ring-amber-200">{titleCase(r.maintenanceStatus)}</Badge>}
                {!r.isActive && <ActiveBadge active={false} />}
              </div>
            ),
          },
        ]}
        extraActions={(row, reload) => (
          <>
            <Button size="icon" variant="ghost" title={row.isVisible ? 'Hide from website' : 'Show on website'} onClick={() => toggleVisible(row, reload)}>
              {row.isVisible ? <Eye className="h-4 w-4 text-emerald-600" /> : <EyeOff className="h-4 w-4 text-slate-400" />}
            </Button>
            <Button size="icon" variant="ghost" title="Booking history" onClick={() => setHistory(row)}>
              <History className="h-4 w-4" />
            </Button>
          </>
        )}
        fields={[
          { name: 'name', label: 'Display name', required: true, placeholder: 'Toyota Innova Crysta', section: 'Details' },
          { name: 'category', label: 'Category', type: 'select', optionsUrl: '/admin/categories', required: true },
          { name: 'brand', label: 'Brand', required: true },
          { name: 'model', label: 'Model', required: true },
          { name: 'year', label: 'Year', type: 'number', min: 1990, max: 2100 },
          { name: 'registrationNumber', label: 'Registration number', placeholder: 'MH31AB1234' },
          { name: 'color', label: 'Colour' },
          { name: 'fuelType', label: 'Fuel type', type: 'select', options: fuelOptions, required: true, placeholder: 'Select…' },
          { name: 'seatingCapacity', label: 'Seating capacity', type: 'number', required: true, min: 1 },
          { name: 'luggageCapacity', label: 'Luggage capacity (bags)', type: 'number', min: 0, default: 2 },
          { name: 'acType', label: 'AC / Non-AC', type: 'select', options: acOptions, default: 'both' },
          { name: 'images', label: 'Photos (first is the cover)', type: 'images', folder: 'vehicles' },
          { name: 'description', label: 'Description', type: 'textarea' },
          { name: 'features', label: 'Features (comma separated)', type: 'tags', span: 2, placeholder: 'Music system, Carrier, Charging point' },
          { name: 'perKmRate', label: 'Own AC rate ₹/km (fuel incl.)', type: 'number', min: 0, default: 0, hint: '0 = use Pricing Management rates', section: 'Pricing' },
          { name: 'nonAcPerKmRate', label: 'Own Non-AC rate ₹/km', type: 'number', min: 0, default: 0 },
          { name: 'minimumBookingAmount', label: 'Minimum booking amount (₹)', type: 'number', min: 0, default: 0 },
          { name: 'displayOrder', label: 'Display order', type: 'number', default: 0 },
          { name: 'assignedDriver', label: 'Default driver', type: 'select', optionsUrl: '/admin/drivers', optionLabel: 'fullName', section: 'Operations' },
          {
            name: 'availabilityStatus',
            label: 'Availability',
            type: 'select',
            default: 'available',
            options: [
              { value: 'available', label: 'Available' },
              { value: 'on_trip', label: 'On trip' },
              { value: 'unavailable', label: 'Unavailable' },
            ],
          },
          {
            name: 'maintenanceStatus',
            label: 'Maintenance status',
            type: 'select',
            default: 'ok',
            options: [
              { value: 'ok', label: 'OK' },
              { value: 'scheduled', label: 'Service scheduled' },
              { value: 'under_maintenance', label: 'Under maintenance (not bookable)' },
            ],
          },
          { name: 'lastServiceDate', label: 'Last service', type: 'date' },
          { name: 'nextServiceDate', label: 'Next service', type: 'date' },
          { name: 'isVisible', label: 'Show on website', type: 'checkbox', default: true },
          { name: 'isActive', label: 'Active', type: 'checkbox', default: true },
        ]}
      />
      <BookingHistory open={Boolean(history)} onClose={() => setHistory(null)} title={`Bookings · ${history?.name || ''}`} url={history ? `/admin/vehicles/${history._id}/bookings` : null} />
    </>
  );
}

const driverTone = {
  available: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  on_trip: 'bg-violet-50 text-violet-700 ring-violet-200',
  off_duty: 'bg-slate-100 text-slate-600 ring-slate-200',
  on_leave: 'bg-amber-50 text-amber-700 ring-amber-200',
};

export function DriversPage() {
  const [history, setHistory] = useState(null);
  return (
    <>
      <ResourceManager
        title="Drivers"
        description="Driver details are private and only visible to admins."
        endpoint="/admin/drivers"
        singular="driver"
        emptyIcon={UserSquare2}
        filters={[
          {
            name: 'availability',
            label: 'All availability',
            options: Object.keys(driverTone).map((k) => ({ value: k, label: titleCase(k) })),
          },
          activeFilter,
        ]}
        columns={[
          {
            key: 'fullName',
            label: 'Driver',
            render: (r) => (
              <div className="flex items-center gap-3">
                <SmartImage src={r.photo} className="h-10 w-10 rounded-full" fallbackIcon={UserSquare2} iconClass="h-5 w-5" />
                <div>
                  <p className="font-semibold text-ink">{r.fullName}</p>
                  <a href={`tel:${r.phone}`} className="text-xs text-slate-500 hover:text-primary">
                    {r.phone}
                  </a>
                </div>
              </div>
            ),
          },
          { key: 'licenseNumber', label: 'Licence', render: (r) => <span className="font-mono text-xs">{r.licenseNumber}</span> },
          { key: 'experienceYears', label: 'Experience', render: (r) => `${r.experienceYears || 0} yrs` },
          { key: 'vehicle', label: 'Vehicle', render: (r) => (r.assignedVehicle ? `${r.assignedVehicle.name}${r.assignedVehicle.registrationNumber ? ` (${r.assignedVehicle.registrationNumber})` : ''}` : '—') },
          {
            key: 'availability',
            label: 'Availability',
            render: (r) => (
              <div className="flex flex-col items-start gap-1">
                <Badge className={driverTone[r.availability]}>{titleCase(r.availability)}</Badge>
                {!r.isActive && <ActiveBadge active={false} />}
              </div>
            ),
          },
        ]}
        extraActions={(row) => (
          <Button size="icon" variant="ghost" title="Booking history" onClick={() => setHistory(row)}>
            <History className="h-4 w-4" />
          </Button>
        )}
        fields={[
          { name: 'fullName', label: 'Full name', required: true },
          { name: 'phone', label: 'Phone number', type: 'tel', required: true, pattern: { value: /^\+?[0-9]{10,15}$/, message: 'Enter 10–15 digits' } },
          { name: 'alternatePhone', label: 'Alternate phone', type: 'tel' },
          { name: 'email', label: 'Email', type: 'email' },
          { name: 'licenseNumber', label: 'Driving licence number', required: true },
          { name: 'licenseExpiry', label: 'Licence expiry', type: 'date' },
          { name: 'experienceYears', label: 'Experience (years)', type: 'number', min: 0, default: 0 },
          { name: 'assignedVehicle', label: 'Assigned vehicle', type: 'select', optionsUrl: '/admin/vehicles', optionLabel: (v) => `${v.name}${v.registrationNumber ? ` (${v.registrationNumber})` : ''}` },
          {
            name: 'availability',
            label: 'Availability',
            type: 'select',
            default: 'available',
            options: Object.keys(driverTone).map((k) => ({ value: k, label: titleCase(k) })),
          },
          { name: 'languages', label: 'Languages (comma separated)', type: 'tags', placeholder: 'Marathi, Hindi, English' },
          { name: 'address', label: 'Address', type: 'textarea' },
          { name: 'photo', label: 'Profile photo', type: 'image', folder: 'drivers', aspect: 'aspect-square' },
          { name: 'notes', label: 'Notes', type: 'textarea' },
          { name: 'isActive', label: 'Active', type: 'checkbox', default: true },
        ]}
      />
      <BookingHistory open={Boolean(history)} onClose={() => setHistory(null)} title={`Bookings · ${history?.fullName || ''}`} url={history ? `/admin/drivers/${history._id}/bookings` : null} />
    </>
  );
}
