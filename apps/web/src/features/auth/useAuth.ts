import { useContext } from 'react';

import { AuthContext, type AuthContextValue } from './auth.context';

function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
}

export default useAuth;
