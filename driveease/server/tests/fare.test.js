import { test } from 'node:test';
import assert from 'node:assert/strict';

process.env.NODE_ENV = 'test';
process.env.TZ_OFFSET_MINUTES = '330';
const { computeFare, selectPricingRule, resolvePerKmRate } = await import('../services/fareService.js');
const { buildBookingMessage, buildWhatsAppUrl, normalizeWhatsAppNumber } = await import('../services/whatsappService.js');
const { isTimeInWindow, toInstant } = await import('../utils/dateTime.js');

const baseConfig = {
  currency: 'INR',
  defaultRates: { local: { ac: 14, nonAc: 12 }, outstation: { ac: 14, nonAc: 12 } },
  rateTable: [],
  driverAllowance: { local: 0, outstationPerDay: 500 },
  nightCharges: { amount: 300, startTime: '22:00', endTime: '06:00' },
  extraKmCharge: { ac: 0, nonAc: 0 },
  extraHourCharge: { ac: 150, nonAc: 120 },
  waitingCharges: { perHour: 0, freeMinutes: 0 },
  tollCharges: { defaultOutstation: 0, includeInEstimate: true },
  parkingCharges: { local: 0, outstation: 0 },
  minimumFare: { local: 0, outstation: 0 },
  oneWay: { minKm: 0, rateMultiplier: 1 },
  roundTrip: { minKmPerDay: 250, rateMultiplier: 1 },
  gstPercent: 0,
};
const route = { _id: 'r1', distanceKm: 300, durationMinutes: 300, tollCharges: 200, parkingCharges: 0, categoryPricing: [] };
const oneWay = { bookingType: 'outstation', tripType: 'one_way', pickupDate: '2030-01-08', pickupTime: '23:00', acPreference: 'ac' }; // Tuesday

test('spec example: 300 km × ₹14 + driver 500 + toll 200 + night 300 = ₹5,200', () => {
  const fare = computeFare({ input: oneWay, config: baseConfig, route });
  assert.equal(fare.baseFare, 4200);
  assert.equal(fare.driverAllowance, 500);
  assert.equal(fare.tollCharges, 200);
  assert.equal(fare.nightCharges, 300);
  assert.equal(fare.total, 5200);
  assert.equal(fare.rateSource, 'default');
  // fuel is never added as a separate line
  assert.ok(!fare.items.some((i) => /fuel|petrol|diesel/i.test(i.label)));
});

test('no night charge for daytime pickup', () => {
  const fare = computeFare({ input: { ...oneWay, pickupTime: '09:00' }, config: baseConfig, route });
  assert.equal(fare.nightCharges, 0);
  assert.equal(fare.total, 4900);
});

test('rate resolution: route > vehicle > most specific table row > default', () => {
  const config = {
    ...baseConfig,
    rateTable: [
      { bookingType: 'outstation', category: null, fuelType: 'any', acRate: 15, nonAcRate: 13 },
      { bookingType: 'outstation', category: 'sedan', fuelType: 'any', acRate: 16, nonAcRate: 14 },
      { bookingType: 'outstation', category: 'sedan', fuelType: 'diesel', acRate: 17, nonAcRate: 15 },
    ],
  };
  assert.deepEqual(resolvePerKmRate({ bookingType: 'outstation', ac: 'ac', category: 'suv', config }), { rate: 15, source: 'rate_table' });
  assert.deepEqual(resolvePerKmRate({ bookingType: 'outstation', ac: 'ac', category: 'sedan', config }), { rate: 16, source: 'rate_table' });
  const dieselCar = { fuelType: 'diesel', perKmRate: 0, nonAcPerKmRate: 0 };
  assert.equal(resolvePerKmRate({ bookingType: 'outstation', ac: 'non_ac', category: 'sedan', vehicle: dieselCar, config }).rate, 15);
  const pricedCar = { fuelType: 'diesel', perKmRate: 19, nonAcPerKmRate: 18 };
  assert.deepEqual(resolvePerKmRate({ bookingType: 'outstation', ac: 'ac', category: 'sedan', vehicle: pricedCar, config }), { rate: 19, source: 'vehicle' });
  const r = { categoryPricing: [{ category: 'sedan', perKmRate: 21, nonAcPerKmRate: 0 }] };
  assert.deepEqual(resolvePerKmRate({ bookingType: 'outstation', ac: 'ac', category: 'sedan', vehicle: pricedCar, route: r, config }), { rate: 21, source: 'route' });
  // non-AC not overridden on the route → falls through to vehicle
  assert.equal(resolvePerKmRate({ bookingType: 'outstation', ac: 'non_ac', category: 'sedan', vehicle: pricedCar, route: r, config }).source, 'vehicle');
});

test('seasonal rules: only the highest-priority matching rule applies (no stacking)', () => {
  const rules = [
    { _id: 'a', name: 'Weekday', daysOfWeek: [1, 2, 3, 4, 5], adjustmentType: 'percentage', adjustmentValue: 5, priority: 1, isActive: true },
    { _id: 'b', name: 'Festival', startDate: '2030-01-01', endDate: '2030-01-15', adjustmentType: 'percentage', adjustmentValue: 20, priority: 50, isActive: true },
    { _id: 'c', name: 'Inactive', adjustmentType: 'flat', adjustmentValue: 9999, priority: 999, isActive: false },
    { _id: 'd', name: 'Local only', bookingType: 'local', adjustmentType: 'flat', adjustmentValue: 500, priority: 900, isActive: true },
  ];
  const fare = computeFare({ input: { ...oneWay, pickupTime: '09:00' }, config: baseConfig, route, rules });
  assert.equal(fare.seasonalRule.name, 'Festival');
  assert.equal(fare.seasonalAdjustment, 840); // 20% of 4200
  assert.equal(fare.total, 4200 + 840 + 500 + 200);
  assert.equal(fare.items.filter((i) => i.key === 'seasonal').length, 1);

  const outside = selectPricingRule(rules, { date: '2030-02-05', bookingType: 'outstation' }); // Tuesday
  assert.equal(outside.name, 'Weekday');
  assert.equal(selectPricingRule(rules, { date: '2030-02-09', bookingType: 'outstation' }), null); // Saturday
});

test('category & fuel scoped rules only match when applicable', () => {
  const rules = [{ name: 'Diesel SUV', categories: ['suv'], fuelTypes: ['diesel'], adjustmentType: 'per_km', adjustmentValue: 2, priority: 5, isActive: true }];
  assert.equal(selectPricingRule(rules, { date: '2030-01-08', bookingType: 'outstation', categoryId: 'suv', fuelType: 'petrol' }), null);
  const fare = computeFare({
    input: { ...oneWay, pickupTime: '09:00' },
    config: baseConfig,
    route,
    rules,
    category: 'suv',
    vehicle: { fuelType: 'diesel', category: 'suv' },
  });
  assert.equal(fare.seasonalAdjustment, 600); // 300 km × ₹2
});

test('round trip uses min km/day, doubles distance & tolls, allowance per day', () => {
  const fare = computeFare({
    input: { bookingType: 'outstation', tripType: 'round_trip', pickupDate: '2030-01-08', pickupTime: '09:00', returnDate: '2030-01-10', acPreference: 'ac' },
    config: baseConfig,
    route: { ...route, distanceKm: 200 },
  });
  assert.equal(fare.distanceKm, 400);
  assert.equal(fare.tripDays, 3);
  assert.equal(fare.billableKm, 750); // 250 × 3 > 400
  assert.equal(fare.baseFare, 750 * 14);
  assert.equal(fare.tollCharges, 400);
  assert.equal(fare.driverAllowance, 1500);
});

test('local package pricing uses category price, then base price; minimum fare applied', () => {
  const pkg = { _id: 'p', name: '8 Hours / 80 KM', hours: 8, km: 80, basePriceAc: 2000, basePriceNonAc: 1800, categoryPrices: [{ category: 'suv', priceAc: 3000, priceNonAc: 0 }], extraKmRate: 0, extraHourRate: 0 };
  const input = { bookingType: 'local', pickupDate: '2030-01-08', pickupTime: '09:00', acPreference: 'ac' };
  assert.equal(computeFare({ input, config: baseConfig, localPackage: pkg, category: 'suv' }).total, 3000);
  assert.equal(computeFare({ input: { ...input, acPreference: 'non_ac' }, config: baseConfig, localPackage: pkg, category: 'suv' }).total, 1800);
  const f = computeFare({ input, config: { ...baseConfig, minimumFare: { local: 2500, outstation: 0 } }, localPackage: pkg, category: 'sedan' });
  assert.equal(f.minimumFareAdjustment, 500);
  assert.equal(f.total, 2500);
  assert.equal(f.extraHourRate, 150);
  // local drop after 22:00 → night charge
  assert.equal(computeFare({ input: { ...input, pickupTime: '16:00' }, config: baseConfig, localPackage: pkg }).nightCharges, 300);
});

test('GST excludes tolls and parking', () => {
  const fare = computeFare({ input: { ...oneWay, pickupTime: '09:00' }, config: { ...baseConfig, gstPercent: 5 }, route });
  assert.equal(fare.gst, Math.round((4200 + 500) * 0.05));
});

test('time window helpers handle overnight windows and timezone', () => {
  assert.equal(isTimeInWindow('23:30', '22:00', '06:00'), true);
  assert.equal(isTimeInWindow('05:59', '22:00', '06:00'), true);
  assert.equal(isTimeInWindow('06:00', '22:00', '06:00'), false);
  assert.equal(toInstant('2030-01-08', '10:00', 330).toISOString(), '2030-01-08T04:30:00.000Z');
});

test('WhatsApp URL is properly encoded and number normalised', () => {
  assert.equal(normalizeWhatsAppNumber('+91 98765-43210'), '919876543210');
  assert.equal(normalizeWhatsAppNumber('9876543210'), '919876543210');
  const fare = computeFare({ input: oneWay, config: baseConfig, route });
  const msg = buildBookingMessage(
    {
      bookingRef: 'DE3001080001',
      customerName: 'Asha & Co',
      customerPhone: '9999999999',
      bookingType: 'outstation',
      tripType: 'one_way',
      pickupCityName: 'Nagpur',
      dropCityName: 'Wardha',
      pickupDate: '2030-01-08',
      pickupTime: '23:00',
      categoryName: 'Sedan',
      acPreference: 'ac',
      passengers: 3,
      instructions: 'Call at #gate 2?',
      fare,
    },
    { companyName: 'DriveEase' },
  );
  assert.match(msg, /DE3001080001/);
  assert.match(msg, /Estimated Total: ₹5,200/);
  const url = buildWhatsAppUrl('9876543210', msg);
  assert.ok(url.startsWith('https://wa.me/919876543210?text='));
  assert.equal(decodeURIComponent(url.split('?text=')[1]), msg);
  assert.ok(!url.split('?text=')[1].includes('&') && !url.split('?text=')[1].includes('#'));
  assert.equal(buildWhatsAppUrl('', msg), null);
});
