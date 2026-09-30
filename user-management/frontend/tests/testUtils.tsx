import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { App } from '../src/App';
import type { User } from '../src/types/user';

/**
 * Renders the WHOLE app, starting at `url`, inside an in-memory router.
 *
 * We render <App /> rather than a single page so tests can follow real user
 * journeys ("submit the form -> land on the details page") through the real
 * route table. MemoryRouter keeps the URL in memory instead of the browser's address bar.
 */
export function renderApp(url = '/') {
  // userEvent simulates real interactions (focus, key presses, clicks)
  // more faithfully than fireEvent. setup() must be called before render.
  const user = userEvent.setup();
  const result = render(
    <MemoryRouter initialEntries={[url]}>
      <App />
    </MemoryRouter>,
  );
  return { user, ...result };
}

/** Builds a realistic User object for tests; override only what the test cares about. */
export function buildUser(overrides: Partial<User> = {}): User {
  return {
    _id: '665f1f77bcf86cd799439011',
    name: 'Alice Johnson',
    email: 'alice@example.com',
    age: 30,
    // Midday UTC, so the formatted date is the same in every timezone.
    createdAt: '2026-01-15T12:00:00.000Z',
    updatedAt: '2026-01-15T12:00:00.000Z',
    ...overrides,
  };
}

/** A promise that never settles: keeps a component in its loading state. */
export function neverResolves<T>(): Promise<T> {
  return new Promise<T>(() => {});
}
