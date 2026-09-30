import axios from 'axios';
import { toApiRequestError } from './apiError';

/**
 * One pre-configured Axios instance for the whole app.
 *
 * `import.meta.env.VITE_API_URL` is replaced by Vite at build time. When it
 * isn't set we call `/api` on the same origin, and the Vite dev server proxies
 * those requests to Express (see vite.config.ts).
 */
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 10_000,
});

// Every failed request is converted into our own ApiRequestError, in one place.
apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => Promise.reject(toApiRequestError(error)),
);
