import { z } from 'zod';
import { email, opt } from './common.js';

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Password is required').max(200),
});

export const profileSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email,
  phone: opt(z.string().trim().max(20)),
  avatar: opt(z.string().trim().url().or(z.literal(''))),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(128)
      .regex(/[A-Za-z]/, 'Password must contain a letter')
      .regex(/[0-9]/, 'Password must contain a number'),
  })
  .refine((d) => d.currentPassword !== d.newPassword, {
    path: ['newPassword'],
    message: 'New password must differ from the current one',
  });
