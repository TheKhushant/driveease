/**
 * Creates the initial super-admin from ADMIN_EMAIL / ADMIN_PASSWORD in server/.env.
 *
 *   npm run seed:admin                    # create if it doesn't exist
 *   npm run seed:admin -- --reset-password  # reset the password of that admin
 *
 * There is no public registration endpoint; additional admins must be created here
 * or directly in the database.
 */
import { env } from '../config/env.js';
import { connectDB, disconnectDB } from '../config/db.js';
import { Admin } from '../models/index.js';

async function run() {
  const { email, password, name } = env.admin;
  if (!env.mongoUri) throw new Error('MONGODB_URI is not set in server/.env');
  if (!email || !password) throw new Error('Set ADMIN_EMAIL and ADMIN_PASSWORD in server/.env first');
  if (password.length < 8 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    throw new Error('ADMIN_PASSWORD must be at least 8 characters and contain letters and numbers');
  }

  await connectDB(env.mongoUri);
  const existing = await Admin.findOne({ email: email.toLowerCase() }).select('+password');
  if (existing) {
    if (process.argv.includes('--reset-password')) {
      existing.password = password;
      existing.isActive = true;
      await existing.save();
      console.log(`✔ Password reset for ${existing.email}`);
    } else {
      console.log(`ℹ Admin ${existing.email} already exists. Use --reset-password to reset the password.`);
    }
  } else {
    await Admin.create({ name, email, password, role: 'superadmin' });
    console.log(`✔ Super-admin created: ${email}`);
    console.log('  Remove ADMIN_PASSWORD from your .env (or change it) after first login if you prefer.');
  }
  await disconnectDB();
}

run()
  .then(() => process.exit(0))
  .catch(async (err) => {
  console.error(`✖ ${err.message}`);
  await disconnectDB().catch(() => {});
  process.exit(1);
});
