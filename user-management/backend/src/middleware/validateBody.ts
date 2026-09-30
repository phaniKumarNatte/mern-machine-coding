import type { RequestHandler } from 'express';
import type { ValidationResult } from '../types/api.types';
import { ApiError } from '../utils/ApiError';

/**
 * Builds a middleware that validates `req.body` with the given validator.
 * On success, `req.body` is replaced with the cleaned data (trimmed strings,
 * unknown fields removed), so controllers only ever see valid input.
 */
export function validateBody<T>(
  validator: (input: unknown) => ValidationResult<T>,
): RequestHandler {
  return (req, _res, next) => {
    const result = validator(req.body);
    if (!result.success) {
      next(ApiError.badRequest('Validation failed', result.errors));
      return;
    }
    req.body = result.data;
    next();
  };
}
