import { z } from 'zod';
import { BOOKING_STATUSES } from '../models/constants.js';
import { dateStr, email, objectId, opt, phone, timeStr } from './common.js';

const tripFields = {
  bookingType: z.enum(['local', 'outstation']),
  tripType: opt(z.enum(['one_way', 'round_trip'])),
  pickupCity: objectId,
  dropCity: opt(objectId),
  localPackage: opt(objectId),
  pickupDate: dateStr,
  pickupTime: timeStr,
  returnDate: opt(dateStr),
  passengers: z.coerce.number().int().min(1, 'At least 1 passenger').max(60),
  category: opt(objectId),
  vehicle: opt(objectId),
  acPreference: z.enum(['ac', 'non_ac']).default('ac'),
};

function tripRules(data, ctx) {
  if (data.bookingType === 'outstation') {
    if (!data.tripType) ctx.addIssue({ code: 'custom', path: ['tripType'], message: 'Select one-way or round-trip' });
    if (!data.dropCity) ctx.addIssue({ code: 'custom', path: ['dropCity'], message: 'Select a destination city' });
    if (data.tripType === 'round_trip') {
      if (!data.returnDate) ctx.addIssue({ code: 'custom', path: ['returnDate'], message: 'Select a return date' });
      else if (data.returnDate < data.pickupDate) {
        ctx.addIssue({ code: 'custom', path: ['returnDate'], message: 'Return date must be on or after pickup date' });
      }
    }
  } else if (!data.localPackage) {
    ctx.addIssue({ code: 'custom', path: ['localPackage'], message: 'Select a local package' });
  }
}

/** Normalise fields that don't apply to the chosen booking/trip type. */
function normalise(data) {
  if (data.bookingType === 'local') {
    return { ...data, tripType: undefined, dropCity: undefined, returnDate: undefined };
  }
  return {
    ...data,
    localPackage: undefined,
    returnDate: data.tripType === 'round_trip' ? data.returnDate : undefined,
  };
}

export const quoteSchema = z.object(tripFields).superRefine(tripRules).transform(normalise);

export const vehicleEstimateSchema = z
  .object({ ...tripFields, vehicle: z.any().optional() })
  .superRefine(tripRules)
  .transform((d) => normalise({ ...d, vehicle: undefined }));

export const createBookingSchema = z
  .object({
    ...tripFields,
    customerName: z.string().trim().min(2, 'Enter your name').max(80),
    customerPhone: phone,
    customerEmail: opt(email),
    pickupAddress: opt(z.string().trim().max(300)),
    dropAddress: opt(z.string().trim().max(300)),
    instructions: opt(z.string().trim().max(1000)),
  })
  .strip()
  .superRefine(tripRules)
  .transform(normalise);

export const trackBookingSchema = z.object({ phone });

export const statusChangeSchema = z.object({
  status: z.enum(BOOKING_STATUSES),
  note: opt(z.string().trim().max(500)),
  reason: opt(z.string().trim().max(500)),
});

export const assignSchema = z.object({
  vehicle: z.union([objectId, z.literal(''), z.null()]).optional(),
  driver: z.union([objectId, z.literal(''), z.null()]).optional(),
});

export const bookingUpdateSchema = z.object({
  adminNotes: opt(z.string().max(3000)),
  finalAmount: opt(z.coerce.number().min(0)),
  pickupAddress: opt(z.string().trim().max(300)),
  dropAddress: opt(z.string().trim().max(300)),
  customerEmail: opt(email),
});

export const paymentSchema = z.object({
  booking: objectId,
  type: z.enum(['payment', 'refund']).default('payment'),
  amount: z.coerce.number().positive('Amount must be greater than 0'),
  method: z.string().trim().min(1, 'Select a payment method').max(40),
  reference: opt(z.string().trim().max(100)),
  collectedBy: opt(z.string().trim().max(80)),
  paidAt: opt(z.coerce.date()),
  notes: opt(z.string().trim().max(1000)),
});
