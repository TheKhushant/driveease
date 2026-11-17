import { assertEnv, env } from './config/env.js';
import { connectDB, disconnectDB } from './config/db.js';
import { createApp } from './app.js';
import { getPricingConfig, getSettings } from './services/settingsService.js';
import { isCloudinaryConfigured } from './config/cloudinary.js';

async function start() {
  assertEnv();
  await connectDB(env.mongoUri);
  // Ensure singleton settings exist (created with editable defaults on first run).
  await Promise.all([getSettings(), getPricingConfig()]);

  if (!isCloudinaryConfigured()) {
    console.warn('[warn] Cloudinary is not configured — image uploads are disabled until CLOUDINARY_* variables are set.');
  }

  const app = createApp();
  const server = app.listen(env.port, () => {
    console.log(`[server] DriveEase API listening on http://localhost:${env.port} (${env.nodeEnv})`);
  });

  const shutdown = async (signal) => {
    console.log(`[server] ${signal} received, shutting down...`);
    server.close(async () => {
      await disconnectDB();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

start().catch((err) => {
  console.error('[server] Failed to start:', err.message);
  process.exit(1);
});
