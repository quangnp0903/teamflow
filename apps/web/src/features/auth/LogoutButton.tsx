import { type FC, useState } from 'react';

import styles from './LogoutButton.module.css';

type LogoutButtonProps = Readonly<{
  onLogout(): Promise<void>;
}>;

const LogoutButton: FC<LogoutButtonProps> = ({ onLogout }) => {
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLogout = async () => {
    if (isSigningOut) {
      return;
    }

    setIsSigningOut(true);
    setErrorMessage(null);

    try {
      await onLogout();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Sign out failed'
      );
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <div className={styles.controls}>
      <button
        className={styles.button}
        type="button"
        disabled={isSigningOut}
        aria-busy={isSigningOut}
        onClick={() => void handleLogout()}
      >
        {isSigningOut ? 'Signing out…' : 'Sign out'}
      </button>

      {errorMessage !== null && (
        <p className={styles.errorMessage} role="alert">
          {errorMessage}
        </p>
      )}
    </div>
  );
};

export default LogoutButton;
