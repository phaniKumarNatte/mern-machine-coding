import { User } from '../../src/models/user.model';
import * as userService from '../../src/services/user.service';
import { ApiError } from '../../src/utils/ApiError';

/**
 * UNIT TEST of the service layer, with the database MOCKED.
 *
 * WHAT is mocked: the Mongoose `User` model (the service's only dependency).
 * WHY: here we want to test the service's own decisions in isolation:
 *   - does it throw 409 when the email is taken, and skip the insert?
 *   - does it throw 404 when the model returns null?
 *   - does it pass a database failure through untouched?
 * Mocking lets us force each of those situations instantly, including ones
 * that are hard to produce with a real database (e.g. "the connection died").
 *
 * What these tests CANNOT tell us: whether our Mongoose queries actually work
 * against MongoDB. That is the job of the integration tests in tests/integration.
 */

// jest.mock replaces the whole module with the object returned by the factory.
// Jest hoists this call above the imports, so the service receives the fake `User`.
jest.mock('../../src/models/user.model', () => ({
  User: {
    exists: jest.fn(),
    create: jest.fn(),
    find: jest.fn(),
    findById: jest.fn(),
    findByIdAndDelete: jest.fn(),
  },
}));

// The real Mongoose method types have many overloads, which makes typed mocks
// awkward. Casting to a simple "every method is a jest.Mock" shape keeps the
// tests readable. This cast is confined to test code on purpose.
const mockedUser = User as unknown as Record<
  'exists' | 'create' | 'find' | 'findById' | 'findByIdAndDelete',
  jest.Mock
>;

const USER_ID = '507f1f77bcf86cd799439011';
const input = { name: 'John', email: 'john@example.com', age: 25 };
const storedUser = { _id: USER_ID, ...input };

describe('userService', () => {
  describe('createUser', () => {
    it('creates the user when the email is free', async () => {
      mockedUser.exists.mockResolvedValue(null); // no user with this email
      mockedUser.create.mockResolvedValue(storedUser);

      const result = await userService.createUser(input);

      expect(mockedUser.exists).toHaveBeenCalledWith({ email: input.email });
      expect(mockedUser.create).toHaveBeenCalledWith(input);
      expect(result).toBe(storedUser);
    });

    it('throws a 409 and does not insert when the email is taken', async () => {
      mockedUser.exists.mockResolvedValue({ _id: 'someone-else' });

      await expect(userService.createUser(input)).rejects.toMatchObject({
        statusCode: 409,
        message: 'A user with this email already exists',
      });
      expect(mockedUser.create).not.toHaveBeenCalled();
    });

    it('lets database errors propagate', async () => {
      // mockRejectedValue simulates an async failure we can't easily cause for real.
      mockedUser.exists.mockResolvedValue(null);
      mockedUser.create.mockRejectedValue(new Error('connection lost'));

      await expect(userService.createUser(input)).rejects.toThrow('connection lost');
    });
  });

  describe('getAllUsers', () => {
    it('returns users sorted newest first', async () => {
      // User.find() returns a query object and we then call .sort() on it,
      // so the mock for `find` must return something that has a `sort` method.
      const sort = jest.fn().mockResolvedValue([storedUser]);
      mockedUser.find.mockReturnValue({ sort });

      const result = await userService.getAllUsers();

      expect(sort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(result).toEqual([storedUser]);
    });
  });

  describe('getUserById', () => {
    it('returns the user when found', async () => {
      mockedUser.findById.mockResolvedValue(storedUser);

      await expect(userService.getUserById(USER_ID)).resolves.toBe(storedUser);
      expect(mockedUser.findById).toHaveBeenCalledWith(USER_ID);
    });

    it('throws a 404 ApiError when the user does not exist', async () => {
      mockedUser.findById.mockResolvedValue(null);

      const promise = userService.getUserById(USER_ID);

      await expect(promise).rejects.toBeInstanceOf(ApiError);
      await expect(promise).rejects.toMatchObject({ statusCode: 404, message: 'User not found' });
    });
  });

  describe('updateUser', () => {
    // A fake Mongoose document: plain data plus the two methods the service calls.
    function buildFakeDocument() {
      const doc = {
        ...storedUser,
        set: jest.fn(),
        save: jest.fn(),
      };
      doc.save.mockResolvedValue(doc);
      return doc;
    }

    it('applies the changes and saves', async () => {
      const doc = buildFakeDocument();
      mockedUser.findById.mockResolvedValue(doc);

      const result = await userService.updateUser(USER_ID, { age: 26 });

      expect(doc.set).toHaveBeenCalledWith({ age: 26 });
      expect(doc.save).toHaveBeenCalledTimes(1);
      expect(result).toBe(doc);
    });

    it('does not check for duplicates when the email is unchanged', async () => {
      mockedUser.findById.mockResolvedValue(buildFakeDocument());

      await userService.updateUser(USER_ID, { email: input.email });

      expect(mockedUser.exists).not.toHaveBeenCalled();
    });

    it('throws a 409 and does not save when the new email belongs to someone else', async () => {
      const doc = buildFakeDocument();
      mockedUser.findById.mockResolvedValue(doc);
      mockedUser.exists.mockResolvedValue({ _id: 'someone-else' });

      await expect(
        userService.updateUser(USER_ID, { email: 'taken@example.com' }),
      ).rejects.toMatchObject({ statusCode: 409 });
      expect(doc.save).not.toHaveBeenCalled();
    });

    it('throws a 404 when the user does not exist', async () => {
      mockedUser.findById.mockResolvedValue(null);

      await expect(userService.updateUser(USER_ID, { age: 26 })).rejects.toMatchObject({
        statusCode: 404,
      });
    });
  });

  describe('deleteUser', () => {
    it('returns the deleted user', async () => {
      mockedUser.findByIdAndDelete.mockResolvedValue(storedUser);

      await expect(userService.deleteUser(USER_ID)).resolves.toBe(storedUser);
    });

    it('throws a 404 when the user does not exist', async () => {
      mockedUser.findByIdAndDelete.mockResolvedValue(null);

      await expect(userService.deleteUser(USER_ID)).rejects.toMatchObject({ statusCode: 404 });
    });
  });
});
