import { validateCreateUser, validateUpdateUser } from '../../src/utils/validation';

/**
 * UNIT TEST of a pure function.
 *
 * validation.ts has no dependencies (no database, no Express), so there is
 * nothing to mock. We just call the function and check what it returns.
 * These are the fastest, simplest tests you can write.
 */
describe('validateCreateUser', () => {
  const validInput = { name: 'John', email: 'john@example.com', age: 25 };

  it('accepts valid input', () => {
    const result = validateCreateUser(validInput);

    expect(result).toEqual({ success: true, data: validInput });
  });

  it('trims the name, normalises the email and drops unknown fields', () => {
    const result = validateCreateUser({
      name: '  John  ',
      email: '  John@Example.COM ',
      age: 25,
      role: 'admin', // a client should not be able to sneak extra fields into the database
    });

    expect(result).toEqual({
      success: true,
      data: { name: 'John', email: 'john@example.com', age: 25 },
    });
  });

  it('reports every missing field at once', () => {
    const result = validateCreateUser({});

    expect(result.success).toBe(false);
    if (result.success) return; // narrows the type for TypeScript
    expect(result.errors).toEqual([
      { field: 'name', message: 'Name is required' },
      { field: 'email', message: 'Email is required' },
      { field: 'age', message: 'Age is required' },
    ]);
  });

  // test.each runs the same test with different data: one row per case.
  it.each([
    ['plainaddress', 'Email must be a valid email address'],
    ['missing-at.com', 'Email must be a valid email address'],
    ['a@b', 'Email must be a valid email address'],
    [42, 'Email must be a string'],
  ])('rejects invalid email %p', (email, expectedMessage) => {
    const result = validateCreateUser({ ...validInput, email });

    expect(result).toEqual({
      success: false,
      errors: [{ field: 'email', message: expectedMessage }],
    });
  });

  it.each([
    ['25', 'Age must be a whole number'],
    [25.5, 'Age must be a whole number'],
    [-1, 'Age must be between 0 and 150'],
    [151, 'Age must be between 0 and 150'],
  ])('rejects invalid age %p', (age, expectedMessage) => {
    const result = validateCreateUser({ ...validInput, age });

    expect(result).toEqual({
      success: false,
      errors: [{ field: 'age', message: expectedMessage }],
    });
  });

  it.each([null, 'a string', [1, 2]])('rejects a body that is not an object: %p', (body) => {
    const result = validateCreateUser(body);

    expect(result.success).toBe(false);
  });
});

describe('validateUpdateUser', () => {
  it('accepts a partial update', () => {
    expect(validateUpdateUser({ age: 40 })).toEqual({ success: true, data: { age: 40 } });
  });

  it('rejects an empty update', () => {
    const result = validateUpdateUser({});

    expect(result).toEqual({
      success: false,
      errors: [
        { field: 'body', message: 'Provide at least one field to update: name, email, age' },
      ],
    });
  });

  it('validates any field that is provided', () => {
    const result = validateUpdateUser({ name: '', email: 'nope' });

    expect(result).toEqual({
      success: false,
      errors: [
        { field: 'name', message: 'Name is required' },
        { field: 'email', message: 'Email must be a valid email address' },
      ],
    });
  });
});
