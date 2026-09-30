import cors from 'cors';
import express from 'express';
import { env } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import { notFoundHandler } from './middleware/notFoundHandler';
import userRoutes from './routes/user.routes';

/**
 * Builds and configures the Express application, but does NOT start listening.
 * Tests import this `app` and hand it to Supertest; server.ts imports it and
 * calls listen(). Keeping those two jobs apart is what makes the API testable.
 */
export const app = express();

// 1. Global middleware: runs for every request, in this order.
app.use(cors({ origin: env.CLIENT_URL }));
app.use(express.json());

// 2. Routes.
app.get('/api/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok' } });
});
app.use('/api/users', userRoutes);

// 3. Fallbacks: must be registered AFTER all routes.
app.use(notFoundHandler);
app.use(errorHandler);
