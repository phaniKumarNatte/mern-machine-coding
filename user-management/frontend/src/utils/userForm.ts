import type { CreateUserRequest, User } from '../types/user';

/**
 * Form values are always strings, because that's what <input> gives you.
 * We convert to the API's types (age -> number) only when submitting.
 */
export interface UserFormValues {
  name: string;
  email: string;
  age: string;
}

export type UserFormErrors = Partial<Record<keyof UserFormValues, string>>;

export const EMPTY_USER_FORM: UserFormValues = { name: '', email: '', age: '' };

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Client-side validation gives instant feedback without a round trip.
 * It is a convenience, NOT security: the backend validates everything again,
 * because anyone can call the API directly and skip this code.
 */
export function validateUserForm(values: UserFormValues): UserFormErrors {
  const errors: UserFormErrors = {};

  if (!values.name.trim()) errors.name = 'Name is required';

  if (!values.email.trim()) errors.email = 'Email is required';
  else if (!EMAIL_REGEX.test(values.email.trim())) errors.email = 'Enter a valid email address';

  if (!values.age.trim()) {
    errors.age = 'Age is required';
  } else {
    const age = Number(values.age);
    if (!Number.isInteger(age) || age < 0 || age > 150) {
      errors.age = 'Age must be a whole number between 0 and 150';
    }
  }

  return errors;
}

export function toUserRequest(values: UserFormValues): CreateUserRequest {
  return {
    name: values.name.trim(),
    email: values.email.trim(),
    age: Number(values.age),
  };
}

export function toFormValues(user: User): UserFormValues {
  return { name: user.name, email: user.email, age: String(user.age) };
}
