/**
 * Sensible defaults used to initialise the singleton settings documents the first
 * time they are read. Everything here is editable from the admin panel.
 */
export const DEFAULT_SETTINGS = {
  branding: {
    companyName: 'DriveEase',
    tagline: 'Local rides & outstation trips, made effortless',
    primaryColor: '#0f766e',
    secondaryColor: '#f59e0b',
  },
  hero: {
    heading: 'Travel in comfort, arrive on time',
    subheading: 'Car rental • Local taxi • Outstation trips',
    description:
      'Book clean, well-maintained cars with experienced drivers. Transparent fares, no hidden charges, and 24×7 support for every trip.',
    bannerImages: [],
    ctaText: 'Get fare estimate',
  },
  about: {
    title: 'Your trusted travel partner',
    content:
      'We provide reliable local and outstation cab services with a fleet of hatchbacks, sedans, SUVs and tempo travellers. Every trip is handled by verified, courteous drivers and priced transparently.',
    stats: [
      { label: 'Happy customers', value: '5,000+' },
      { label: 'Cities served', value: '25+' },
      { label: 'Fleet size', value: '50+' },
      { label: 'Years of service', value: '8+' },
    ],
  },
  services: [
    { title: 'Local Rentals', description: 'Hourly packages for city travel, shopping and meetings.', icon: 'MapPin' },
    { title: 'Outstation Trips', description: 'One-way and round-trip journeys between cities.', icon: 'Route' },
    { title: 'Airport Transfers', description: 'On-time pickups and drops for every flight.', icon: 'Plane' },
    { title: 'Corporate Travel', description: 'Dedicated cars and monthly billing for businesses.', icon: 'Briefcase' },
    { title: 'Wedding & Events', description: 'Premium and luxury cars for your special day.', icon: 'Sparkles' },
    { title: 'Group Tours', description: 'Tempo travellers for family and group trips.', icon: 'Users' },
  ],
  whyChooseUs: [
    { title: 'Transparent pricing', description: 'See the full fare breakdown before you book.', icon: 'BadgeIndianRupee' },
    { title: 'Verified drivers', description: 'Experienced, background-checked and courteous.', icon: 'ShieldCheck' },
    { title: 'Clean, sanitised cars', description: 'Regularly serviced and cleaned before every trip.', icon: 'Sparkles' },
    { title: '24×7 support', description: 'Call or WhatsApp us any time during your trip.', icon: 'Headphones' },
  ],
  faqs: [
    {
      question: 'How do I pay for my trip?',
      answer: 'Payment is collected directly by the driver or our office in cash or UPI. No online payment is required to book.',
    },
    {
      question: 'Are tolls and parking included in the fare?',
      answer: 'The fare breakdown shows estimated tolls and parking. Actual tolls, parking and state taxes are charged as applicable.',
    },
    {
      question: 'How will I know my booking is confirmed?',
      answer: 'After you submit a request you get a booking reference. Our team reviews it and confirms on call or WhatsApp.',
    },
    {
      question: 'Can I cancel my booking?',
      answer: 'Yes. Contact us with your booking reference. Please see our cancellation policy for details.',
    },
  ],
  contact: {
    phone: '',
    whatsappNumber: '',
    email: '',
    address: '',
    workingHours: 'Open 24 × 7',
  },
  social: {},
  footer: {
    text: 'Comfortable, safe and affordable car rentals for local and outstation travel.',
    copyright: '',
  },
  legal: {
    terms:
      'Fares shown on the website are estimates. Final charges depend on actual kilometres, hours, tolls, parking and permits. Extra kilometres and hours are charged at the published rates. Bookings are confirmed only after confirmation from our team.',
    privacy:
      'We collect your name, phone number, email and trip details only to process your booking and contact you about it. We do not sell your data to third parties.',
    cancellationPolicy: 'Free cancellation up to 6 hours before pickup. Please contact us to cancel.',
  },
  seo: {
    title: 'DriveEase — Car Rental, Local Taxi & Outstation Cabs',
    description: 'Book local taxis, car rentals and outstation cabs with transparent fares and verified drivers.',
    keywords: 'car rental, taxi, outstation cab, local taxi, one way cab',
  },
  paymentMethods: ['Cash', 'UPI'],
};

export const DEFAULT_PRICING = {
  currency: 'INR',
  currencySymbol: '₹',
  defaultRates: {
    local: { ac: 14, nonAc: 12 },
    outstation: { ac: 13, nonAc: 11 },
  },
  rateTable: [],
  driverAllowance: { local: 0, outstationPerDay: 300 },
  nightCharges: { amount: 250, startTime: '22:00', endTime: '06:00' },
  extraKmCharge: { ac: 0, nonAc: 0 },
  extraHourCharge: { ac: 150, nonAc: 120 },
  waitingCharges: { perHour: 100, freeMinutes: 30 },
  tollCharges: { defaultOutstation: 0, includeInEstimate: true },
  parkingCharges: { local: 0, outstation: 0 },
  minimumFare: { local: 0, outstation: 1500 },
  oneWay: { minKm: 0, rateMultiplier: 1 },
  roundTrip: { minKmPerDay: 250, rateMultiplier: 1 },
  gstPercent: 0,
  notes: 'Fuel is included in the per-KM rate. Tolls, parking and state permits are charged as actuals if they differ from the estimate.',
};
