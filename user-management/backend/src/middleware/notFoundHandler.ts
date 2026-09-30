import type { RequestHandler } from 'express';
import { ApiError } from '../utils/ApiError';

/** Runs when no route matched. Forwards a 404 to the error handler. */
export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
};
