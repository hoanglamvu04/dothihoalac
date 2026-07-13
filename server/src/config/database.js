import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from './logger.js';

export async function connectDatabase() {
  mongoose.set('strictQuery', true);
  await mongoose.connect(env.MONGO_URI, {
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000,
  });
  logger.info({ database: mongoose.connection.name }, 'MongoDB connected');
  return mongoose.connection;
}

export async function disconnectDatabase() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    logger.info('MongoDB disconnected');
  }
}

export function getDatabaseState() {
  const map = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };
  return map[mongoose.connection.readyState] ?? 'unknown';
}
