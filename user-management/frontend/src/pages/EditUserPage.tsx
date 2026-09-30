import { Link, useNavigate, useParams } from 'react-router';
import { ErrorMessage } from '../components/ErrorMessage';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { UserForm } from '../components/UserForm';
import { useUser } from '../hooks/useUser';
import * as userService from '../services/userService';
import type { CreateUserRequest } from '../types/user';
import type { FlashState } from '../utils/flashMessage';
import { toFormValues } from '../utils/userForm';

export function EditUserPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { user, isLoading, error } = useUser(id);

  async function handleUpdate(input: CreateUserRequest) {
    await userService.updateUser(id, input);
    const state: FlashState = { message: 'User updated successfully.' };
    navigate(`/users/${id}`, { state });
  }

  return (
    <section>
      <div className="page-header">
        <h1>Edit User</h1>
        <Link to="/">Back to users</Link>
      </div>

      {isLoading && <LoadingSpinner label="Loading user..." />}
      {error && <ErrorMessage message={error} />}
      {user && (
        <UserForm
          initialValues={toFormValues(user)}
          submitLabel="Save Changes"
          onSubmit={handleUpdate}
        />
      )}
    </section>
  );
}
