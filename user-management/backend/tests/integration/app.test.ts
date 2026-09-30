import request from 'supertest';
import { app } from '../../src/app';

/**
 * Supertest tests that need NO database: the app-level plumbing
 * (health check, unknown routes, CORS). Because these requests never reach
 * Mongoose, we don't start the in-memory MongoDB in this file.
 */
describe('app', () => {
  it('GET /api/health returns ok', async () => {
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true, data: { status: 'ok' } });
  });

  it('returns a JSON 404 for unknown routes', async () => {
    const response = await request(app).get('/api/does-not-exist');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      success: false,
      message: 'Route not found: GET /api/does-not-exist',
    });
  });

  it('sends CORS headers for the configured client origin', async () => {
    const response = await request(app).get('/api/health').set('Origin', 'http://localhost:5173');

    expect(response.headers['access-control-allow-origin']).toBe('http://localhost:5173');
  });
});
