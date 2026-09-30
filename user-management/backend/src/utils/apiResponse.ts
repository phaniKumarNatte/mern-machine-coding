import type { Response } from 'express';
import type { ApiSuccessResponse } from '../types/api.types';

/** Sends a success response using the API's standard `{ success, message, data }` shape. */
export function sendSuccess<T>(res: Response, statusCode: number, data: T, message?: string): void {
  const body: ApiSuccessResponse<T> = { success: true, message, data };
  res.status(statusCode).json(body);
}
