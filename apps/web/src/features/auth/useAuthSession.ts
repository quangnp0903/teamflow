import { useEffect, useState } from 'react';

import { getCurrentUser } from './auth.api';
import type { AuthState } from './auth.types';

type UseAuthSessionResult = Readonly<{
  state: AuthState;
}>;

function useAuthSession(): UseAuthSessionResult {
  const [state, setState] = useState<AuthState>({
    status: 'loading',
  });

  useEffect(() => {
    let isCurrent = true;

    async function restoreSession() {
      try {
        const user = await getCurrentUser();

        if (!isCurrent) {
          return;
        }

        if (user === null) {
          setState({
            status: 'unauthenticated',
          });
        } else {
          setState({
            status: 'authenticated',
            user,
          });
        }
      } catch (error) {
        if (!isCurrent) {
          return;
        }

        setState({
          status: 'error',
          message:
            error instanceof Error
              ? error.message
              : 'Your session could not be checked',
        });
      }
    }

    void restoreSession();

    return () => {
      isCurrent = false;
    };
  }, []);

  return {
    state,
  };
}

export default useAuthSession;
