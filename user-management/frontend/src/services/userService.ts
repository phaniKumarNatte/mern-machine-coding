import type { ApiSuccessResponse } from '../types/api';
import type { CreateUserRequest, UpdateUserRequest, User } from '../types/user';
import { apiClient } from './apiClient';

/**
 * Every HTTP call about users lives here, so components and hooks just call
 * `userService.getUsers()` and never deal with URLs, HTTP methods or the
 * `{ success, data }` response envelope.
 *
 * It is also the natural seam for tests: component tests mock THIS module.
 */

export async function getUsers(): Promise<User[]> {
  const response = await apiClient.get<ApiSuccessResponse<User[]>>('/users');
  return response.data.data;
}

export async function getUser(id: string): Promise<User> {
  const response = await apiClient.get<ApiSuccessResponse<User>>(`/users/${id}`);
  return response.data.data;
}

export async function createUser(input: CreateUserRequest): Promise<User> {
  const response = await apiClient.post<ApiSuccessResponse<User>>('/users', input);
  return response.data.data;
}

export async function updateUser(id: string, input: UpdateUserRequest): Promise<User> {
  const response = await apiClient.put<ApiSuccessResponse<User>>(`/users/${id}`, input);
  return response.data.data;
}

export async function deleteUser(id: string): Promise<void> {
  await apiClient.delete(`/users/${id}`);
}
