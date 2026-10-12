import { type FC } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { loginFormSchema, type LoginFormValues } from './auth.form-schema';
import type { LoginInput } from './auth.types';
import styles from './AuthForm.module.css';

type LoginFormProps = Readonly<{
  onLogin(input: LoginInput): Promise<void>;
}>;

const LoginForm: FC<LoginFormProps> = ({ onLogin }) => {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (input: LoginFormValues) => {
    try {
      await onLogin(input);
    } catch (error) {
      setError('root.server', {
        type: 'server',
        message: error instanceof Error ? error.message : 'Sign in failed',
      });
    }
  };

  return (
    <section className={styles.section} aria-labelledby="sign-in-heading">
      <h2 id="sign-in-heading">Sign in</h2>

      <form
        className={styles.form}
        aria-busy={isSubmitting}
        noValidate
        onSubmit={(event) => void handleSubmit(onSubmit)(event)}
      >
        <label className={styles.field}>
          <span>Email</span>

          <input
            {...register('email')}
            type="email"
            autoComplete="username"
            required
            maxLength={254}
            readOnly={isSubmitting}
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? 'login-email-error' : undefined}
          />
        </label>

        {errors.email && (
          <p
            id="login-email-error"
            className={styles.errorMessage}
            role="alert"
          >
            {errors.email.message}
          </p>
        )}

        <label className={styles.field}>
          <span>Password</span>

          <input
            {...register('password')}
            type="password"
            autoComplete="current-password"
            required
            maxLength={128}
            readOnly={isSubmitting}
            aria-invalid={Boolean(errors.password)}
            aria-describedby={
              errors.password ? 'login-password-error' : undefined
            }
          />
        </label>

        {errors.password && (
          <p
            id="login-password-error"
            className={styles.errorMessage}
            role="alert"
          >
            {errors.password.message}
          </p>
        )}

        {errors.root?.server && (
          <p className={styles.errorMessage} role="alert">
            {errors.root.server.message}
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
