import { screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiRequestError } from '../../src/services/apiError';
import * as userService from '../../src/services/userService';
import { buildUser, neverResolves, renderApp } from '../testUtils';

/**
 * COMPONENT TESTS for the users list page.
 *
 * WHAT is mocked: the userService module (our API layer).
 * WHY:
 *   - These tests are about what the USER sees and does. A real backend would
 *     make them slow, flaky, and dependent on database contents.
 *   - Mocking lets us put the UI into any state on demand: loading forever,
 *     an empty list, a server error. Those are hard to trigger with a real API.
 *   - The backend has its own tests; here we trust the service contract.
 *
 * vi.mock with no factory = "automock": every exported function becomes a vi.fn()
 * that returns undefined until a test tells it what to return.
 */
vi.mock('../../src/services/userService');

const alice = buildUser({ _id: 'id-alice', name: 'Alice Johnson', email: 'alice@example.com' });
const bob = buildUser({ _id: 'id-bob', name: 'Bob Smith', email: 'bob@example.com', age: 42 });

describe('Users list page', () => {
  beforeEach(() => {
    vi.mocked(userService.getUsers).mockResolvedValue([alice, bob]);
  });

  it('shows a loading indicator while users are being fetched', () => {
    vi.mocked(userService.getUsers).mockReturnValue(neverResolves());

    renderApp('/');

    expect(screen.getByRole('status')).toHaveTextContent('Loading users...');
  });

  it('renders the users in a table', async () => {
    renderApp('/');

    // findBy* waits for the element to appear (the fetch is async).
    const aliceRow = (await screen.findByRole('cell', { name: 'Alice Johnson' })).closest('tr')!;
    expect(within(aliceRow).getByText('alice@example.com')).toBeInTheDocument();
    expect(within(aliceRow).getByText('30')).toBeInTheDocument();
    expect(within(aliceRow).getByText('Jan 15, 2026')).toBeInTheDocument();
    expect(within(aliceRow).getByRole('link', { name: 'View Alice Johnson' })).toBeInTheDocument();
    expect(within(aliceRow).getByRole('link', { name: 'Edit Alice Johnson' })).toBeInTheDocument();

    expect(screen.getByRole('cell', { name: 'Bob Smith' })).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument(); // loading is gone
  });

  it('shows an empty state when there are no users', async () => {
    vi.mocked(userService.getUsers).mockResolvedValue([]);

    renderApp('/');

    expect(await screen.findByText(/no users yet/i)).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('shows an error message when loading fails', async () => {
    vi.mocked(userService.getUsers).mockRejectedValue(
      new ApiRequestError('Unable to reach the server. Is the backend running?', 0),
    );

    renderApp('/');

    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to reach the server');
  });

  it('takes the user to the create form', async () => {
    const { user } = renderApp('/');

    await user.click(screen.getByRole('link', { name: 'Create User' }));

    expect(screen.getByRole('heading', { name: 'Create User' })).toBeInTheDocument();
  });

  describe('deleting a user', () => {
    it('asks for confirmation first, and does nothing when cancelled', async () => {
      const { user } = renderApp('/');

      await user.click(await screen.findByRole('button', { name: 'Delete Alice Johnson' }));

      const dialog = screen.getByRole('dialog', { name: 'Delete user' });
      expect(dialog).toHaveTextContent('Are you sure you want to delete Alice Johnson?');

      await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(userService.deleteUser).not.toHaveBeenCalled();
      expect(screen.getByRole('cell', { name: 'Alice Johnson' })).toBeInTheDocument();
    });

    it('deletes the user and removes them from the list', async () => {
      vi.mocked(userService.deleteUser).mockResolvedValue();
      const { user } = renderApp('/');

      await user.click(await screen.findByRole('button', { name: 'Delete Alice Johnson' }));
      await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }));

      expect(userService.deleteUser).toHaveBeenCalledWith('id-alice');
      await waitFor(() => {
        expect(screen.queryByRole('cell', { name: 'Alice Johnson' })).not.toBeInTheDocument();
      });
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(screen.getByText('Alice Johnson was deleted.')).toBeInTheDocument();
      expect(screen.getByRole('cell', { name: 'Bob Smith' })).toBeInTheDocument();
    });

    it('keeps the user and shows the error when deletion fails', async () => {
      vi.mocked(userService.deleteUser).mockRejectedValue(
        new ApiRequestError('User not found', 404),
      );
      const { user } = renderApp('/');

      await user.click(await screen.findByRole('button', { name: 'Delete Alice Johnson' }));
      const dialog = screen.getByRole('dialog');
      await user.click(within(dialog).getByRole('button', { name: 'Delete' }));

      expect(await within(dialog).findByRole('alert')).toHaveTextContent('User not found');
      expect(screen.getByRole('cell', { name: 'Alice Johnson' })).toBeInTheDocument();
    });
  });
});
