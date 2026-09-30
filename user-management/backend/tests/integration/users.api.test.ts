import request from 'supertest';
import { app } from '../../src/app';
import { User } from '../../src/models/user.model';
import { clearTestDb, closeTestDb, connectTestDb } from '../helpers/testDb';
import { buildUserInput, createUserInDb } from '../helpers/userFactory';

/**
 * INTEGRATION TESTS for the /api/users endpoints.
 *
 * Nothing is mocked. Each request travels through the full real stack:
 *
 *   Supertest -> Express app -> route -> middleware -> controller -> service
 *             -> Mongoose model -> in-memory MongoDB -> error handler / response
 *
 * Supertest calls the `app` directly, without app.listen(), so there is no
 * port to open, no port conflicts, and no server left running after the tests.
 */

// Lifecycle hooks (they run in this order for this file):
//   beforeAll  -> once, before the first test: start the in-memory DB
//   afterEach  -> after EVERY test: wipe the data so tests can't affect each other
//   afterAll   -> once, after the last test: disconnect and stop the DB
// The first ever run downloads the mongod binary (~80 MB), so allow extra time here.
beforeAll(connectTestDb, 120_000);
afterEach(clearTestDb);
afterAll(closeTestDb);

const NON_EXISTENT_ID = '507f1f77bcf86cd799439011'; // valid ObjectId format, not in the DB
const INVALID_ID = 'not-a-valid-id';

describe('POST /api/users', () => {
  it('creates a user and returns 201', async () => {
    const response = await request(app)
      .post('/api/users')
      .send({ name: 'John', email: 'john@example.com', age: 25 });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      success: true,
      message: 'User created successfully',
      data: {
        _id: expect.any(String),
        name: 'John',
        email: 'john@example.com',
        age: 25,
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      },
    });

    // Don't just trust the response: check the data really reached the database.
    const saved = await User.findById(response.body.data._id);
    expect(saved?.email).toBe('john@example.com');
  });

  it('returns 400 when name is missing', async () => {
    const response = await request(app)
      .post('/api/users')
      .send({ email: 'john@example.com', age: 25 });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      success: false,
      message: 'Validation failed',
      errors: [{ field: 'name', message: 'Name is required' }],
    });
  });

  it('returns 400 when email is missing', async () => {
    const response = await request(app).post('/api/users').send({ name: 'John', age: 25 });

    expect(response.status).toBe(400);
    expect(response.body.errors).toEqual([{ field: 'email', message: 'Email is required' }]);
  });

  it('returns 400 when email is invalid', async () => {
    const response = await request(app)
      .post('/api/users')
      .send({ name: 'John', email: 'not-an-email', age: 25 });

    expect(response.status).toBe(400);
    expect(response.body.errors).toEqual([
      { field: 'email', message: 'Email must be a valid email address' },
    ]);
  });

  it.each([
    ['a string', 'twenty'],
    ['a negative number', -3],
    ['a decimal', 25.5],
  ])('returns 400 when age is %s', async (_label, age) => {
    const response = await request(app)
      .post('/api/users')
      .send({ name: 'John', email: 'john@example.com', age });

    expect(response.status).toBe(400);
    expect(response.body.errors[0].field).toBe('age');
  });

  it('returns 409 when the email is already used', async () => {
    await createUserInDb({ email: 'john@example.com' });

    const response = await request(app)
      .post('/api/users')
      .send({ name: 'Another John', email: 'JOHN@example.com', age: 40 }); // case-insensitive

    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      success: false,
      message: 'A user with this email already exists',
    });
    expect(await User.countDocuments()).toBe(1);
  });

  it('returns 400 for malformed JSON', async () => {
    const response = await request(app)
      .post('/api/users')
      .set('Content-Type', 'application/json')
      .send('{"name": "John",');

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Request body contains invalid JSON');
  });
});

describe('GET /api/users', () => {
  it('returns all users, newest first', async () => {
    await createUserInDb({ name: 'First' });
    await createUserInDb({ name: 'Second' });

    const response = await request(app).get('/api/users');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.map((u: { name: string }) => u.name)).toEqual(['Second', 'First']);
  });

  it('returns an empty array when there are no users', async () => {
    const response = await request(app).get('/api/users');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true, data: [] });
  });
});

describe('GET /api/users/:id', () => {
  it('returns the user', async () => {
    const user = await createUserInDb({ name: 'Jane' });

    const response = await request(app).get(`/api/users/${user.id}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({ _id: user.id, name: 'Jane' });
  });

  it('returns 400 for an invalid id', async () => {
    const response = await request(app).get(`/api/users/${INVALID_ID}`);

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ success: false, message: 'Invalid user ID' });
  });

  it('returns 404 when the user does not exist', async () => {
    const response = await request(app).get(`/api/users/${NON_EXISTENT_ID}`);

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ success: false, message: 'User not found' });
  });
});

describe('PUT /api/users/:id', () => {
  it('updates the user', async () => {
    const user = await createUserInDb({ name: 'Jane', age: 30 });

    const response = await request(app)
      .put(`/api/users/${user.id}`)
      .send({ name: 'Jane Doe', age: 31 });

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({ name: 'Jane Doe', age: 31, email: user.email });

    const saved = await User.findById(user.id);
    expect(saved).toMatchObject({ name: 'Jane Doe', age: 31 });
  });

  it('returns 400 for an invalid id', async () => {
    const response = await request(app).put(`/api/users/${INVALID_ID}`).send({ age: 31 });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Invalid user ID');
  });

  it('returns 404 when the user does not exist', async () => {
    const response = await request(app).put(`/api/users/${NON_EXISTENT_ID}`).send({ age: 31 });

    expect(response.status).toBe(404);
  });

  it('returns 400 for invalid input and leaves the user unchanged', async () => {
    const user = await createUserInDb({ age: 30 });

    const response = await request(app)
      .put(`/api/users/${user.id}`)
      .send({ age: 500, email: 'bad' });

    expect(response.status).toBe(400);
    expect(response.body.errors).toHaveLength(2);
    expect((await User.findById(user.id))?.age).toBe(30);
  });

  it('returns 400 when the body is empty', async () => {
    const user = await createUserInDb();

    const response = await request(app).put(`/api/users/${user.id}`).send({});

    expect(response.status).toBe(400);
  });

  it("returns 409 when changing to another user's email", async () => {
    await createUserInDb({ email: 'taken@example.com' });
    const user = await createUserInDb({ email: 'mine@example.com' });

    const response = await request(app)
      .put(`/api/users/${user.id}`)
      .send({ email: 'taken@example.com' });

    expect(response.status).toBe(409);
  });

  it('allows "changing" the email to the same value', async () => {
    const user = await createUserInDb({ email: 'mine@example.com' });

    const response = await request(app)
      .put(`/api/users/${user.id}`)
      .send({ email: 'mine@example.com', age: 50 });

    expect(response.status).toBe(200);
  });
});

describe('DELETE /api/users/:id', () => {
  it('deletes the user', async () => {
    const user = await createUserInDb();

    const response = await request(app).delete(`/api/users/${user.id}`);

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('User deleted successfully');
    expect(await User.findById(user.id)).toBeNull();
  });

  it('returns 400 for an invalid id', async () => {
    const response = await request(app).delete(`/api/users/${INVALID_ID}`);

    expect(response.status).toBe(400);
  });

  it('returns 404 when the user does not exist', async () => {
    const response = await request(app).delete(`/api/users/${NON_EXISTENT_ID}`);

    expect(response.status).toBe(404);
  });
});

describe('Database constraints', () => {
  it('the unique index rejects duplicates even if the service check is bypassed', async () => {
    // This proves the "last line of defence": inserting directly through the
    // model skips the service's duplicate check, but MongoDB still refuses.
    const input = buildUserInput({ email: 'race@example.com' });
    await User.create(input);

    await expect(User.create(input)).rejects.toMatchObject({ code: 11000 });
  });
});
