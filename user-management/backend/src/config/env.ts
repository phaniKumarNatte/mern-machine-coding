import dotenv from 'dotenv';

// Reads the .env file (if present) and copies its values into process.env.
// Variables that are already set in the real environment are NOT overwritten,
// which is how CI servers and hosting platforms inject their own values.
dotenv.config({ quiet: true });

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  PORT: Number(process.env.PORT ?? 5000),
  MONGODB_URI: process.env.MONGODB_URI ?? '',
  CLIENT_URL: process.env.CLIENT_URL ?? 'http://localhost:5173',
};

/** Fails fast at startup instead of crashing later with a confusing error. */
export function assertRequiredEnv(): void {
  if (!env.MONGODB_URI) {
    throw new Error('MONGODB_URI is not set. Copy .env.example to .env and fill it in.');
  }
  if (Number.isNaN(env.PORT)) {
    throw new Error('PORT must be a number.');
  }
}
