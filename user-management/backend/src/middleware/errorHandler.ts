import type { ErrorRequestHandler } from 'express';
import mongoose from 'mongoose';
import type { ApiErrorResponse, FieldError } from '../types/api.types';
import { ApiError } from '../utils/ApiError';

interface DuplicateKeyError {
  code: 11000;
  keyValue: Record<string, unknown>;
}

function isDuplicateKeyError(err: unknown): err is DuplicateKeyError {
  return typeof err === 'object' && err !== null && 'code' in err && err.code === 11000;
}

/** express.json() throws this kind of error when the request body is not valid JSON. */
function isJsonParseError(err: unknown): boolean {
  return err instanceof SyntaxError && 'type' in err && err.type === 'entity.parse.failed';
}

/** Converts any thrown value into an ApiError with a sensible status code. */
export function toApiError(err: unknown): ApiError {
  if (err instanceof ApiError) return err;

  if (err instanceof mongoose.Error.ValidationError) {
    const errors: FieldError[] = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    return ApiError.badRequest('Validation failed', errors);
  }

  if (err instanceof mongoose.Error.CastError) {
    return ApiError.badRequest(`Invalid value for ${err.path}`);
  }

  if (isDuplicateKeyError(err)) {
    const field = Object.keys(err.keyValue)[0] ?? 'field';
    return ApiError.conflict(`A user with this ${field} already exists`);
  }

  if (isJsonParseError(err)) {
    return ApiError.badRequest('Request body contains invalid JSON');
  }

  // Anything else is a bug or an infrastructure failure. Never leak its details.
  return new ApiError(500, 'Internal server error');
}

/**
 * Centralized error middleware. Express recognises it as an error handler
 * because it takes FOUR arguments, so `_next` must stay even though it's unused.
 */
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  const apiError = toApiError(err);

  if (apiError.statusCode >= 500) {
    console.error(err);
  }

  const body: ApiErrorResponse = { success: false, message: apiError.message };
  if (apiError.errors) body.errors = apiError.errors;

  res.status(apiError.statusCode).json(body);
};
