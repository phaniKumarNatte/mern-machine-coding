/** These mirror backend/src/types/api.types.ts: the contract between the two apps. */

export interface FieldError {
  field: string;
  message: string;
}

export interface ApiSuccessResponse<T> {
  success: true;
  message?: string;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  errors?: FieldError[];
}
