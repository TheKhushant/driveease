import { FUEL_TYPES, titleCase } from '../../utils/format';

export const fuelOptions = FUEL_TYPES.map((f) => ({ value: f, label: titleCase(f) }));
export const acOptions = [
  { value: 'both', label: 'AC & Non-AC' },
  { value: 'ac', label: 'AC only' },
  { value: 'non_ac', label: 'Non-AC only' },
];
export const activeFilter = {
  name: 'isActive',
  label: 'All statuses',
  options: [
    { value: 'true', label: 'Active' },
    { value: 'false', label: 'Inactive' },
  ],
};
export const bookingTypeScope = [
  { value: 'all', label: 'All bookings' },
  { value: 'local', label: 'Local only' },
  { value: 'outstation', label: 'Outstation only' },
];
