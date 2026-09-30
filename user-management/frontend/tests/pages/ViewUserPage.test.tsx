import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ApiRequestError } from '../../src/services/apiError';
import * as userService from '../../src/services/userService';
import { buildUser, renderApp } from '../testUtils';

vi.mock('../../src/services/userService');

describe('View user page', () => {
  it("displays the user's details", async () => {
    vi.mocked(userService.getUser).mockResolvedValue(buildUser({ name: 'Alice Johnson', age: 30 }));

    renderApp('/users/665f1f77bcf86cd799439011');

    expect(await screen.findByText('Alice Johnson')).toBeInTheDocument();
    expect(screen.getByText('alice@example.com')).toBeInTheDocument();
    expect(screen.getByText('30')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Edit User' })).toHaveAttribute(
      'href',
      '/users/665f1f77bcf86cd799439011/edit',
    );
  });

  it('shows an error when the user does not exist', async () => {
    vi.mocked(userService.getUser).mockRejectedValue(new ApiRequestError('User not found', 404));

    renderApp('/users/665f1f77bcf86cd799439011');

    expect(await screen.findByRole('alert')).toHaveTextContent('User not found');
  });
});
