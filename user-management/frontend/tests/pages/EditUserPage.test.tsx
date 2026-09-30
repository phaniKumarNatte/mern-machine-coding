import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ApiRequestError } from '../../src/services/apiError';
import * as userService from '../../src/services/userService';
import { buildUser, neverResolves, renderApp } from '../testUtils';

vi.mock('../../src/services/userService');

const USER_ID = '665f1f77bcf86cd799439011';
const existingUser = buildUser({ _id: USER_ID, name: 'Alice Johnson', age: 30 });

describe('Edit user page', () => {
  it('shows a loading indicator, then loads the user from the id in the URL', async () => {
    vi.mocked(userService.getUser).mockResolvedValue(existingUser);

    renderApp(`/users/${USER_ID}/edit`);

    expect(screen.getByRole('status')).toHaveTextContent('Loading user...');
    expect(await screen.findByLabelText('Name')).toBeInTheDocument();
    expect(userService.getUser).toHaveBeenCalledWith(USER_ID);
  });

  it('pre-fills the form with the existing values', async () => {
    vi.mocked(userService.getUser).mockResolvedValue(existingUser);

    renderApp(`/users/${USER_ID}/edit`);

    expect(await screen.findByLabelText('Name')).toHaveValue('Alice Johnson');
    expect(screen.getByLabelText('Email')).toHaveValue('alice@example.com');
    expect(screen.getByLabelText('Age')).toHaveValue(30);
  });

  it('saves the changes and shows the updated user', async () => {
    const updatedUser = { ...existingUser, name: 'Alice Smith', age: 31 };
    // First call: the edit page loads the user. Second call: the details page reloads it.
    vi.mocked(userService.getUser)
      .mockResolvedValueOnce(existingUser)
      .mockResolvedValueOnce(updatedUser);
    vi.mocked(userService.updateUser).mockResolvedValue(updatedUser);
    const { user } = renderApp(`/users/${USER_ID}/edit`);

    const nameInput = await screen.findByLabelText('Name');
    await user.clear(nameInput);
    await user.type(nameInput, 'Alice Smith');
    await user.clear(screen.getByLabelText('Age'));
    await user.type(screen.getByLabelText('Age'), '31');
    await user.click(screen.getByRole('button', { name: 'Save Changes' }));

    expect(userService.updateUser).toHaveBeenCalledWith(USER_ID, {
      name: 'Alice Smith',
      email: 'alice@example.com',
      age: 31,
    });
    expect(await screen.findByText('User updated successfully.')).toBeInTheDocument();
    expect(await screen.findByText('Alice Smith')).toBeInTheDocument();
  });

  it('shows an error when the user cannot be loaded', async () => {
    vi.mocked(userService.getUser).mockRejectedValue(new ApiRequestError('User not found', 404));

    renderApp(`/users/${USER_ID}/edit`);

    expect(await screen.findByRole('alert')).toHaveTextContent('User not found');
    expect(screen.queryByLabelText('Name')).not.toBeInTheDocument();
  });

  it('shows an error and stays on the page when saving fails', async () => {
    vi.mocked(userService.getUser).mockResolvedValue(existingUser);
    vi.mocked(userService.updateUser).mockRejectedValue(
      new ApiRequestError('A user with this email already exists', 409),
    );
    const { user } = renderApp(`/users/${USER_ID}/edit`);

    const emailInput = await screen.findByLabelText('Email');
    await user.clear(emailInput);
    await user.type(emailInput, 'taken@example.com');
    await user.click(screen.getByRole('button', { name: 'Save Changes' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'A user with this email already exists',
    );
    expect(screen.getByRole('heading', { name: 'Edit User' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save Changes' })).toBeEnabled();
  });

  it('disables the submit button while saving', async () => {
    vi.mocked(userService.getUser).mockResolvedValue(existingUser);
    vi.mocked(userService.updateUser).mockReturnValue(neverResolves());
    const { user } = renderApp(`/users/${USER_ID}/edit`);

    await screen.findByLabelText('Name');
    await user.click(screen.getByRole('button', { name: 'Save Changes' }));

    expect(screen.getByRole('button', { name: 'Saving...' })).toBeDisabled();
  });
});
