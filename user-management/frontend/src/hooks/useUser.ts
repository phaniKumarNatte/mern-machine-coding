import { useEffect, useState } from 'react';
import * as userService from '../services/userService';
import type { User } from '../types/user';
import { getErrorMessage } from '../utils/getErrorMessage';

interface UseUserState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
}

/** Loads a single user by id (used by the View and Edit pages). */
export function useUser(id: string): UseUserState {
  const [state, setState] = useState<UseUserState>({ user: null, isLoading: true, error: null });

  useEffect(() => {
    let ignore = false;

    userService
      .getUser(id)
      .then((user) => {
        if (!ignore) setState({ user, isLoading: false, error: null });
      })
      .catch((err: unknown) => {
        if (!ignore) setState({ user: null, isLoading: false, error: getErrorMessage(err) });
      });

    return () => {
      ignore = true;
    };
  }, [id]);

  return state;
}
