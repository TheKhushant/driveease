import {
  Availability,
  Booking,
  CarCategory,
  City,
  Driver,
  LocalPackage,
  PricingRule,
  Route,
  Testimonial,
  Vehicle,
} from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getPagination, paginated } from '../utils/query.js';
import { crudController } from './crudFactory.js';
import { activeBookingsFor, setDriverVehicle, setVehicleDriver } from '../services/fleetService.js';

const changed = (before, doc, field) => String(before?.[field] || '') !== String(doc[field] || '');
const blankToNull = (data, ...fields) =>
  fields.forEach((f) => {
    if (data[f] === '') data[f] = null;
  });

export const categoryController = crudController(CarCategory, {
  label: 'Car category',
  searchFields: ['name', 'description'],
  filters: { isActive: 'bool', isVisible: 'bool' },
  sortable: ['name', 'displayOrder', 'createdAt'],
  defaultSort: { displayOrder: 1, name: 1 },
  beforeDelete: async (doc) => {
    const count = await Vehicle.countDocuments({ category: doc._id });
    if (count) throw ApiError.conflict(`Cannot delete: ${count} vehicle(s) use this category. Reassign or hide it instead.`);
  },
});

export const vehicleController = crudController(Vehicle, {
  label: 'Vehicle',
  searchFields: ['name', 'brand', 'model', 'registrationNumber'],
  filters: {
    category: 'id',
    fuelType: 'string',
    acType: 'string',
    isVisible: 'bool',
    isActive: 'bool',
    availabilityStatus: 'string',
    maintenanceStatus: 'string',
  },
  sortable: ['name', 'displayOrder', 'createdAt', 'seatingCapacity', 'perKmRate'],
  defaultSort: { displayOrder: 1, createdAt: -1 },
  populate: [
    { path: 'category', select: 'name slug' },
    { path: 'assignedDriver', select: 'fullName phone' },
  ],
  beforeSave: async (data) => {
    blankToNull(data, 'assignedDriver');
    if (data.registrationNumber === '') data.registrationNumber = undefined;
  },
  afterSave: async (doc, _req, before) => {
    if (changed(before, doc, 'assignedDriver')) await setVehicleDriver(doc._id, doc.assignedDriver);
  },
  beforeDelete: async (doc) => {
    const n = (await activeBookingsFor('assignedVehicle', doc._id)) + (await activeBookingsFor('selectedVehicle', doc._id));
    if (n) throw ApiError.conflict(`Cannot delete: vehicle has ${n} upcoming booking(s). Mark it inactive instead.`);
  },
  afterDelete: async (doc) => {
    await Driver.updateMany({ assignedVehicle: doc._id }, { assignedVehicle: null });
  },
});

export const driverController = crudController(Driver, {
  label: 'Driver',
  searchFields: ['fullName', 'phone', 'licenseNumber'],
  filters: { availability: 'string', isActive: 'bool' },
  sortable: ['fullName', 'experienceYears', 'createdAt'],
  defaultSort: { fullName: 1 },
  populate: { path: 'assignedVehicle', select: 'name registrationNumber' },
  beforeSave: async (data) => blankToNull(data, 'assignedVehicle'),
  afterSave: async (doc, _req, before) => {
    if (changed(before, doc, 'assignedVehicle')) await setDriverVehicle(doc._id, doc.assignedVehicle);
  },
  beforeDelete: async (doc) => {
    const n = await activeBookingsFor('assignedDriver', doc._id);
    if (n) throw ApiError.conflict(`Cannot delete: driver has ${n} upcoming booking(s). Mark them inactive instead.`);
  },
  afterDelete: async (doc) => {
    await Vehicle.updateMany({ assignedDriver: doc._id }, { assignedDriver: null });
  },
});

/** Booking history for a driver or vehicle. */
export const resourceBookings = (field) =>
  asyncHandler(async (req, res) => {
    const pg = getPagination(req.query);
    const filter =
      field === 'vehicle'
        ? { $or: [{ assignedVehicle: req.params.id }, { assignedVehicle: null, selectedVehicle: req.params.id }] }
        : { assignedDriver: req.params.id };
    const [items, total] = await Promise.all([
      Booking.find(filter)
        .sort({ pickupAt: -1 })
        .skip(pg.skip)
        .limit(pg.limit)
        .select('bookingRef status bookingType tripType pickupCityName dropCityName pickupDate pickupTime returnDate customerName fare.total finalAmount payment.status'),
      Booking.countDocuments(filter),
    ]);
    res.json({ success: true, data: paginated(items, total, pg) });
  });

export const cityController = crudController(City, {
  label: 'City',
  searchFields: ['name', 'state'],
  filters: { isActive: 'bool', isPopular: 'bool' },
  sortable: ['name', 'displayOrder', 'createdAt'],
  defaultSort: { displayOrder: 1, name: 1 },
  beforeDelete: async (doc) => {
    const count = await Route.countDocuments({ $or: [{ fromCity: doc._id }, { toCity: doc._id }] });
    if (count) throw ApiError.conflict(`Cannot delete: ${count} route(s) use this city. Delete those routes or disable the city.`);
  },
});

export const routeController = crudController(Route, {
  label: 'Route',
  filters: { fromCity: 'id', toCity: 'id', isActive: 'bool', isPopular: 'bool' },
  sortable: ['distanceKm', 'createdAt'],
  defaultSort: { createdAt: -1 },
  populate: [
    { path: 'fromCity', select: 'name' },
    { path: 'toCity', select: 'name' },
    { path: 'applicableCategories', select: 'name' },
    { path: 'categoryPricing.category', select: 'name' },
  ],
  beforeSave: async (data, _req, doc) => {
    const from = data.fromCity ?? doc?.fromCity;
    const to = data.toCity ?? doc?.toCity;
    if (from && to) {
      // Prevent a reverse duplicate when the existing route is bidirectional.
      const reverse = await Route.findOne({ fromCity: to, toCity: from, isBidirectional: true, _id: { $ne: doc?._id } });
      if (reverse) throw ApiError.conflict('A bidirectional route already exists between these cities.');
    }
    if (Array.isArray(data.categoryPricing)) {
      data.categoryPricing = data.categoryPricing.filter((p) => p && p.category);
    }
  },
});

export const packageController = crudController(LocalPackage, {
  label: 'Local package',
  searchFields: ['name'],
  filters: { isActive: 'bool' },
  sortable: ['hours', 'displayOrder', 'basePriceAc', 'createdAt'],
  defaultSort: { displayOrder: 1, hours: 1 },
  populate: [
    { path: 'categoryPrices.category', select: 'name' },
    { path: 'cities', select: 'name' },
  ],
  beforeSave: async (data) => {
    if (Array.isArray(data.categoryPrices)) data.categoryPrices = data.categoryPrices.filter((p) => p && p.category);
  },
});

export const pricingRuleController = crudController(PricingRule, {
  label: 'Pricing rule',
  searchFields: ['name', 'description'],
  filters: { isActive: 'bool', ruleType: 'string', bookingType: 'string' },
  sortable: ['priority', 'name', 'startDate', 'createdAt'],
  defaultSort: { priority: -1, createdAt: -1 },
  populate: { path: 'categories', select: 'name' },
  beforeSave: async (data) => {
    ['startDate', 'endDate'].forEach((f) => {
      if (data[f] === '' || data[f] === null) data[f] = undefined;
    });
  },
});

export const testimonialController = crudController(Testimonial, {
  label: 'Testimonial',
  searchFields: ['customerName', 'location', 'message'],
  filters: { isActive: 'bool' },
  sortable: ['displayOrder', 'rating', 'createdAt'],
  defaultSort: { displayOrder: 1, createdAt: -1 },
});

export const availabilityController = crudController(Availability, {
  label: 'Availability entry',
  searchFields: ['title', 'reason'],
  filters: {
    type: 'string',
    vehicle: 'id',
    driver: 'id',
    isActive: 'bool',
    month: (m) => {
      if (!/^\d{4}-\d{2}$/.test(m)) throw ApiError.badRequest('month must be YYYY-MM');
      return { startDate: { $lte: `${m}-31` }, endDate: { $gte: `${m}-01` } };
    },
  },
  sortable: ['startDate', 'createdAt'],
  defaultSort: { startDate: -1 },
  populate: [
    { path: 'vehicle', select: 'name registrationNumber' },
    { path: 'driver', select: 'fullName phone' },
    { path: 'city', select: 'name' },
  ],
  beforeSave: async (data) => {
    blankToNull(data, 'vehicle', 'driver', 'city');
    if (data.type && data.type !== 'time_block') {
      data.startTime = undefined;
      data.endTime = undefined;
    }
  },
});
