import { Link, useLocation, useParams } from 'react-router';
import { ErrorMessage } from '../components/ErrorMessage';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { useUser } from '../hooks/useUser';
import { getFlashMessage } from '../utils/flashMessage';
import { formatDate } from '../utils/formatDate';

export function ViewUserPage() {
  const { id = '' } = useParams();
  const location = useLocation();
  const { user, isLoading, error } = useUser(id);
  const flashMessage = getFlashMessage(location.state);

  return (
    <section>
      <div className="page-header">
        <h1>User Details</h1>
        <Link to="/">Back to users</Link>
      </div>

      {flashMessage && <p className="alert alert-success">{flashMessage}</p>}
      {isLoading && <LoadingSpinner label="Loading user..." />}
      {error && <ErrorMessage message={error} />}

      {user && (
        <>
          <dl className="details">
            <dt>Name</dt>
            <dd>{user.name}</dd>
            <dt>Email</dt>
            <dd>{user.email}</dd>
            <dt>Age</dt>
            <dd>{user.age}</dd>
            <dt>Created</dt>
            <dd>{formatDate(user.createdAt)}</dd>
            <dt>Last updated</dt>
            <dd>{formatDate(user.updatedAt)}</dd>
          </dl>
          <Link to={`/users/${user._id}/edit`} className="button button-primary">
            Edit User
          </Link>
        </>
      )}
    </section>
  );
}
