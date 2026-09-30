import type { FieldError, ValidationResult } from '../types/api.types';
import type { CreateUserRequest, UpdateUserRequest } from '../types/user.types';

/**
 * Request-body validation for users.
 *
 * These are plain functions with no Express or Mongoose code, which makes them
 * trivial to unit test: give an input, check the output.
 */

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const NAME_MAX_LENGTH = 100;
export const AGE_MIN = 0;
export const AGE_MAX = 150;

type FieldResult<T> = { ok: true; value: T } | { ok: false; message: string };

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isMissing(value: unknown): boolean {
  return (
    value === undefined || value === null || (typeof value === 'string' && value.trim() === '')
  );
}

export function parseName(value: unknown): FieldResult<string> {
  if (isMissing(value)) return { ok: false, message: 'Name is required' };
  if (typeof value !== 'string') return { ok: false, message: 'Name must be a string' };
  const name = value.trim();
  if (name.length > NAME_MAX_LENGTH) {
    return { ok: false, message: `Name must be at most ${NAME_MAX_LENGTH} characters` };
  }
  return { ok: true, value: name };
}

export function parseEmail(value: unknown): FieldResult<string> {
  if (isMissing(value)) return { ok: false, message: 'Email is required' };
  if (typeof value !== 'string') return { ok: false, message: 'Email must be a string' };
  const email = value.trim().toLowerCase();
  if (!EMAIL_REGEX.test(email))
    return { ok: false, message: 'Email must be a valid email address' };
  return { ok: true, value: email };
}

export function parseAge(value: unknown): FieldResult<number> {
  if (value === undefined || value === null || value === '') {
    return { ok: false, message: 'Age is required' };
  }
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    return { ok: false, message: 'Age must be a whole number' };
  }
  if (value < AGE_MIN || value > AGE_MAX) {
    return { ok: false, message: `Age must be between ${AGE_MIN} and ${AGE_MAX}` };
  }
  return { ok: true, value };
}

const NOT_AN_OBJECT: ValidationResult<never> = {
  success: false,
  errors: [{ field: 'body', message: 'Request body must be a JSON object' }],
};

/** Validates a create request. All fields are required. Unknown fields are dropped. */
export function validateCreateUser(input: unknown): ValidationResult<CreateUserRequest> {
  if (!isPlainObject(input)) return NOT_AN_OBJECT;

  const name = parseName(input.name);
  const email = parseEmail(input.email);
  const age = parseAge(input.age);

  if (!name.ok || !email.ok || !age.ok) {
    const errors: FieldError[] = [];
    if (!name.ok) errors.push({ field: 'name', message: name.message });
    if (!email.ok) errors.push({ field: 'email', message: email.message });
    if (!age.ok) errors.push({ field: 'age', message: age.message });
    return { success: false, errors };
  }

  return { success: true, data: { name: name.value, email: email.value, age: age.value } };
}

/**
 * Validates an update request. Every field is optional, but any field that IS
 * sent must be valid, and at least one field must be sent.
 */
export function validateUpdateUser(input: unknown): ValidationResult<UpdateUserRequest> {
  if (!isPlainObject(input)) return NOT_AN_OBJECT;

  const data: UpdateUserRequest = {};
  const errors: FieldError[] = [];

  if (input.name !== undefined) {
    const name = parseName(input.name);
    if (name.ok) data.name = name.value;
    else errors.push({ field: 'name', message: name.message });
  }
  if (input.email !== undefined) {
    const email = parseEmail(input.email);
    if (email.ok) data.email = email.value;
    else errors.push({ field: 'email', message: email.message });
  }
  if (input.age !== undefined) {
    const age = parseAge(input.age);
    if (age.ok) data.age = age.value;
    else errors.push({ field: 'age', message: age.message });
  }

  if (errors.length > 0) return { success: false, errors };
  if (Object.keys(data).length === 0) {
    return {
      success: false,
      errors: [
        { field: 'body', message: 'Provide at least one field to update: name, email, age' },
      ],
    };
  }
  return { success: true, data };
}
