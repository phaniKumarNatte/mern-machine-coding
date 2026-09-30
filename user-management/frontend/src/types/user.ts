/**
 * A user as the API returns it. Dates arrive as ISO strings because JSON has
 * no Date type, which is why these are `string` here but `Date` on the backend.
 */
export interface User {
  _id: string;
  name: string;
  email: string;
  age: number;
  createdAt: string;
  updatedAt: string;
}

export type CreateUserRequest = Pick<User, 'name' | 'email' | 'age'>;

export type UpdateUserRequest = Partial<CreateUserRequest>;
