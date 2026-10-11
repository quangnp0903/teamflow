import { type FC, useState } from 'react';

import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';
import useAuth from './useAuth';
import type { LoginInput, RegisterInput } from './auth.types';
import styles from './AuthScreen.module.css';

type AuthView = 'login' | 'register';

const AuthScreen: FC = () => {
  const { login, register } = useAuth();

  const [view, setView] = useState<AuthView>('login');
  const [isPending, setIsPending] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function handleLogin(input: LoginInput): Promise<void> {
    setIsPending(true);

    try {
      await login(input);
    } finally {
      setIsPending(false);
    }
  }

  async function handleRegister(input: RegisterInput): Promise<void> {
    setIsPending(true);

    try {
      await register(input);

      setSuccessMessage('Account created. Sign in with your new credentials.');
      setView('login');
    } finally {
      setIsPending(false);
    }
  }

  function handleSwitchView() {
    setSuccessMessage(null);
    setView(view === 'login' ? 'register' : 'login');
  }

  return (
    <div className={styles.screen}>
      {successMessage !== null && (
        <p className={styles.notice} role="status">
          {successMessage}
        </p>
      )}

      {view === 'login' ? (
        <LoginForm onLogin={handleLogin} />
      ) : (
        <RegisterForm onRegister={handleRegister} />
      )}

      <button
        className={styles.switchButton}
        type="button"
        disabled={isPending}
        onClick={handleSwitchView}
      >
        {view === 'login'
          ? 'Need an account? Create one'
          : 'Already have an account? Sign in'}
      </button>
    </div>
  );
};

export default AuthScreen;
