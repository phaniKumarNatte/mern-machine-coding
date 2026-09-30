import type { Request, Response } from 'express';
import * as userService from '../services/user.service';
import type { CreateUserRequest, UpdateUserRequest } from '../types/user.types';
import { sendSuccess } from '../utils/apiResponse';

/**
 * Controllers translate between HTTP and the service layer:
 *   1. read what they need from `req` (params, body)
 *   2. call a service function
 *   3. send the result with the right status code
 *
 * No try/catch is needed: in Express 5, if an async handler throws (or its
 * promise rejects), Express passes the error to the error middleware for us.
 */

type IdParams = { id: string };

export async function createUser(
  req: Request<unknown, unknown, CreateUserRequest>,
  res: Response,
): Promise<void> {
  const user = await userService.createUser(req.body);
  sendSuccess(res, 201, user, 'User created successfully');
}

export async function getUsers(_req: Request, res: Response): Promise<void> {
  const users = await userService.getAllUsers();
  sendSuccess(res, 200, users);
}

export async function getUser(req: Request<IdParams>, res: Response): Promise<void> {
  const user = await userService.getUserById(req.params.id);
  sendSuccess(res, 200, user);
}

export async function updateUser(
  req: Request<IdParams, unknown, UpdateUserRequest>,
  res: Response,
): Promise<void> {
  const user = await userService.updateUser(req.params.id, req.body);
  sendSuccess(res, 200, user, 'User updated successfully');
}

export async function deleteUser(req: Request<IdParams>, res: Response): Promise<void> {
  const user = await userService.deleteUser(req.params.id);
  sendSuccess(res, 200, user, 'User deleted successfully');
}
