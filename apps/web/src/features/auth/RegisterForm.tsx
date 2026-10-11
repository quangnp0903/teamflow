import { type FC, type SubmitEvent, useState } from 'react';

import type { RegisterInput } from './auth.types';
import styles from './AuthForm.module.css';

type RegisterFormProps = Readonly<{
  onRegister(input: RegisterInput): Promise<void>;
}>;

const RegisterForm: FC<RegisterFormProps> = ({ onRegister }) => {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    const normalizedDisplayName = displayName.trim();

    if (normalizedDisplayName.length === 0) {
      setErrorMessage('Please enter a display name');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await onRegister({
        displayName: normalizedDisplayName,
        email: email.trim().toLowerCase(),
        password,
      });
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Account creation failed'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className={styles.section} aria-labelledby="sign-up-heading">
      <h2 id="sign-up-heading">Create an account</h2>

      <form
        className={styles.form}
        aria-busy={isSubmitting}
        onSubmit={(event) => void handleSubmit(event)}
      >
        <label className={styles.field}>
          <span>Display name</span>

          <input
            type="text"
            name="displayName"
            required
            maxLength={80}
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            disabled={isSubmitting}
          />
        </label>

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
            autoComplete="new-password"
            required
            minLength={15}
            maxLength={128}
            aria-describedby="register-password-hint"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={isSubmitting}
          />

          <span id="register-password-hint" className={styles.hint}>
            Use 15–128 characters.
          </span>
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
          {isSubmitting ? 'Creating account…' : 'Create account'}
        </button>
      </form>
    </section>
  );
};

export default RegisterForm;
