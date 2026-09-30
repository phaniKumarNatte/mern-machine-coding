import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiRequestError } from '../../src/services/apiError';
import * as userService from '../../src/services/userService';
import { buildUser, renderApp } from '../testUtils';

vi.mock('../../src/services/userService');

describe('Create user page', () => {
  const createdUser = buildUser({ _id: 'new-id', name: 'Alice Johnson' });

  beforeEach(() => {
    vi.mocked(userService.createUser).mockResolvedValue(createdUser);
    // After a successful create we navigate to the details page, which loads the user.
    vi.mocked(userService.getUser).mockResolvedValue(createdUser);
  });

  it('renders the form', () => {
    renderApp('/users/new');

    expect(screen.getByRole('heading', { name: 'Create User' })).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toHaveValue('');
    expect(screen.getByLabelText('Email')).toHaveValue('');
    expect(screen.getByLabelText('Age')).toHaveValue(null); // an empty number input
    expect(screen.getByRole('button', { name: 'Create User' })).toBeEnabled();
  });

  it('shows validation errors and does not call the API when fields are empty', async () => {
    const { user } = renderApp('/users/new');

    await user.click(screen.getByRole('button', { name: 'Create User' }));

    expect(screen.getByText('Name is required')).toBeInTheDocument();
    expect(screen.getByText('Email is required')).toBeInTheDocument();
    expect(screen.getByText('Age is required')).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toHaveAttribute('aria-invalid', 'true');
    expect(userService.createUser).not.toHaveBeenCalled();
  });

  it('validates the email format and the age range', async () => {
    const { user } = renderApp('/users/new');

    await user.type(screen.getByLabelText('Name'), 'Alice');
    await user.type(screen.getByLabelText('Email'), 'not-an-email');
    await user.type(screen.getByLabelText('Age'), '200');
    await user.click(screen.getByRole('button', { name: 'Create User' }));

    expect(screen.getByText('Enter a valid email address')).toBeInTheDocument();
    expect(screen.getByText('Age must be a whole number between 0 and 150')).toBeInTheDocument();
    expect(userService.createUser).not.toHaveBeenCalled();
  });

  it('submits valid data and shows the new user', async () => {
    const { user } = renderApp('/users/new');

    await user.type(screen.getByLabelText('Name'), '  Alice Johnson ');
    await user.type(screen.getByLabelText('Email'), 'alice@example.com');
    await user.type(screen.getByLabelText('Age'), '30');
    await user.click(screen.getByRole('button', { name: 'Create User' }));

    // The form trims text and converts age from string to number before sending.
    expect(userService.createUser).toHaveBeenCalledWith({
      name: 'Alice Johnson',
      email: 'alice@example.com',
      age: 30,
    });
    expect(await screen.findByText('User created successfully.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'User Details' })).toBeInTheDocument();
    expect(userService.getUser).toHaveBeenCalledWith('new-id');
  });

  it('shows the API error and stays on the form when creation fails', async () => {
    vi.mocked(userService.createUser).mockRejectedValue(
      new ApiRequestError('A user with this email already exists', 409),
    );
    const { user } = renderApp('/users/new');

    await user.type(screen.getByLabelText('Name'), 'Alice');
    await user.type(screen.getByLabelText('Email'), 'alice@example.com');
    await user.type(screen.getByLabelText('Age'), '30');
    await user.click(screen.getByRole('button', { name: 'Create User' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'A user with this email already exists',
    );
    expect(screen.getByRole('heading', { name: 'Create User' })).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toHaveValue('alice@example.com'); // input is kept
  });

  it("shows the server's field errors next to the matching input", async () => {
    vi.mocked(userService.createUser).mockRejectedValue(
      new ApiRequestError('Validation failed', 400, [
        { field: 'name', message: 'Name must be at most 100 characters' },
      ]),
    );
    const { user } = renderApp('/users/new');

    await user.type(screen.getByLabelText('Name'), 'Alice');
    await user.type(screen.getByLabelText('Email'), 'alice@example.com');
    await user.type(screen.getByLabelText('Age'), '30');
    await user.click(screen.getByRole('button', { name: 'Create User' }));

    expect(await screen.findByText('Name must be at most 100 characters')).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toHaveAccessibleDescription(
      'Name must be at most 100 characters',
    );
  });
});
