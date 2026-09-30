import { useCallback, useEffect, useState } from 'react';
import * as userService from '../services/userService';
import type { User } from '../types/user';
import { getErrorMessage } from '../utils/getErrorMessage';

/**
 * Loads the list of users and exposes a way to delete one.
 *
 * Hooks hold the "stateful" part of data fetching (loading / error / data),
 * so page components can stay focused on what to render.
 */
export function useUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // If the component unmounts before the request finishes, `ignore` stops us
    // from setting state on a component that's gone (and from showing stale data).
    let ignore = false;

    userService
      .getUsers()
      .then((data) => {
        if (!ignore) setUsers(data);
      })
      .catch((err: unknown) => {
        if (!ignore) setError(getErrorMessage(err));
      })
      .finally(() => {
        if (!ignore) setIsLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, []);

  /** Deletes on the server, then removes the user from local state (no refetch needed). */
  const deleteUser = useCallback(async (id: string): Promise<void> => {
    await userService.deleteUser(id);
    setUsers((current) => current.filter((user) => user._id !== id));
  }, []);

  return { users, isLoading, error, deleteUser };
}
