/**
 * Seeds editable starter data: car categories, cities, routes, local packages,
 * pricing configuration, a sample seasonal rule, demo cars, and website settings.
 *
 *   npm run seed:demo
 *
 * Idempotent — existing records (matched by name) are left untouched.
 * No bookings, customers, drivers or payments are created.
 */
import { env } from '../config/env.js';
import { connectDB, disconnectDB } from '../config/db.js';
import { CarCategory, City, LocalPackage, PricingRule, Route, Testimonial, Vehicle } from '../models/index.js';
import { getPricingConfig, getSettings } from '../services/settingsService.js';

const CATEGORIES = [
  { name: 'Hatchback', seatingCapacity: 4, luggageCapacity: 2, displayOrder: 1, description: 'Compact and economical for city rides and short trips.' },
  { name: 'Sedan', seatingCapacity: 4, luggageCapacity: 3, displayOrder: 2, description: 'Comfortable cars with extra boot space for outstation travel.' },
  { name: 'SUV', seatingCapacity: 7, luggageCapacity: 4, displayOrder: 3, description: 'Spacious 6–7 seaters for families and groups.' },
  { name: 'Premium SUV', seatingCapacity: 7, luggageCapacity: 4, displayOrder: 4, description: 'Top-end SUVs with premium comfort.' },
  { name: 'Luxury', seatingCapacity: 4, luggageCapacity: 3, displayOrder: 5, description: 'Luxury sedans for weddings, events and executives.' },
  { name: 'Tempo Traveller', seatingCapacity: 17, luggageCapacity: 10, displayOrder: 6, description: '12–17 seaters for group tours and pilgrimages.' },
];

const CITIES = [
  { name: 'Nagpur', state: 'Maharashtra', isPopular: true, airportPickup: true, description: 'The Orange City and geographic centre of India.' },
  { name: 'Mumbai', state: 'Maharashtra', isPopular: true, airportPickup: true, description: 'The financial capital, gateway to the Konkan coast.' },
  { name: 'Pune', state: 'Maharashtra', isPopular: true, airportPickup: true, description: 'Cultural capital of Maharashtra with forts and hill stations nearby.' },
  { name: 'Nashik', state: 'Maharashtra', isPopular: true, description: 'Wine capital of India and home to Trimbakeshwar.' },
  { name: 'Amravati', state: 'Maharashtra', description: 'Historic city near the Melghat tiger reserve.' },
  { name: 'Wardha', state: 'Maharashtra', description: 'Home of Sevagram Ashram.' },
  { name: 'Aurangabad', state: 'Maharashtra', isPopular: true, airportPickup: true, description: 'Gateway to the Ajanta and Ellora caves.' },
];

// [from, to, km, minutes, toll]
const ROUTES = [
  ['Nagpur', 'Mumbai', 830, 840, 1450],
  ['Nagpur', 'Pune', 715, 780, 1100],
  ['Nagpur', 'Amravati', 155, 180, 150],
  ['Nagpur', 'Wardha', 78, 100, 0],
  ['Nagpur', 'Aurangabad', 490, 540, 650],
  ['Nagpur', 'Nashik', 680, 720, 1000],
  ['Mumbai', 'Pune', 150, 180, 330],
  ['Mumbai', 'Nashik', 167, 210, 210],
  ['Mumbai', 'Aurangabad', 335, 390, 450],
  ['Pune', 'Nashik', 210, 270, 120],
  ['Pune', 'Aurangabad', 235, 300, 200],
  ['Amravati', 'Wardha', 105, 135, 0],
];

const PACKAGES = [
  { name: '4 Hours / 40 KM', hours: 4, km: 40, basePriceAc: 1100, basePriceNonAc: 950, displayOrder: 1 },
  { name: '8 Hours / 80 KM', hours: 8, km: 80, basePriceAc: 2000, basePriceNonAc: 1750, displayOrder: 2 },
  { name: '12 Hours / 120 KM', hours: 12, km: 120, basePriceAc: 2900, basePriceNonAc: 2500, displayOrder: 3 },
];

// Package multipliers per category (relative to base price)
const PACKAGE_FACTOR = { Hatchback: 1, Sedan: 1.15, SUV: 1.5, 'Premium SUV': 1.9, Luxury: 3, 'Tempo Traveller': 2.4 };

// Outstation per-KM rates by category & fuel [acRate, nonAcRate]; fuel included
const RATES = {
  Hatchback: { any: [11, 10] },
  Sedan: { any: [12, 11], diesel: [12, 11], petrol: [13, 12] },
  SUV: { any: [16, 15], diesel: [16, 15] },
  'Premium SUV': { any: [20, 18] },
  Luxury: { any: [35, 35] },
  'Tempo Traveller': { any: [24, 22] },
};

const VEHICLES = [
  { name: 'Maruti Swift', brand: 'Maruti Suzuki', model: 'Swift', category: 'Hatchback', seatingCapacity: 4, luggageCapacity: 2, fuelType: 'petrol', acType: 'both' },
  { name: 'Maruti Dzire', brand: 'Maruti Suzuki', model: 'Dzire', category: 'Sedan', seatingCapacity: 4, luggageCapacity: 3, fuelType: 'cng', acType: 'both' },
  { name: 'Honda City', brand: 'Honda', model: 'City', category: 'Sedan', seatingCapacity: 4, luggageCapacity: 3, fuelType: 'petrol', acType: 'ac' },
  { name: 'Toyota Innova Crysta', brand: 'Toyota', model: 'Innova Crysta', category: 'SUV', seatingCapacity: 7, luggageCapacity: 4, fuelType: 'diesel', acType: 'both' },
  { name: 'Maruti Ertiga', brand: 'Maruti Suzuki', model: 'Ertiga', category: 'SUV', seatingCapacity: 6, luggageCapacity: 3, fuelType: 'cng', acType: 'both' },
  { name: 'Toyota Fortuner', brand: 'Toyota', model: 'Fortuner', category: 'Premium SUV', seatingCapacity: 7, luggageCapacity: 4, fuelType: 'diesel', acType: 'ac', minimumBookingAmount: 4000 },
  { name: 'Mercedes-Benz E-Class', brand: 'Mercedes-Benz', model: 'E-Class', category: 'Luxury', seatingCapacity: 4, luggageCapacity: 3, fuelType: 'diesel', acType: 'ac', minimumBookingAmount: 8000 },
  { name: 'Force Tempo Traveller 12+1', brand: 'Force', model: 'Traveller', category: 'Tempo Traveller', seatingCapacity: 12, luggageCapacity: 8, fuelType: 'diesel', acType: 'both' },
];

const ci = { collation: { locale: 'en', strength: 2 } };
const findByName = (Model, name) => Model.findOne({ name }).collation(ci.collation);

async function upsertByName(Model, data) {
  const existing = await findByName(Model, data.name);
  if (existing) return { doc: existing, created: false };
  return { doc: await Model.create(data), created: true };
}

async function run() {
  if (!env.mongoUri) throw new Error('MONGODB_URI is not set in server/.env');
  await connectDB(env.mongoUri);
  const log = (label, created) => console.log(`${created ? '✔ created' : '• exists '}  ${label}`);

  const cat = {};
  for (const c of CATEGORIES) {
    const { doc, created } = await upsertByName(CarCategory, c);
    cat[c.name] = doc;
    log(`category ${c.name}`, created);
  }

  const city = {};
  for (const [i, c] of CITIES.entries()) {
    const { doc, created } = await upsertByName(City, { ...c, displayOrder: i + 1 });
    city[c.name] = doc;
    log(`city ${c.name}`, created);
  }

  for (const [from, to, km, minutes, toll] of ROUTES) {
    const exists = await Route.findOne({
      $or: [
        { fromCity: city[from]._id, toCity: city[to]._id },
        { fromCity: city[to]._id, toCity: city[from]._id },
      ],
    });
    if (!exists) {
      await Route.create({
        fromCity: city[from]._id,
        toCity: city[to]._id,
        distanceKm: km,
        durationMinutes: minutes,
        tollCharges: toll,
        isBidirectional: true,
        isPopular: ['Mumbai', 'Pune', 'Nashik'].includes(to) && from !== 'Pune',
      });
    }
    log(`route ${from} ⇄ ${to}`, !exists);
  }

  for (const p of PACKAGES) {
    const exists = await LocalPackage.findOne({ hours: p.hours, km: p.km });
    if (!exists) {
      await LocalPackage.create({
        ...p,
        categoryPrices: Object.entries(PACKAGE_FACTOR).map(([name, f]) => ({
          category: cat[name]._id,
          priceAc: Math.round((p.basePriceAc * f) / 50) * 50,
          priceNonAc: name === 'Luxury' ? 0 : Math.round((p.basePriceNonAc * f) / 50) * 50,
        })),
      });
    }
    log(`package ${p.name}`, !exists);
  }

  const pricing = await getPricingConfig();
  if (!pricing.rateTable.length) {
    const rows = [];
    for (const [name, byFuel] of Object.entries(RATES)) {
      for (const [fuel, [acRate, nonAcRate]] of Object.entries(byFuel)) {
        rows.push({ label: `${name} (${fuel})`, bookingType: 'outstation', category: cat[name]._id, fuelType: fuel, acRate, nonAcRate });
        rows.push({ label: `${name} (${fuel}) local extra KM`, bookingType: 'local', category: cat[name]._id, fuelType: fuel, acRate: acRate + 2, nonAcRate: nonAcRate + 2 });
      }
    }
    pricing.rateTable = rows;
    await pricing.save();
    log('pricing rate table', true);
  } else log('pricing rate table', false);

  const rules = [
    { name: 'Weekend surcharge', ruleType: 'weekend', daysOfWeek: [0, 6], adjustmentType: 'percentage', adjustmentValue: 5, priority: 10, isActive: true, description: 'Sample rule: +5% on Saturday & Sunday pickups.' },
    { name: 'Festival season (sample)', ruleType: 'festival', adjustmentType: 'percentage', adjustmentValue: 15, priority: 50, isActive: false, description: 'Set dates and activate for festivals.' },
  ];
  for (const r of rules) {
    const { created } = await upsertByName(PricingRule, r);
    log(`pricing rule ${r.name}`, created);
  }

  for (const [i, v] of VEHICLES.entries()) {
    const { created } = await upsertByName(Vehicle, {
      ...v,
      category: cat[v.category]._id,
      displayOrder: i + 1,
      features: ['Experienced driver', 'Clean & sanitised', 'Music system'],
      description: `${v.name} — ${v.seatingCapacity} seater, ideal for ${v.seatingCapacity > 7 ? 'group travel' : 'local and outstation trips'}.`,
    });
    log(`car ${v.name}`, created);
  }

  // Sample testimonials are created INACTIVE: replace them with genuine reviews before enabling.
  const sampleTestimonials = [
    { customerName: 'Sample Customer', location: 'Nagpur', rating: 5, message: 'Replace this sample with a genuine customer review, then activate it.', isActive: false },
  ];
  for (const t of sampleTestimonials) {
    const exists = await Testimonial.findOne({ customerName: t.customerName });
    if (!exists) await Testimonial.create(t);
    log('sample testimonial (inactive)', !exists);
  }

  await getSettings();
  log('website settings', false);
  console.log('\nDone. Set your contact & WhatsApp number in Admin → Contact Information.');
  await disconnectDB();
}

run().catch(async (err) => {
  console.error(`✖ ${err.message}`);
  await disconnectDB().catch(() => {});
  process.exit(1);
});
