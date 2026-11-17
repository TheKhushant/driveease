import { Router } from 'express';
import { authorize, protect } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { imageUpload } from '../middleware/upload.js';
import { ApiError } from '../utils/ApiError.js';
import { isObjectId } from '../utils/query.js';
import {
  availabilityController,
  categoryController,
  cityController,
  driverController,
  packageController,
  pricingRuleController,
  resourceBookings,
  routeController,
  testimonialController,
  vehicleController,
} from '../controllers/resourceControllers.js';
import {
  assign,
  availableResources,
  deleteBooking,
  getBooking,
  listBookings,
  updateBooking,
  updateStatus,
} from '../controllers/bookingController.js';
import {
  customerUpdateSchema,
  deleteCustomer,
  getCustomer,
  listCustomers,
  updateCustomer,
} from '../controllers/customerController.js';
import { createPayment, deletePayment, listPayments, paymentBookings } from '../controllers/paymentController.js';
import { getDashboard } from '../controllers/dashboardController.js';
import { getAdminSettings, getPricing, updatePricing, updateSettings } from '../controllers/settingsController.js';
import { deleteMedia, listMedia, mediaStatus, updateMedia, uploadMedia } from '../controllers/mediaController.js';
import { calendar, checkResource } from '../controllers/availabilityController.js';
import {
  assignSchema,
  bookingUpdateSchema,
  paymentSchema,
  statusChangeSchema,
} from '../validators/bookingValidators.js';

const router = Router();

router.use(protect);
router.param('id', (_req, _res, next, id) => (isObjectId(id) ? next() : next(ApiError.badRequest('Invalid id'))));

// superadmin & admin can change configuration; "manager" handles day-to-day bookings/payments.
const adminOnly = authorize('admin');
const staff = authorize('admin', 'manager');

function mountCrud(path, ctrl, write = adminOnly) {
  router.get(path, staff, ctrl.list);
  router.get(`${path}/:id`, staff, ctrl.getOne);
  router.post(path, write, ctrl.create);
  router.put(`${path}/:id`, write, ctrl.update);
  router.delete(`${path}/:id`, write, ctrl.remove);
}

// Dashboard
router.get('/dashboard', staff, getDashboard);

// Bookings
router.get('/bookings', staff, listBookings);
router.get('/bookings/:id', staff, getBooking);
router.get('/bookings/:id/resources', staff, availableResources);
router.patch('/bookings/:id', staff, validate(bookingUpdateSchema), updateBooking);
router.patch('/bookings/:id/status', staff, validate(statusChangeSchema), updateStatus);
router.patch('/bookings/:id/assign', staff, validate(assignSchema), assign);
router.delete('/bookings/:id', adminOnly, deleteBooking);

// Customers
router.get('/customers', staff, listCustomers);
router.get('/customers/:id', staff, getCustomer);
router.put('/customers/:id', staff, validate(customerUpdateSchema), updateCustomer);
router.delete('/customers/:id', adminOnly, deleteCustomer);

// Fleet
router.get('/vehicles/:id/bookings', staff, resourceBookings('vehicle'));
router.get('/drivers/:id/bookings', staff, resourceBookings('driver'));
mountCrud('/vehicles', vehicleController);
mountCrud('/categories', categoryController);
mountCrud('/drivers', driverController);

// Locations
mountCrud('/cities', cityController);
mountCrud('/routes', routeController);

// Pricing
router.get('/pricing', staff, getPricing);
router.put('/pricing', adminOnly, updatePricing);
mountCrud('/pricing-rules', pricingRuleController);
mountCrud('/packages', packageController);

// Availability
router.get('/availability/calendar', staff, calendar);
router.get('/availability/check', staff, checkResource);
mountCrud('/availability', availabilityController);

// Payments
router.get('/payments', staff, listPayments);
router.get('/payments/bookings', staff, paymentBookings);
router.post('/payments', staff, validate(paymentSchema), createPayment);
router.delete('/payments/:id', adminOnly, deletePayment);

// Content
mountCrud('/testimonials', testimonialController);
router.get('/settings', staff, getAdminSettings);
router.put('/settings', adminOnly, updateSettings);

// Media
router.get('/media/status', staff, mediaStatus);
router.get('/media', staff, listMedia);
router.post('/media/upload', adminOnly, imageUpload.array('files', 10), uploadMedia);
router.patch('/media/:id', adminOnly, updateMedia);
router.delete('/media/:id', adminOnly, deleteMedia);

export default router;
