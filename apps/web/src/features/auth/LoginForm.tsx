import { type FC, type SubmitEvent, useState } from 'react';

import type { LoginInput } from './auth.types';
import styles from './LoginForm.module.css';

type LoginFormProps = Readonly<{
  onLogin(input: LoginInput): Promise<void>;
}>;

const LoginForm: FC<LoginFormProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await onLogin({
        email: email.trim().toLowerCase(),
        password,
      });
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Sign in failed'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className={styles.section} aria-labelledby="sign-in-heading">
      <h2 id="sign-in-heading">Sign in</h2>

      <form
        className={styles.form}
        aria-busy={isSubmitting}
        onSubmit={(event) => void handleSubmit(event)}
      >
        <label className={styles.field}>
          <span>Email</span>

          <input
            type="email"
            name="email"
            autoComplete="username"
            required
            maxLength={254}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={isSubmitting}
          />
        </label>

        <label className={styles.field}>
          <span>Password</span>

          <input
            type="password"
            name="password"
            autoComplete="current-password"
            required
            maxLength={128}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={isSubmitting}
          />
        </label>

        {errorMessage !== null && (
          <p className={styles.errorMessage} role="alert">
            {errorMessage}
          </p>
        )}

        <button
          className={styles.primaryButton}
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </section>
  );
};

export default LoginForm;
