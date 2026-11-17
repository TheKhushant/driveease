/** Verifies MongoDB connectivity and prints document counts: `npm run check:db` */
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { connectDB, disconnectDB } from '../config/db.js';

async function run() {
  if (!env.mongoUri) throw new Error('MONGODB_URI is not set in server/.env');
  await connectDB(env.mongoUri);
  const ping = await mongoose.connection.db.admin().ping();
  console.log('✔ Ping:', ping.ok === 1 ? 'ok' : ping);
  const collections = await mongoose.connection.db.listCollections().toArray();
  for (const c of collections.sort((a, b) => a.name.localeCompare(b.name))) {
    const n = await mongoose.connection.db.collection(c.name).countDocuments();
    console.log(`  ${c.name.padEnd(20)} ${n}`);
  }
  if (!collections.length) console.log('  (no collections yet — run npm run seed:demo)');
  await disconnectDB();
}

run().catch(async (err) => {
  console.error(`✖ MongoDB connection failed: ${err.message}`);
  await disconnectDB().catch(() => {});
  process.exit(1);
});
