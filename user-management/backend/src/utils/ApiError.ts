import type { FieldError } from '../types/api.types';

/**
 * An error that knows which HTTP status code it should produce.
 *
 * Services throw these ("the user was not found") without knowing anything
 * about Express. The central error middleware turns them into HTTP responses.
 */
export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly errors?: FieldError[];

  constructor(statusCode: number, message: string, errors?: FieldError[]) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.errors = errors;
  }

  static badRequest(message: string, errors?: FieldError[]): ApiError {
    return new ApiError(400, message, errors);
  }

  static notFound(message: string): ApiError {
    return new ApiError(404, message);
  }

  static conflict(message: string): ApiError {
    return new ApiError(409, message);
  }
}
