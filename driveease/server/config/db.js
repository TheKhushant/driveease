import mongoose from 'mongoose';

mongoose.set('strictQuery', true);

export async function connectDB(uri) {
  if (!uri) throw new Error('MONGODB_URI is not set');
  const conn = await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  if (process.env.NODE_ENV !== 'test') {
    console.log(`[db] MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
  }
  return conn;
}

export async function disconnectDB() {
  await mongoose.disconnect();
}

export function dbStatus() {
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  return states[mongoose.connection.readyState] || 'unknown';
}
