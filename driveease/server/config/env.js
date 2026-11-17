import dotenv from 'dotenv';

dotenv.config();

const list = (value, fallback) =>
  (value || fallback)
    .split(',')
    .map((s) => s.trim().replace(/\/$/, ''))
    .filter(Boolean);

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',
  port: Number(process.env.PORT) || 5000,
  mongoUri: process.env.MONGODB_URI,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  clientUrls: list(process.env.CLIENT_URL, 'http://localhost:5173'),
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
    folder: process.env.CLOUDINARY_FOLDER || 'driveease',
  },
  admin: {
    name: process.env.ADMIN_NAME || 'Administrator',
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD,
  },
  tzOffsetMinutes: Number.isFinite(Number(process.env.TZ_OFFSET_MINUTES))
    ? Number(process.env.TZ_OFFSET_MINUTES)
    : 330,
};

/** Fail fast on missing/weak configuration. Called on server start. */
export function assertEnv() {
  const missing = [];
  if (!env.mongoUri) missing.push('MONGODB_URI');
  if (!env.jwtSecret) missing.push('JWT_SECRET');
  if (missing.length) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}. Copy server/.env.example to server/.env and fill them in.`,
    );
  }
  if (env.jwtSecret.length < 32) {
    const msg = 'JWT_SECRET should be at least 32 characters long.';
    if (env.isProduction) throw new Error(msg);
    console.warn(`[warn] ${msg}`);
  }
}
