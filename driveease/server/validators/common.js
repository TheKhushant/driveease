import { z } from 'zod';
import { isValidDateStr, isValidTimeStr } from '../utils/dateTime.js';

const blankToUndefined = (v) => (v === '' || v === null ? undefined : v);

/** Optional field that treats '' and null as "not provided". */
export const opt = (schema) => z.preprocess(blankToUndefined, schema.optional());

export const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
export const dateStr = z.string().refine(isValidDateStr, 'Use a valid date (YYYY-MM-DD)');
export const timeStr = z.string().refine(isValidTimeStr, 'Use a valid time (HH:mm)');

export const phone = z
  .string()
  .transform((v) => v.replace(/[\s\-()]/g, ''))
  .refine((v) => /^\+?[0-9]{10,15}$/.test(v), 'Enter a valid mobile number');

export const email = z.string().trim().toLowerCase().email('Enter a valid email');
