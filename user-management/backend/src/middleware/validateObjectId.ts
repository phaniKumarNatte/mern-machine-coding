import type { RequestHandler } from 'express';
import { isObjectIdOrHexString } from 'mongoose';
import { ApiError } from '../utils/ApiError';

/** Rejects requests whose `:id` route parameter is not a valid MongoDB ObjectId. */
export const validateObjectId: RequestHandler = (req, _res, next) => {
  if (!isObjectIdOrHexString(req.params.id)) {
    next(ApiError.badRequest('Invalid user ID'));
    return;
  }
  next();
};
