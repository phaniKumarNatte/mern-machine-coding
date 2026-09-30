import { useState } from 'react';
import { Link } from 'react-router';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { ErrorMessage } from '../components/ErrorMessage';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { UserTable } from '../components/UserTable';
import { useUsers } from '../hooks/useUsers';
import type { User } from '../types/user';
import { getErrorMessage } from '../utils/getErrorMessage';

export function UsersListPage() {
  const { users, isLoading, error, deleteUser } = useUsers();

  // Delete flow state: which user is pending confirmation, and how that's going.
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  function openDeleteDialog(user: User) {
    setUserToDelete(user);
    setDeleteError(null);
    setSuccessMessage(null);
  }

  async function handleConfirmDelete() {
    if (!userToDelete) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteUser(userToDelete._id);
      setSuccessMessage(`${userToDelete.name} was deleted.`);
      setUserToDelete(null);
    } catch (err) {
      setDeleteError(getErrorMessage(err)); // keep the dialog open and show why
    } finally {
      setIsDeleting(false);
    }
  }

  function renderContent() {
    if (isLoading) return <LoadingSpinner label="Loading users..." />;
    if (error) return <ErrorMessage message={error} />;
    if (users.length === 0) {
      return <p className="empty-state">No users yet. Create the first one!</p>;
    }
    return <UserTable users={users} onDeleteClick={openDeleteDialog} />;
  }

  return (
    <section>
      <div className="page-header">
        <h1>Users</h1>
        <Link to="/users/new" className="button button-primary">
          Create User
        </Link>
      </div>

      {successMessage && <p className="alert alert-success">{successMessage}</p>}

      {renderContent()}

      {userToDelete && (
        <ConfirmDialog
          title="Delete user"
          message={`Are you sure you want to delete ${userToDelete.name}? This cannot be undone.`}
          confirmLabel="Delete"
          isConfirming={isDeleting}
          error={deleteError}
          onConfirm={handleConfirmDelete}
          onCancel={() => setUserToDelete(null)}
        />
      )}
    </section>
  );
}
