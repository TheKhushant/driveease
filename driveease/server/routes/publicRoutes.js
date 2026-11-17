import { Router } from 'express';
import {
  destinationsFrom,
  fareEstimate,
  getLegal,
  getSite,
  getVehicle,
  listPackages,
  listVehicles,
  lookupRoute,
  submitBooking,
  trackBooking,
  vehicleEstimates,
} from '../controllers/publicController.js';
import { bookingLimiter, quoteLimiter } from '../middleware/security.js';
import { validate } from '../middleware/validate.js';
import {
  createBookingSchema,
  quoteSchema,
  trackBookingSchema,
  vehicleEstimateSchema,
} from '../validators/bookingValidators.js';

const router = Router();

router.get('/site', getSite);
router.get('/legal/:type', getLegal);
router.get('/vehicles', listVehicles);
router.get('/vehicles/:id', getVehicle);
router.get('/packages', listPackages);
router.get('/cities/:cityId/destinations', destinationsFrom);
router.get('/routes/lookup', lookupRoute);

router.post('/fare-estimate', quoteLimiter, validate(quoteSchema), fareEstimate);
router.post('/fare-estimate/vehicles', quoteLimiter, validate(vehicleEstimateSchema), vehicleEstimates);

router.post('/bookings', bookingLimiter, validate(createBookingSchema), submitBooking);
router.get('/bookings/:ref', quoteLimiter, validate(trackBookingSchema, 'query'), trackBooking);

export default router;
