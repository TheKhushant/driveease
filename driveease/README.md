# DriveEase — Car Rental, Local Taxi & Outstation Booking (MERN)

A complete car booking and travel management system:

- **Public website**: booking form with live server-side fare estimates, car selection, booking tracking, contact and legal pages. All content comes from the admin panel.
- **Admin panel**: dashboard, bookings, customers, fleet, drivers, cities, routes, pricing, seasonal rules, availability calendar, local packages, offline payments, website content, media library, testimonials, contact info, settings and profile.

"DriveEase" is a placeholder brand. Company name, logo, colours, text and images can all be changed in **Admin → Website Content**.

```
driveease/
├── client/   React 18 + Vite + Tailwind CSS + React Router + Axios + React Hook Form + lucide-react
├── server/   Node + Express + MongoDB (Mongoose) + JWT + bcryptjs + Cloudinary + zod
│   ├── config/ controllers/ middleware/ models/ routes/ services/ validators/ utils/ scripts/ tests/
├── render.yaml   Render blueprint for the API
└── README.md
```

---

## 1. Installation

Requirements: **Node.js 18.18+** (tested on Node 24) and a MongoDB database (local, or Atlas free tier).

```bash
cd driveease/server
npm install
cp .env.example .env        # Windows PowerShell: Copy-Item .env.example .env

cd ../client
npm install
cp .env.example .env        # optional for local dev
```

## 2. Environment variables

### `server/.env`

| Variable | Required | Description |
|---|---|---|
| `PORT` | no | API port (default `5000`) |
| `MONGODB_URI` | **yes** | MongoDB connection string (see §3) |
| `JWT_SECRET` | **yes** | Long random string (32+ characters). Generate one: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `JWT_EXPIRES_IN` | no | Admin session length (default `7d`) |
| `CLIENT_URL` | **yes in production** | Allowed frontend origin(s) for CORS, comma-separated (default `http://localhost:5173`) |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | for uploads | From the Cloudinary dashboard (see below) |
| `CLOUDINARY_FOLDER` | no | Root folder for uploads (default `driveease`) |
| `ADMIN_NAME` / `ADMIN_EMAIL` / `ADMIN_PASSWORD` | for setup | Used only by `npm run seed:admin` |
| `TZ_OFFSET_MINUTES` | no | Business timezone offset from UTC (India = `330`) used to interpret pickup dates and times |

The server refuses to start if `MONGODB_URI` or `JWT_SECRET` is missing. In production it also refuses a `JWT_SECRET` shorter than 32 characters.

**Cloudinary setup:** create a free account at cloudinary.com, open *Dashboard → API Keys*, and copy the cloud name, API key and API secret into `server/.env`, then restart the API. Until Cloudinary is configured, upload buttons are disabled with an explanation, and you can still paste image URLs.

### `client/.env`

| Variable | Description |
|---|---|
| `VITE_API_URL` | Full API base **including `/api`**, e.g. `https://driveease-api.onrender.com/api`. Leave empty locally: Vite proxies `/api` to `http://localhost:5000`. |

No credentials ever go in the client.

## 3. MongoDB connection

- **Local:** install MongoDB Community Server and use `MONGODB_URI=mongodb://127.0.0.1:27017/driveease`.
- **Atlas:** create a free cluster, then a database user (*Database Access*), and allow your IP (*Network Access*; use `0.0.0.0/0` for Render). Copy the connection string:
  `MONGODB_URI=mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/driveease?retryWrites=true&w=majority`
  URL-encode special characters in the password.

Check connectivity: `cd server && npm run check:db` (it pings the database and lists collection counts).

## 4. Create the first admin

There is **no public registration**. Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` (8+ characters, with letters and numbers) in `server/.env`, then run:

```bash
cd server
npm run seed:admin                      # creates a superadmin (does nothing if it already exists)
npm run seed:admin -- --reset-password  # resets that admin's password to ADMIN_PASSWORD
npm run seed:demo                       # optional: starter categories, 7 cities, 12 routes, 3 packages, rate table, sample rule, 8 cars
```

`seed:demo` can be run more than once without duplicating anything. It does not create bookings, customers, drivers or payments. The one sample testimonial it creates is **inactive**: replace it with a genuine review before enabling it. Seeded cars have no photos, so upload them in **Cars & Vehicles**.

Roles: `superadmin` and `admin` can do everything. `manager` can work with bookings, payments and customers, and can view (but not change) configuration.

## 5. Run in development

```bash
# terminal 1
cd server && npm run dev        # http://localhost:5000  (health check: /api/health)

# terminal 2
cd client && npm run dev        # http://localhost:5173  — admin panel at /admin
```

Production build of the client: `cd client && npm run build` (output goes to `client/dist`).

## 6. How things work

### Fare engine (`server/services/fareService.js`)
- Fuel is **included** in every per-KM rate and is never added again.
- **Outstation per-KM rate**, first match wins:
  1. route-specific rate for the category
  2. the selected car's own rate
  3. the most specific row of the rate table (category + fuel, then category, then fuel, then any)
  4. default rates
- **One-way:** billable km = max(distance, one-way minimum). **Round-trip:** billable km = max(2 × distance, min km/day × days). Each has a rate multiplier.
- **Local:** price of the selected package, per category if set, otherwise the package base price (AC or non-AC).
- **Total** = base + one seasonal adjustment + driver allowance + night charge + tolls + parking (+ minimum-fare top-up + GST on everything except tolls and parking).
  Example: 300 km × ₹14 = ₹4,200, + driver ₹500 + toll ₹200 + night ₹300 = **₹5,200**. This exact case is a unit test.
- **Seasonal rules never stack.** Only one rule applies: the highest-priority active match. Ties go to the more specific rule, then to the most recently updated.
- The browser only *displays* estimates. The server recalculates on every estimate and every booking, ignores any fare the client sends, and saves the full breakdown plus the rates used as a **snapshot** on the booking. Later rate changes never alter existing bookings. An admin can set a separate *final amount*.

### Availability
- **Booking rules** (Website Settings): operating hours, closed weekdays, minimum notice, how far ahead customers can book, maximum trip length, and local/outstation on/off switches.
- **Availability Calendar**: holidays, blocked dates, force-open dates, blocked time slots, vehicle blocks, driver blocks, and restrictions (optionally per city or per booking type).
- A vehicle or driver is double-booked only by **approved, confirmed or in-progress** bookings with overlapping trip windows. Pending requests do not block a car unless you turn on *"Pending requests block the selected car"*. The overlap check runs on approval, confirmation, start and every assignment.

### Booking flow and WhatsApp
1. The customer fills in the form. The fare estimate updates live from the server.
2. On submit, the server validates, recalculates and **saves the booking to MongoDB first**, then returns a booking reference and a `wa.me` link with a URL-encoded summary.
3. The confirmation page offers a "Send booking details on WhatsApp" button. It states clearly that the message is only sent when the customer presses Send in WhatsApp. Nothing is sent automatically, and no WhatsApp Business API is used.
4. The admin reviews the booking, approves or rejects it, assigns a vehicle and driver (conflicts are shown), and moves it through Confirmed → In Progress → Completed, or cancels it. Every change is stored with a timestamp and the admin's name.

Set the WhatsApp number in **Admin → Contact Information** (include the country code; a 10-digit number is treated as +91).

### Payments
Offline only (cash, UPI, or other methods you configure). There is no gateway. Record payments and refunds per booking. Payment status (unpaid, partially paid, paid) and the pending amount are recalculated automatically.

## 7. Testing

```bash
cd server && npm test
```

44 automated tests: pricing-engine unit tests plus end-to-end API tests against an in-memory MongoDB, which is downloaded automatically on the first run. They cover:
- admin login, JWT protection and roles
- CRUD for categories, cities, routes, packages, pricing rules, vehicles and drivers
- pricing config, fare calculation, server-side fare enforcement and pricing snapshots
- WhatsApp URL generation and encoding
- booking submission, approval, invalid status changes and status history
- overlap prevention for vehicles and drivers, holidays, time slots and force-open dates
- payments, website settings, the dashboard, Cloudinary-missing handling and query-injection protection

**Manual checklist after setup**
1. `npm run check:db`, then open `/api/health`. It should report `db: connected`.
2. Log in at `/admin/login` with your seeded admin.
3. **Contact Information**: set the phone and WhatsApp number. **Website Content**: change the company name or colour, then reload the site.
4. **Pricing Management**: use the *Fare calculator tester* at the bottom of the page.
5. On the website, use **Book a ride**: pick Nagpur → Mumbai, choose a car, and submit. Note the reference and use the WhatsApp button.
6. **Admin → Bookings**: open the booking, assign a vehicle and driver, approve, confirm and record a payment.
7. Submit a second booking for the same car and time, and try to approve it. You get a conflict.
8. **Availability Calendar**: add a holiday on a date, then try to book that date. It is refused.
9. **Media & Images** (after configuring Cloudinary): upload a car photo and use it in **Cars & Vehicles**.

## 8. Deployment

### API on Render
1. Push the repository to GitHub.
2. In Render, choose **New → Blueprint**, select the repo, and it reads `render.yaml`. Alternatively, create a **Web Service** with root directory `server`, build command `npm ci --omit=dev`, start command `npm start` and health check `/api/health`.
3. Set the environment variables: `MONGODB_URI` (Atlas, with network access allowing `0.0.0.0/0`), `CLIENT_URL` (your Vercel URL, e.g. `https://driveease.vercel.app`), the `CLOUDINARY_*` values, and `ADMIN_EMAIL` / `ADMIN_PASSWORD`. `JWT_SECRET` is generated automatically.
4. After the first deploy, open the service's **Shell** and run `npm run seed:admin` (and optionally `npm run seed:demo`). Alternatively, run the scripts from your machine with the production `MONGODB_URI`.

### Website on Vercel
1. In Vercel, choose **New Project**, import the repo, and set **Root Directory** to `client`. Vercel detects the framework as Vite: build `npm run build`, output `dist`.
2. Add the environment variable `VITE_API_URL=https://<your-render-service>.onrender.com/api`, then redeploy.
3. `client/vercel.json` already rewrites all routes to `index.html`, so `/admin/...` and `/book` work on refresh.
4. Make sure Render's `CLIENT_URL` exactly matches the Vercel domain (comma-separate custom domains too).

Note: Render's free instances sleep when idle, so the first request after a pause can take about 30–50 seconds.

## Security summary
- bcrypt (12 rounds) password hashing. JWTs are invalidated after a password change.
- There is no public sign-up. All `/api/admin/*` routes need a valid token, with role checks.
- Rate limiting on login, fare estimates, booking submission and the API overall.
- Helmet, a CORS whitelist, body size limits, and stripping of `$`/`.` keys to block MongoDB operator injection.
- zod validation on public input and Mongoose schema validation everywhere.
- Upload checks: MIME whitelist (no SVG), file signature check, and a 5 MB limit.
- Generic error responses in production. Driver data and vehicle registration numbers are never exposed through public APIs.
