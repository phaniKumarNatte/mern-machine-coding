import { describe, expect, it } from 'vitest';
import { toUserRequest, validateUserForm } from '../../src/utils/userForm';

/** UNIT TESTS: pure functions, no React, no DOM, no mocks. */
describe('validateUserForm', () => {
  const valid = { name: 'Alice', email: 'alice@example.com', age: '30' };

  it('returns no errors for valid values', () => {
    expect(validateUserForm(valid)).toEqual({});
  });

  it('requires every field', () => {
    expect(validateUserForm({ name: ' ', email: '', age: '' })).toEqual({
      name: 'Name is required',
      email: 'Email is required',
      age: 'Age is required',
    });
  });

  it.each(['abc', '-1', '151', '2.5'])('rejects age %s', (age) => {
    expect(validateUserForm({ ...valid, age }).age).toBe(
      'Age must be a whole number between 0 and 150',
    );
  });
});

describe('toUserRequest', () => {
  it('trims strings and converts age to a number', () => {
    expect(toUserRequest({ name: ' Alice ', email: ' a@b.co ', age: '30' })).toEqual({
      name: 'Alice',
      email: 'a@b.co',
      age: 30,
    });
  });
});
