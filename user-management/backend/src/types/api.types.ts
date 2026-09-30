/** One validation problem, tied to the field that caused it. */
export interface FieldError {
  field: string;
  message: string;
}

/** Every successful response from this API has this shape. */
export interface ApiSuccessResponse<T> {
  success: true;
  message?: string;
  data: T;
}

/** Every failed response from this API has this shape. */
export interface ApiErrorResponse {
  success: false;
  message: string;
  errors?: FieldError[];
}

/**
 * Result of validating untrusted input. This is a "discriminated union":
 * checking `result.success` tells TypeScript which of the two shapes you have.
 */
export type ValidationResult<T> =
  { success: true; data: T } | { success: false; errors: FieldError[] };
