import { type FC } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import {
  registerFormSchema,
  type RegisterFormValues,
} from './auth.form-schema';
import type { RegisterInput } from './auth.types';
import styles from './AuthForm.module.css';

type RegisterFormProps = Readonly<{
  onRegister(input: RegisterInput): Promise<void>;
}>;

const RegisterForm: FC<RegisterFormProps> = ({ onRegister }) => {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: {
      displayName: '',
      email: '',
      password: '',
    },
  });

  const onSubmit = async (input: RegisterFormValues) => {
    try {
      await onRegister(input);
    } catch (error) {
      setError('root.server', {
        type: 'server',
        message:
          error instanceof Error ? error.message : 'Account creation failed',
      });
    }
  };

  return (
    <section className={styles.section} aria-labelledby="sign-up-heading">
      <h2 id="sign-up-heading">Create an account</h2>

      <form
        className={styles.form}
        aria-busy={isSubmitting}
        noValidate
        onSubmit={(event) => void handleSubmit(onSubmit)(event)}
      >
        <label className={styles.field}>
          <span>Display name</span>

          <input
            {...register('displayName')}
            type="text"
            required
            maxLength={80}
            readOnly={isSubmitting}
            aria-invalid={Boolean(errors.displayName)}
            aria-describedby={
              errors.displayName ? 'register-displayName-error' : undefined
            }
          />
        </label>

        {errors.displayName && (
          <p
            id="register-displayName-error"
            className={styles.errorMessage}
            role="alert"
          >
            {errors.displayName.message}
          </p>
        )}

        <label className={styles.field}>
          <span>Email</span>

          <input
            {...register('email')}
            autoComplete="username"
            type="email"
            required
            maxLength={254}
            readOnly={isSubmitting}
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? 'register-email-error' : undefined}
          />
        </label>

        {errors.email && (
          <p
            id="register-email-error"
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
            autoComplete="new-password"
            required
            minLength={15}
            maxLength={128}
            aria-invalid={Boolean(errors.password)}
            aria-describedby={
              errors.password
                ? 'register-password-hint register-password-error'
                : 'register-password-hint'
            }
            readOnly={isSubmitting}
          />

          <span id="register-password-hint" className={styles.hint}>
            Use 15–128 characters.
          </span>
        </label>

        {errors.password && (
          <p
            id="register-password-error"
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
          {isSubmitting ? 'Creating account…' : 'Create account'}
        </button>
      </form>
    </section>
  );
};

export default RegisterForm;
