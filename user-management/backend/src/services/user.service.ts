import { User, type UserDocument } from '../models/user.model';
import type { CreateUserRequest, UpdateUserRequest } from '../types/user.types';
import { ApiError } from '../utils/ApiError';

/**
 * The service layer holds the business rules ("emails must be unique",
 * "404 if the user doesn't exist"). It knows about the database model but
 * nothing about HTTP: no `req`, no `res`, no status-code sending.
 */

async function ensureEmailIsAvailable(email: string): Promise<void> {
  const existing = await User.exists({ email });
  if (existing) {
    throw ApiError.conflict('A user with this email already exists');
  }
}

export async function createUser(input: CreateUserRequest): Promise<UserDocument> {
  // Checking first gives a clear error message. The unique index on `email`
  // still protects us if two requests race past this check at the same time.
  await ensureEmailIsAvailable(input.email);
  return User.create(input);
}

export async function getAllUsers(): Promise<UserDocument[]> {
  return User.find().sort({ createdAt: -1 });
}

export async function getUserById(id: string): Promise<UserDocument> {
  const user = await User.findById(id);
  if (!user) {
    throw ApiError.notFound('User not found');
  }
  return user;
}

export async function updateUser(id: string, input: UpdateUserRequest): Promise<UserDocument> {
  const user = await getUserById(id);

  if (input.email && input.email !== user.email) {
    await ensureEmailIsAvailable(input.email);
  }

  user.set(input);
  // save() runs the schema validators and updates `updatedAt`.
  return user.save();
}

export async function deleteUser(id: string): Promise<UserDocument> {
  const user = await User.findByIdAndDelete(id);
  if (!user) {
    throw ApiError.notFound('User not found');
  }
  return user;
}
