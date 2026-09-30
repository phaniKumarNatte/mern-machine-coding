import { Link, useNavigate } from 'react-router';
import { UserForm } from '../components/UserForm';
import * as userService from '../services/userService';
import type { CreateUserRequest } from '../types/user';
import type { FlashState } from '../utils/flashMessage';

export function CreateUserPage() {
  const navigate = useNavigate();

  // If createUser throws, UserForm catches it and displays the error.
  async function handleCreate(input: CreateUserRequest) {
    const user = await userService.createUser(input);
    const state: FlashState = { message: 'User created successfully.' };
    navigate(`/users/${user._id}`, { state });
  }

  return (
    <section>
      <div className="page-header">
        <h1>Create User</h1>
        <Link to="/">Back to users</Link>
      </div>
      <UserForm submitLabel="Create User" onSubmit={handleCreate} />
    </section>
  );
}
