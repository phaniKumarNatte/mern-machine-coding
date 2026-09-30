import { app } from './app';
import { connectDatabase, disconnectDatabase } from './config/database';
import { assertRequiredEnv, env } from './config/env';

/**
 * The entry point for running the API for real: validate config, connect to
 * MongoDB, then start the HTTP server. Tests never import this file.
 */
async function startServer(): Promise<void> {
  assertRequiredEnv();
  await connectDatabase(env.MONGODB_URI);

  const server = app.listen(env.PORT, () => {
    console.log(`API listening on http://localhost:${env.PORT} (${env.NODE_ENV})`);
  });

  // Graceful shutdown: stop accepting requests, finish in-flight ones, close the DB.
  const shutdown = (signal: string) => {
    console.log(`${signal} received, shutting down...`);
    server.close(async () => {
      await disconnectDatabase();
      process.exit(0);
    });
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

startServer().catch((error: unknown) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
