import axios from 'axios';
import type { ApiErrorResponse, FieldError } from '../types/api';

/**
 * The single error type the rest of the frontend deals with.
 *
 * Components never see Axios errors. That keeps Axios an implementation
 * detail of the service layer: we could switch to fetch() without touching
 * a single component or test.
 */
export class ApiRequestError extends Error {
  readonly status: number;
  readonly fieldErrors: FieldError[];

  constructor(message: string, status: number, fieldErrors: FieldError[] = []) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

/** Converts whatever Axios threw into an ApiRequestError with a useful message. */
export function toApiRequestError(error: unknown): ApiRequestError {
  if (axios.isAxiosError<ApiErrorResponse>(error)) {
    if (error.response) {
      const { status, data } = error.response;
      return new ApiRequestError(
        data?.message ?? `Request failed with status ${status}`,
        status,
        data?.errors ?? [],
      );
    }
    // The request was sent but no response came back (server down, network issue).
    return new ApiRequestError('Unable to reach the server. Is the backend running?', 0);
  }
  return new ApiRequestError('Something went wrong. Please try again.', 0);
}
