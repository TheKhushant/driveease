/**
 * End-to-end API tests against an in-memory MongoDB.
 * Covers: admin auth, CRUD (category/city/route/package/vehicle/rule/driver), pricing,
 * fare estimate, booking submission (server-side fare), WhatsApp URL, availability
 * validation, approval + overlap prevention, driver assignment, payments, settings,
 * dashboard and pricing snapshots.
 */
import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';

let mongod;
let app;
let mongoose;
let models;
let token;
let addDays;
let todayStr;
const ids = {};

const auth = () => ({ Authorization: `Bearer ${token}` });

before(async () => {
  mongod = await MongoMemoryServer.create();
  process.env.NODE_ENV = 'test';
  process.env.MONGODB_URI = mongod.getUri('driveease_test');
  process.env.JWT_SECRET = 'test-secret-that-is-definitely-long-enough-123';
  process.env.CLOUDINARY_CLOUD_NAME = '';
  ({ default: mongoose } = await import('mongoose'));
  const { connectDB } = await import('../config/db.js');
  const { createApp } = await import('../app.js');
  models = await import('../models/index.js');
  ({ addDays, todayStr } = await import('../utils/dateTime.js'));
  await connectDB(process.env.MONGODB_URI);
  await Promise.all(Object.values(models).map((m) => m.syncIndexes?.()));
  await models.Admin.create({ name: 'Owner', email: 'owner@example.com', password: 'Passw0rd!', role: 'superadmin' });
  app = createApp();
});

after(async () => {
  await mongoose?.disconnect();
  await mongod?.stop();
});

describe('health & auth', () => {
  test('health reports MongoDB connected', async () => {
    const res = await request(app).get('/api/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.db, 'connected');
  });

  test('no public registration endpoint', async () => {
    const res = await request(app).post('/api/auth/register').send({ email: 'x@y.z', password: 'abcdefg1' });
    assert.equal(res.status, 404);
  });

  test('rejects wrong password with generic message', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'owner@example.com', password: 'nope' });
    assert.equal(res.status, 401);
    assert.equal(res.body.message, 'Invalid email or password');
  });

  test('admin APIs require a token', async () => {
    const res = await request(app).get('/api/admin/bookings');
    assert.equal(res.status, 401);
  });

  test('login returns JWT without password hash', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'OWNER@example.com', password: 'Passw0rd!' });
    assert.equal(res.status, 200);
    assert.ok(res.body.data.token);
    assert.equal(res.body.data.admin.password, undefined);
    token = res.body.data.token;
    const me = await request(app).get('/api/auth/me').set(auth());
    assert.equal(me.body.data.email, 'owner@example.com');
  });

  test('manager role cannot change configuration', async () => {
    await models.Admin.create({ name: 'Mgr', email: 'mgr@example.com', password: 'Passw0rd!', role: 'manager' });
    const login = await request(app).post('/api/auth/login').send({ email: 'mgr@example.com', password: 'Passw0rd!' });
    const res = await request(app)
      .post('/api/admin/cities')
      .set({ Authorization: `Bearer ${login.body.data.token}` })
      .send({ name: 'Blocked' });
    assert.equal(res.status, 403);
  });
});

describe('catalog CRUD', () => {
  test('car category create + case-insensitive duplicate rejected', async () => {
    const res = await request(app).post('/api/admin/categories').set(auth()).send({ name: 'Sedan', seatingCapacity: 4 });
    assert.equal(res.status, 201);
    ids.sedan = res.body.data._id;
    assert.equal(res.body.data.slug, 'sedan');
    const dup = await request(app).post('/api/admin/categories').set(auth()).send({ name: 'sedan' });
    assert.equal(dup.status, 409);
  });

  test('city CRUD', async () => {
    for (const name of ['Nagpur', 'Wardha', 'Pune', 'Temp']) {
      const res = await request(app).post('/api/admin/cities').set(auth()).send({ name, state: 'Maharashtra' });
      assert.equal(res.status, 201, JSON.stringify(res.body));
      ids[name] = res.body.data._id;
    }
    const upd = await request(app).put(`/api/admin/cities/${ids.Nagpur}`).set(auth()).send({ isPopular: true, description: 'Orange city' });
    assert.equal(upd.body.data.isPopular, true);
    const del = await request(app).delete(`/api/admin/cities/${ids.Temp}`).set(auth());
    assert.equal(del.status, 200);
    const list = await request(app).get('/api/admin/cities?search=nag').set(auth());
    assert.equal(list.body.data.items.length, 1);
  });

  test('route CRUD with validation', async () => {
    const same = await request(app).post('/api/admin/routes').set(auth()).send({ fromCity: ids.Nagpur, toCity: ids.Nagpur, distanceKm: 1, durationMinutes: 1 });
    assert.equal(same.status, 400);
    const res = await request(app)
      .post('/api/admin/routes')
      .set(auth())
      .send({ fromCity: ids.Nagpur, toCity: ids.Wardha, distanceKm: 300, durationMinutes: 300, tollCharges: 200 });
    assert.equal(res.status, 201);
    ids.route = res.body.data._id;
    assert.equal(res.body.data.fromCity.name, 'Nagpur');
    const reverse = await request(app).post('/api/admin/routes').set(auth()).send({ fromCity: ids.Wardha, toCity: ids.Nagpur, distanceKm: 300, durationMinutes: 300 });
    assert.equal(reverse.status, 409);
    const upd = await request(app).put(`/api/admin/routes/${ids.route}`).set(auth()).send({ durationMinutes: 320 });
    assert.equal(upd.body.data.durationMinutes, 320);
  });

  test('pricing configuration update', async () => {
    const res = await request(app)
      .put('/api/admin/pricing')
      .set(auth())
      .send({
        defaultRates: { local: { ac: 15, nonAc: 13 }, outstation: { ac: 14, nonAc: 12 } },
        driverAllowance: { local: 0, outstationPerDay: 500 },
        nightCharges: { amount: 300, startTime: '22:00', endTime: '06:00' },
        minimumFare: { local: 0, outstation: 0 },
        rateTable: [],
      });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(res.body.data.defaultRates.outstation.ac, 14);
  });

  test('local package + pricing rule CRUD', async () => {
    const pkg = await request(app)
      .post('/api/admin/packages')
      .set(auth())
      .send({ name: '8 Hours / 80 KM', hours: 8, km: 80, basePriceAc: 2000, basePriceNonAc: 1800, categoryPrices: [{ category: ids.sedan, priceAc: 2200, priceNonAc: 2000 }] });
    assert.equal(pkg.status, 201);
    ids.pkg = pkg.body.data._id;
    const dup = await request(app).post('/api/admin/packages').set(auth()).send({ name: 'dup', hours: 8, km: 80, basePriceAc: 1, basePriceNonAc: 1 });
    assert.equal(dup.status, 409);

    const rule = await request(app)
      .post('/api/admin/pricing-rules')
      .set(auth())
      .send({ name: 'Far future festival', ruleType: 'festival', startDate: '2099-01-01', endDate: '2099-01-10', adjustmentType: 'percentage', adjustmentValue: 20, priority: 50 });
    assert.equal(rule.status, 201);
    const bad = await request(app)
      .post('/api/admin/pricing-rules')
      .set(auth())
      .send({ name: 'Bad dates', startDate: '2099-01-10', endDate: '2099-01-01', adjustmentType: 'flat', adjustmentValue: 1 });
    assert.equal(bad.status, 400);
  });

  test('vehicle CRUD', async () => {
    const res = await request(app)
      .post('/api/admin/vehicles')
      .set(auth())
      .send({ name: 'Dzire', brand: 'Maruti', model: 'Dzire', category: ids.sedan, seatingCapacity: 4, fuelType: 'diesel', registrationNumber: 'mh31ab1234' });
    assert.equal(res.status, 201, JSON.stringify(res.body));
    ids.car = res.body.data._id;
    assert.equal(res.body.data.registrationNumber, 'MH31AB1234');
    const dupReg = await request(app)
      .post('/api/admin/vehicles')
      .set(auth())
      .send({ name: 'X', brand: 'X', model: 'X', category: ids.sedan, seatingCapacity: 4, fuelType: 'diesel', registrationNumber: 'MH31AB1234' });
    assert.equal(dupReg.status, 409);
    const car2 = await request(app)
      .post('/api/admin/vehicles')
      .set(auth())
      .send({ name: 'Etios', brand: 'Toyota', model: 'Etios', category: ids.sedan, seatingCapacity: 4, fuelType: 'diesel' });
    ids.car2 = car2.body.data._id;
    const upd = await request(app).put(`/api/admin/vehicles/${ids.car}`).set(auth()).send({ description: 'Clean sedan' });
    assert.equal(upd.body.data.category.name, 'Sedan');
  });

  test('driver CRUD with two-way vehicle assignment', async () => {
    const res = await request(app)
      .post('/api/admin/drivers')
      .set(auth())
      .send({ fullName: 'Ramesh', phone: '9876500001', licenseNumber: 'mh3120200001', assignedVehicle: ids.car });
    assert.equal(res.status, 201, JSON.stringify(res.body));
    ids.driver = res.body.data._id;
    const car = await models.Vehicle.findById(ids.car);
    assert.equal(String(car.assignedDriver), ids.driver);
    const d2 = await request(app).post('/api/admin/drivers').set(auth()).send({ fullName: 'Suresh', phone: '9876500002', licenseNumber: 'MH3120200002' });
    ids.driver2 = d2.body.data._id;
  });

  test('public driver data is never exposed', async () => {
    const res = await request(app).get('/api/public/vehicles');
    assert.equal(res.status, 200);
    const car = res.body.data.items.find((v) => v._id === ids.car);
    assert.ok(car);
    assert.equal(car.assignedDriver, undefined);
    assert.equal(car.registrationNumber, undefined);
    assert.equal(car.startingRate, 14);
    const denied = await request(app).get('/api/admin/drivers');
    assert.equal(denied.status, 401);
  });
});

describe('website settings', () => {
  test('admin edits flow to the public site API', async () => {
    const res = await request(app)
      .put('/api/admin/settings')
      .set(auth())
      .send({
        branding: { companyName: 'Acme Cabs', primaryColor: '#123456', secondaryColor: '#abcdef' },
        contact: { phone: '9876543210', whatsappNumber: '+91 98765 43210', email: 'hi@acme.test' },
        display: { carSelectionEnabled: true, carDisplayMode: 'all_cars' },
      });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    const site = await request(app).get('/api/public/site');
    assert.equal(site.body.data.settings.branding.companyName, 'Acme Cabs');
    assert.equal(site.body.data.settings.display.carDisplayMode, 'all_cars');
    assert.equal(site.body.data.settings.legal, undefined); // only flags are public
    const bad = await request(app).put('/api/admin/settings').set(auth()).send({ branding: { primaryColor: 'red' } });
    assert.equal(bad.status, 400);
  });
});

describe('fare estimate & bookings', () => {
  let pickupDate;
  const trip = () => ({
    bookingType: 'outstation',
    tripType: 'one_way',
    pickupCity: ids.Nagpur,
    dropCity: ids.Wardha,
    pickupDate,
    pickupTime: '10:00',
    passengers: 3,
    category: ids.sedan,
    acPreference: 'ac',
  });

  before(() => {
    pickupDate = addDays(todayStr(), 10);
  });

  test('fare estimate is calculated on the server', async () => {
    const res = await request(app).post('/api/public/fare-estimate').send(trip());
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(res.body.data.fare.baseFare, 4200);
    assert.equal(res.body.data.fare.total, 4900); // 4200 + 500 driver + 200 toll
  });

  test('bidirectional route works in reverse', async () => {
    const res = await request(app).post('/api/public/fare-estimate').send({ ...trip(), pickupCity: ids.Wardha, dropCity: ids.Nagpur });
    assert.equal(res.status, 200);
  });

  test('unavailable route returns a helpful message', async () => {
    const res = await request(app).post('/api/public/fare-estimate').send({ ...trip(), dropCity: ids.Pune });
    assert.equal(res.status, 422);
    assert.match(res.body.message, /don't have a scheduled route/);
  });

  test('validation errors for missing outstation fields', async () => {
    const res = await request(app).post('/api/public/fare-estimate').send({ ...trip(), dropCity: '', tripType: '' });
    assert.equal(res.status, 400);
    assert.ok(res.body.details.some((d) => d.field === 'dropCity'));
  });

  test('past pickup times are rejected', async () => {
    const res = await request(app).post('/api/public/fare-estimate').send({ ...trip(), pickupDate: addDays(todayStr(), -1) });
    assert.equal(res.status, 422);
  });

  test('booking submission ignores client fare, saves snapshot & returns WhatsApp URL', async () => {
    const res = await request(app)
      .post('/api/public/bookings')
      .send({ ...trip(), vehicle: ids.car, customerName: 'Asha Rao', customerPhone: '98765 12345', fare: { total: 1 }, total: 1 });
    assert.equal(res.status, 201, JSON.stringify(res.body));
    const { booking, whatsappUrl, whatsappMessage } = res.body.data;
    assert.match(booking.bookingRef, /^DE\d{10}$/);
    assert.equal(booking.fare.total, 4900);
    assert.equal(booking.status, 'pending');
    assert.ok(whatsappUrl.startsWith('https://wa.me/919876543210?text='));
    assert.equal(decodeURIComponent(whatsappUrl.split('?text=')[1]), whatsappMessage);
    assert.match(whatsappMessage, new RegExp(booking.bookingRef));
    const saved = await models.Booking.findOne({ bookingRef: booking.bookingRef });
    assert.ok(saved, 'booking persisted');
    assert.equal(saved.fare.total, 4900);
    assert.equal(saved.statusHistory.length, 1);
    ids.booking1 = String(saved._id);
    ids.ref1 = booking.bookingRef;
    const customer = await models.Customer.findOne({ phone: '9876512345' });
    assert.equal(customer.totalBookings, 1);
  });

  test('customer can track booking with reference + phone only', async () => {
    const ok = await request(app).get(`/api/public/bookings/${ids.ref1}?phone=9876512345`);
    assert.equal(ok.status, 200);
    const wrong = await request(app).get(`/api/public/bookings/${ids.ref1}?phone=9000000000`);
    assert.equal(wrong.status, 404);
  });

  test('pending booking does not block the car by default; approval prevents overlap', async () => {
    const second = await request(app)
      .post('/api/public/bookings')
      .send({ ...trip(), vehicle: ids.car, customerName: 'Bala', customerPhone: '9876512346' });
    assert.equal(second.status, 201);
    ids.booking2 = String((await models.Booking.findOne({ bookingRef: second.body.data.booking.bookingRef }))._id);

    const approve1 = await request(app).patch(`/api/admin/bookings/${ids.booking1}/status`).set(auth()).send({ status: 'approved' });
    assert.equal(approve1.status, 200, JSON.stringify(approve1.body));
    const approve2 = await request(app).patch(`/api/admin/bookings/${ids.booking2}/status`).set(auth()).send({ status: 'approved' });
    assert.equal(approve2.status, 409);
    assert.ok(approve2.body.details.some((d) => /already booked/.test(d)));

    // once the car is held, new customer requests for it are refused
    const third = await request(app)
      .post('/api/public/bookings')
      .send({ ...trip(), vehicle: ids.car, customerName: 'Chetan', customerPhone: '9876512347' });
    assert.equal(third.status, 409);

    // assigning a different car to booking 2 resolves the conflict
    const assign = await request(app).patch(`/api/admin/bookings/${ids.booking2}/assign`).set(auth()).send({ vehicle: ids.car2 });
    assert.equal(assign.status, 200, JSON.stringify(assign.body));
    const approve2b = await request(app).patch(`/api/admin/bookings/${ids.booking2}/status`).set(auth()).send({ status: 'approved' });
    assert.equal(approve2b.status, 200);
  });

  test('driver assignment prevents double booking a driver', async () => {
    const a = await request(app).patch(`/api/admin/bookings/${ids.booking1}/assign`).set(auth()).send({ driver: ids.driver });
    assert.equal(a.status, 200);
    assert.equal(a.body.data.assignedDriver.fullName, 'Ramesh');
    const b = await request(app).patch(`/api/admin/bookings/${ids.booking2}/assign`).set(auth()).send({ driver: ids.driver });
    assert.equal(b.status, 409);
    const c = await request(app).patch(`/api/admin/bookings/${ids.booking2}/assign`).set(auth()).send({ driver: ids.driver2 });
    assert.equal(c.status, 200);
    const history = await request(app).get(`/api/admin/drivers/${ids.driver}/bookings`).set(auth());
    assert.equal(history.body.data.items.length, 1);
  });

  test('invalid status transitions are rejected; history is timestamped', async () => {
    const bad = await request(app).patch(`/api/admin/bookings/${ids.booking1}/status`).set(auth()).send({ status: 'completed' });
    assert.equal(bad.status, 422);
    const ok = await request(app).patch(`/api/admin/bookings/${ids.booking1}/status`).set(auth()).send({ status: 'confirmed', note: 'Called customer' });
    assert.equal(ok.status, 200);
    const detail = await request(app).get(`/api/admin/bookings/${ids.booking1}`).set(auth());
    const h = detail.body.data.booking.statusHistory;
    assert.deepEqual(h.map((x) => x.status).filter((s, i, a) => a.indexOf(s) === i), ['pending', 'approved', 'confirmed']);
    assert.ok(h.every((x) => x.changedAt));
    assert.equal(h.at(-1).changedByName, 'Owner');
  });

  test('vehicle with upcoming bookings cannot be deleted', async () => {
    const res = await request(app).delete(`/api/admin/vehicles/${ids.car}`).set(auth());
    assert.equal(res.status, 409);
  });

  test('offline payments update payment status', async () => {
    const p1 = await request(app).post('/api/admin/payments').set(auth()).send({ booking: ids.booking1, amount: 2000, method: 'UPI' });
    assert.equal(p1.status, 201, JSON.stringify(p1.body));
    assert.equal(p1.body.data.booking.payment.status, 'partially_paid');
    assert.equal(p1.body.data.booking.payment.pendingAmount, 2900);
    const p2 = await request(app).post('/api/admin/payments').set(auth()).send({ booking: ids.booking1, amount: 2900, method: 'Cash' });
    assert.equal(p2.body.data.booking.payment.status, 'paid');
    const refund = await request(app).post('/api/admin/payments').set(auth()).send({ booking: ids.booking1, amount: 99999, method: 'Cash', type: 'refund' });
    assert.equal(refund.status, 422);
  });

  test('pricing changes do not alter existing booking snapshots', async () => {
    await request(app).put('/api/admin/pricing').set(auth()).send({ defaultRates: { local: { ac: 15, nonAc: 13 }, outstation: { ac: 30, nonAc: 25 } } });
    const saved = await models.Booking.findById(ids.booking1);
    assert.equal(saved.fare.total, 4900);
    const est = await request(app).post('/api/public/fare-estimate').send(trip());
    assert.equal(est.body.data.fare.baseFare, 9000);
  });

  test('holiday blocks bookings on that date; date_open overrides', async () => {
    const holiday = await request(app)
      .post('/api/admin/availability')
      .set(auth())
      .send({ type: 'holiday', title: 'Diwali', startDate: pickupDate, endDate: pickupDate });
    assert.equal(holiday.status, 201, JSON.stringify(holiday.body));
    const res = await request(app).post('/api/public/fare-estimate').send(trip());
    assert.equal(res.status, 422);
    assert.match(res.body.message, /Diwali/);
    await request(app).post('/api/admin/availability').set(auth()).send({ type: 'date_open', startDate: pickupDate, endDate: pickupDate });
    const reopened = await request(app).post('/api/public/fare-estimate').send(trip());
    assert.equal(reopened.status, 200);
  });

  test('blocked time slot is enforced', async () => {
    const d = addDays(pickupDate, 1);
    await request(app).post('/api/admin/availability').set(auth()).send({ type: 'time_block', startDate: d, endDate: d, startTime: '09:00', endTime: '12:00' });
    const res = await request(app).post('/api/public/fare-estimate').send({ ...trip(), pickupDate: d });
    assert.equal(res.status, 422);
    const ok = await request(app).post('/api/public/fare-estimate').send({ ...trip(), pickupDate: d, pickupTime: '13:00' });
    assert.equal(ok.status, 200);
  });

  test('local package booking', async () => {
    const res = await request(app).post('/api/public/bookings').send({
      bookingType: 'local',
      pickupCity: ids.Nagpur,
      localPackage: ids.pkg,
      pickupDate: addDays(pickupDate, 2),
      pickupTime: '09:00',
      passengers: 2,
      category: ids.sedan,
      acPreference: 'ac',
      customerName: 'Local Rider',
      customerPhone: '9876512399',
    });
    assert.equal(res.status, 201, JSON.stringify(res.body));
    assert.equal(res.body.data.booking.fare.total, 2200);
  });

  test('dashboard reflects real data', async () => {
    const res = await request(app).get('/api/admin/dashboard').set(auth());
    assert.equal(res.status, 200);
    const s = res.body.data.stats;
    assert.equal(s.totalBookings, 3);
    assert.equal(s.confirmedBookings, 1);
    assert.equal(s.totalRevenue, 4900);
    assert.equal(s.totalCars, 2);
    assert.equal(s.totalDrivers, 2);
    assert.equal(res.body.data.revenueChart.length, 12);
    assert.ok(res.body.data.topVehicles.length >= 1);
  });

  test('media upload explains missing Cloudinary configuration', async () => {
    const res = await request(app)
      .post('/api/admin/media/upload')
      .set(auth())
      .attach('files', Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex'), { filename: 'a.png', contentType: 'image/png' });
    assert.equal(res.status, 503);
    assert.match(res.body.message, /CLOUDINARY/);
  });

  test('operator injection in query is neutralised', async () => {
    const res = await request(app).get(`/api/public/bookings/${ids.ref1}`).query({ 'phone[$ne]': 'x' });
    assert.equal(res.status, 400);
  });
});
