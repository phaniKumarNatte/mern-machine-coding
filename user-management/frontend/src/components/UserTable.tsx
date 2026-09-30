import { Link } from 'react-router';
import type { User } from '../types/user';
import { formatDate } from '../utils/formatDate';

interface UserTableProps {
  users: User[];
  onDeleteClick: (user: User) => void;
}

/** A purely presentational component: it renders what it's given and reports clicks upward. */
export function UserTable({ users, onDeleteClick }: UserTableProps) {
  return (
    <table className="table">
      <thead>
        <tr>
          <th scope="col">Name</th>
          <th scope="col">Email</th>
          <th scope="col">Age</th>
          <th scope="col">Created</th>
          <th scope="col">Actions</th>
        </tr>
      </thead>
      <tbody>
        {users.map((user) => (
          <tr key={user._id}>
            <td>{user.name}</td>
            <td>{user.email}</td>
            <td>{user.age}</td>
            <td>{formatDate(user.createdAt)}</td>
            <td className="actions">
              <Link to={`/users/${user._id}`} aria-label={`View ${user.name}`}>
                View
              </Link>
              <Link to={`/users/${user._id}/edit`} aria-label={`Edit ${user.name}`}>
                Edit
              </Link>
              <button
                type="button"
                className="link-button"
                onClick={() => onDeleteClick(user)}
                aria-label={`Delete ${user.name}`}
              >
                Delete
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
