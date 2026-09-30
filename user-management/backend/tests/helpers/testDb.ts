import os from 'node:os';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { connectDatabase, disconnectDatabase } from '../../src/config/database';

/**
 * Test database strategy: mongodb-memory-server.
 *
 * It downloads and starts a real `mongod` process that keeps data in memory.
 * Each test file gets its own throwaway server, so tests:
 *   - never touch your development database,
 *   - need no MongoDB installed on the machine or in CI,
 *   - still exercise REAL Mongoose + MongoDB behaviour (unique indexes, casting, validation).
 */
let mongoServer: MongoMemoryServer | undefined;

/** Call in beforeAll: start an in-memory MongoDB and connect Mongoose to it. */
export async function connectTestDb(): Promise<void> {
  mongoServer = await MongoMemoryServer.create();
  // The MongoDB driver (v7.6+) loads Node's `os` module with a dynamic import(),
  // which Jest's CommonJS sandbox does not allow. When that fails the driver
  // silently sends an empty handshake and the connection is rejected. Handing the
  // driver the `os` module ourselves avoids the dynamic import. Only tests need this.
  await connectDatabase(mongoServer.getUri(), { runtimeAdapters: { os } });

  // Build every model's indexes (e.g. the unique index on User.email) before
  // any test runs. Otherwise the first duplicate-email test could race the index build.
  await Promise.all(Object.values(mongoose.models).map((model) => model.init()));
}

/**
 * Call in afterEach: delete all documents so every test starts from an empty database.
 * We use deleteMany instead of dropping the database because dropping would
 * also remove the indexes we built above.
 */
export async function clearTestDb(): Promise<void> {
  const collections = Object.values(mongoose.connection.collections);
  await Promise.all(collections.map((collection) => collection.deleteMany({})));
}

/** Call in afterAll: disconnect and stop the in-memory server so Jest can exit cleanly. */
export async function closeTestDb(): Promise<void> {
  await disconnectDatabase();
  await mongoServer?.stop();
}
