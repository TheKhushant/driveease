/**
 * WhatsApp click-to-chat helpers. No WhatsApp Business API is used: we only build a
 * wa.me link with a pre-filled, URL-encoded message that the CUSTOMER must send.
 */

export const formatINR = (n) => `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;

/** Digits only. A bare 10-digit number is treated as Indian (+91). */
export function normalizeWhatsAppNumber(num) {
  const digits = String(num || '').replace(/\D/g, '').replace(/^0+/, '');
  if (!digits) return '';
  return digits.length === 10 ? `91${digits}` : digits;
}

const TRIP_LABEL = { one_way: 'One-way', round_trip: 'Round-trip' };

export function buildBookingMessage(booking, { companyName = 'DriveEase' } = {}) {
  const f = booking.fare || {};
  const lines = [
    `*New booking request – ${companyName}*`,
    '',
    `*Booking Ref:* ${booking.bookingRef}`,
    `*Name:* ${booking.customerName}`,
    `*Phone:* ${booking.customerPhone}`,
  ];
  if (booking.customerEmail) lines.push(`*Email:* ${booking.customerEmail}`);
  lines.push(
    '',
    `*Booking Type:* ${booking.bookingType === 'local' ? 'Local' : 'Outstation'}`,
  );
  if (booking.bookingType === 'outstation') lines.push(`*Trip Type:* ${TRIP_LABEL[booking.tripType] || '-'}`);
  if (booking.localPackageSnapshot?.name) lines.push(`*Package:* ${booking.localPackageSnapshot.name}`);
  lines.push(`*Pickup City:* ${booking.pickupCityName}`);
  if (booking.pickupAddress) lines.push(`*Pickup Address:* ${booking.pickupAddress}`);
  lines.push(`*Destination:* ${booking.dropCityName || (booking.bookingType === 'local' ? 'Local (within city)' : '-')}`);
  if (booking.dropAddress) lines.push(`*Drop Address:* ${booking.dropAddress}`);
  lines.push(`*Pickup Date:* ${booking.pickupDate}`, `*Pickup Time:* ${booking.pickupTime}`);
  if (booking.returnDate) lines.push(`*Return Date:* ${booking.returnDate}`);
  lines.push(
    `*Car Category:* ${booking.categoryName || 'Any'}`,
    `*Selected Car:* ${booking.selectedVehicleName || 'Any available'}`,
    `*AC / Non-AC:* ${booking.acPreference === 'non_ac' ? 'Non-AC' : 'AC'}`,
    `*Passengers:* ${booking.passengers}`,
    `*Distance:* ${f.distanceKm ?? '-'} km${f.billableKm && f.billableKm !== f.distanceKm ? ` (billable ${f.billableKm} km)` : ''}`,
    '',
    '*Fare Breakdown (estimate):*',
  );
  (f.items || []).forEach((i) => lines.push(`• ${i.label}: ${formatINR(i.amount)}${i.note ? ` (${i.note})` : ''}`));
  lines.push(`*Estimated Total: ${formatINR(f.total)}*`);
  if (booking.instructions) lines.push('', `*Instructions:* ${booking.instructions}`);
  lines.push('', 'Please confirm my booking. Thank you!');
  return lines.join('\n');
}

export function buildWhatsAppUrl(number, message) {
  const n = normalizeWhatsAppNumber(number);
  if (!n) return null;
  return `https://wa.me/${n}?text=${encodeURIComponent(message)}`;
}
