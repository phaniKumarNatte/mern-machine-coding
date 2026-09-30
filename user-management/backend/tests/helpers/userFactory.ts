import { User, type UserDocument } from '../../src/models/user.model';
import type { CreateUserRequest } from '../../src/types/user.types';

/**
 * Test data factories keep tests short and readable: each test only spells out
 * the fields it actually cares about and gets sensible defaults for the rest.
 */
let counter = 0;

export function buildUserInput(overrides: Partial<CreateUserRequest> = {}): CreateUserRequest {
  counter += 1;
  return {
    name: `Test User ${counter}`,
    email: `user${counter}@example.com`,
    age: 30,
    ...overrides,
  };
}

/** Inserts a user directly through the model, bypassing the API (fast test setup). */
export async function createUserInDb(
  overrides: Partial<CreateUserRequest> = {},
): Promise<UserDocument> {
  return User.create(buildUserInput(overrides));
}
