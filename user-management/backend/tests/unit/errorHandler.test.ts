import type { NextFunction, Request, Response } from 'express';
import { errorHandler } from '../../src/middleware/errorHandler';
import { User } from '../../src/models/user.model';
import { ApiError } from '../../src/utils/ApiError';

/**
 * UNIT TEST of the centralized error middleware.
 *
 * It is a plain function (err, req, res, next), so we call it directly with a
 * fake `res` and check which status code and body it produced for each kind of error.
 */
function runErrorHandler(err: unknown) {
  const res = {} as Response;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  const next: NextFunction = jest.fn();

  errorHandler(err, {} as Request, res, next);

  return { res, next };
}

describe('errorHandler', () => {
  it('uses the status code and message of an ApiError', () => {
    const { res } = runErrorHandler(ApiError.notFound('User not found'));

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: 'User not found' });
  });

  it('includes field errors when present', () => {
    const errors = [{ field: 'email', message: 'Email is required' }];
    const { res } = runErrorHandler(ApiError.badRequest('Validation failed', errors));

    expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Validation failed', errors });
  });

  it('turns a Mongoose ValidationError into a 400', async () => {
    // validate() runs schema validation without touching the database,
    // so we get a REAL Mongoose ValidationError without any mocking.
    const validationError: unknown = await new User({ age: -5 }).validate().catch((e) => e);

    const { res } = runErrorHandler(validationError);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Validation failed',
        errors: expect.arrayContaining([expect.objectContaining({ field: 'name' })]),
      }),
    );
  });

  it('turns a MongoDB duplicate key error into a 409', () => {
    const duplicateKeyError = { code: 11000, keyValue: { email: 'john@example.com' } };

    const { res } = runErrorHandler(duplicateKeyError);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'A user with this email already exists',
    });
  });

  it('hides the details of unexpected errors behind a generic 500', () => {
    // spyOn + mockImplementation silences console.error for this test (keeps the
    // output clean) while still letting us assert that the error WAS logged.
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const bug = new Error('Cannot read properties of undefined (secret internals)');

    const { res } = runErrorHandler(bug);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Internal server error' });
    expect(consoleSpy).toHaveBeenCalledWith(bug);
  });
});
