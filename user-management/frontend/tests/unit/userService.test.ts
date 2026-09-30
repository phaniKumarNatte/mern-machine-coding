import { AxiosError, AxiosHeaders, type AxiosResponse } from 'axios';
import { describe, expect, it, vi } from 'vitest';
import { apiClient } from '../../src/services/apiClient';
import { ApiRequestError, toApiRequestError } from '../../src/services/apiError';
import * as userService from '../../src/services/userService';
import { buildUser } from '../testUtils';

/**
 * UNIT TESTS for the API service layer.
 *
 * Here we go one level lower than the page tests: instead of mocking the whole
 * userService, we let it run and only replace the HTTP call with vi.spyOn.
 * That checks the service sends the right method + URL and unwraps `data.data`.
 */

/** Builds the minimal object Axios would resolve with. */
function axiosResponse<T>(data: T): AxiosResponse<T> {
  return {
    data,
    status: 200,
    statusText: 'OK',
    headers: {},
    config: { headers: new AxiosHeaders() },
  };
}

describe('userService', () => {
  it('getUsers calls GET /users and returns the data array', async () => {
    const users = [buildUser()];
    const getSpy = vi
      .spyOn(apiClient, 'get')
      .mockResolvedValue(axiosResponse({ success: true, data: users }));

    await expect(userService.getUsers()).resolves.toEqual(users);
    expect(getSpy).toHaveBeenCalledWith('/users');
  });

  it('updateUser calls PUT /users/:id with the changes', async () => {
    const updated = buildUser({ age: 31 });
    const putSpy = vi
      .spyOn(apiClient, 'put')
      .mockResolvedValue(axiosResponse({ success: true, data: updated }));

    await expect(userService.updateUser('abc', { age: 31 })).resolves.toEqual(updated);
    expect(putSpy).toHaveBeenCalledWith('/users/abc', { age: 31 });
  });
});

describe('toApiRequestError', () => {
  it("uses the backend's message, status and field errors", () => {
    const response = {
      ...axiosResponse({
        success: false,
        message: 'Validation failed',
        errors: [{ field: 'email', message: 'Email is required' }],
      }),
      status: 400,
    };
    const axiosError = new AxiosError('Request failed', 'ERR_BAD_REQUEST', undefined, {}, response);

    const error = toApiRequestError(axiosError);

    expect(error).toBeInstanceOf(ApiRequestError);
    expect(error).toMatchObject({
      message: 'Validation failed',
      status: 400,
      fieldErrors: [{ field: 'email', message: 'Email is required' }],
    });
  });

  it('explains when the server could not be reached', () => {
    const networkError = new AxiosError('Network Error', 'ERR_NETWORK');

    expect(toApiRequestError(networkError).message).toBe(
      'Unable to reach the server. Is the backend running?',
    );
  });
});
