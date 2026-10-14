import type { FC } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import {
  createWorkspaceFormSchema,
  type CreateWorkspaceFormValues,
} from './workspace.form-schema';
import type { CreateWorkspaceInput } from './workspace.types';
import styles from './CreateWorkspaceForm.module.css';

type CreateWorkspaceFormProps = Readonly<{
  disabled?: boolean;
  onCreate(input: CreateWorkspaceInput): Promise<void>;
}>;

const CreateWorkspaceForm: FC<CreateWorkspaceFormProps> = ({
  disabled = false,
  onCreate,
}) => {
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CreateWorkspaceFormValues>({
    resolver: zodResolver(createWorkspaceFormSchema),
    defaultValues: {
      name: '',
    },
  });

  const isFormDisabled = disabled || isSubmitting;

  const onSubmit = async (input: CreateWorkspaceFormValues): Promise<void> => {
    try {
      await onCreate(input);
      reset();
    } catch (error) {
      setError('root.server', {
        type: 'server',
        message:
          error instanceof Error
            ? error.message
            : 'Workspace could not be created',
      });
    }
  };

  return (
    <section
      className={styles.section}
      aria-labelledby="create-workspace-heading"
    >
      <h2 id="create-workspace-heading">Create a workspace</h2>

      <form
        className={styles.form}
        aria-busy={isSubmitting}
        noValidate
        onSubmit={(event) => void handleSubmit(onSubmit)(event)}
      >
        <label className={styles.field}>
          <span>Workspace name</span>

          <input
            {...register('name')}
            className={styles.control}
            type="text"
            placeholder="e.g. Product team"
            required
            maxLength={120}
            readOnly={isFormDisabled}
            aria-invalid={Boolean(errors.name)}
            aria-describedby={
              errors.name ? 'create-workspace-name-error' : undefined
            }
          />
        </label>

        {errors.name && (
          <p
            id="create-workspace-name-error"
            className={styles.errorMessage}
            role="alert"
          >
            {errors.name.message}
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
          disabled={isFormDisabled}
        >
          {isSubmitting ? 'Creating…' : 'Create workspace'}
        </button>
      </form>
    </section>
  );
};

export default CreateWorkspaceForm;
