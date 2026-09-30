import mongoose, { type ConnectOptions } from 'mongoose';

export async function connectDatabase(uri: string, options?: ConnectOptions): Promise<void> {
  await mongoose.connect(uri, options);
  if (process.env.NODE_ENV !== 'test') {
    console.log(`MongoDB connected: ${mongoose.connection.host}/${mongoose.connection.name}`);
  }
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
}
