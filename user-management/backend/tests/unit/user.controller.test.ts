import type { Request, Response } from 'express';
import * as userController from '../../src/controllers/user.controller';
import type { UserDocument } from '../../src/models/user.model';
import * as userService from '../../src/services/user.service';
import { ApiError } from '../../src/utils/ApiError';

/**
 * UNIT TEST of the controller layer.
 *
 * WHAT is mocked:
 *   - the service functions, with jest.spyOn
 *   - Express's `req` and `res` objects, built by hand with jest.fn()
 * WHY: a controller's only job is "read req, call service, send response".
 * We want to check exactly that wiring (right arguments in, right status out)
 * without a database and without an HTTP server.
 *
 * jest.spyOn vs jest.mock:
 *   - jest.mock replaces a WHOLE module for the whole file (used in the service test).
 *   - jest.spyOn replaces ONE function on an object and can be restored afterwards.
 *     Here that is enough, and `restoreMocks: true` in jest.config.ts puts the
 *     real functions back after every test.
 */

/** A fake Express Response whose methods are jest.fn() so we can inspect the calls. */
function createMockResponse(): Response {
  const res = {} as Response;
  res.status = jest.fn().mockReturnValue(res); // return `res` so res.status(201).json() chains
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

// The controller only passes this value through, so a plain object is enough.
const fakeUser = {
  _id: '507f1f77bcf86cd799439011',
  name: 'John',
  email: 'john@example.com',
  age: 25,
} as unknown as UserDocument;

describe('userController', () => {
  describe('createUser', () => {
    it('calls the service with the request body and responds 201', async () => {
      const createSpy = jest.spyOn(userService, 'createUser').mockResolvedValue(fakeUser);
      const req = { body: { name: 'John', email: 'john@example.com', age: 25 } } as Request;
      const res = createMockResponse();

      await userController.createUser(req, res);

      expect(createSpy).toHaveBeenCalledWith(req.body);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'User created successfully',
        data: fakeUser,
      });
    });

    it('rejects with the service error so Express can forward it to the error handler', async () => {
      const error = ApiError.conflict('A user with this email already exists');
      jest.spyOn(userService, 'createUser').mockRejectedValue(error);
      const res = createMockResponse();

      await expect(userController.createUser({ body: {} } as Request, res)).rejects.toBe(error);
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('getUser', () => {
    it('passes the :id route parameter to the service', async () => {
      const getSpy = jest.spyOn(userService, 'getUserById').mockResolvedValue(fakeUser);
      const req = { params: { id: '507f1f77bcf86cd799439011' } } as unknown as Request<{
        id: string;
      }>;
      const res = createMockResponse();

      await userController.getUser(req, res);

      expect(getSpy).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('deleteUser', () => {
    it('responds 200 with a success message', async () => {
      jest.spyOn(userService, 'deleteUser').mockResolvedValue(fakeUser);
      const req = { params: { id: '507f1f77bcf86cd799439011' } } as unknown as Request<{
        id: string;
      }>;
      const res = createMockResponse();

      await userController.deleteUser(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, message: 'User deleted successfully' }),
      );
    });
  });
});
