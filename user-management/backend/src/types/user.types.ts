/**
 * The shape of a user as stored in MongoDB.
 * `createdAt` / `updatedAt` are added automatically by Mongoose (`timestamps: true`).
 */
export interface IUser {
  name: string;
  email: string;
  age: number;
  createdAt: Date;
  updatedAt: Date;
}

/** What a client must send to create a user (POST /api/users). */
export type CreateUserRequest = Pick<IUser, 'name' | 'email' | 'age'>;

/** What a client may send to update a user (PUT /api/users/:id). Every field is optional. */
export type UpdateUserRequest = Partial<CreateUserRequest>;
