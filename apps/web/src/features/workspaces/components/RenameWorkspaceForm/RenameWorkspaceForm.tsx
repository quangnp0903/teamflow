import { useState, type FC } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import type { RenameWorkspaceInput } from '../../workspace.types';
import {
  renameWorkspaceFormSchema,
  type RenameWorkspaceFormValues,
} from '../../workspace.form-schema';
import styles from './RenameWorkspaceForm.module.css';

type RenameWorkspaceFormProps = Readonly<{
  workspaceName: string;
  onRename(input: RenameWorkspaceInput): Promise<void>;
}>;

const RenameWorkspaceForm: FC<RenameWorkspaceFormProps> = ({
  workspaceName,
  onRename,
}) => {
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RenameWorkspaceFormValues>({
    resolver: zodResolver(renameWorkspaceFormSchema),
    values: {
      name: workspaceName,
    },
  });

  const onSubmit = async (input: RenameWorkspaceFormValues): Promise<void> => {
    setSuccessMessage(null);

    try {
      await onRename(input);
      setSuccessMessage('Workspace name saved.');
    } catch (error) {
      setError('root.server', {
        type: 'server',
        message:
          error instanceof Error
            ? error.message
            : 'Workspace could not be renamed',
      });
    }
  };
  return (
    <section
      className={styles.section}
      aria-labelledby="rename-workspace-heading"
    >
      <h2 id="rename-workspace-heading">Rename workspace</h2>

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
            required
            maxLength={120}
            readOnly={isSubmitting}
            aria-invalid={Boolean(errors.name)}
            aria-describedby={
              errors.name ? 'rename-workspace-name-error' : undefined
            }
            onInput={() => setSuccessMessage(null)}
          />
        </label>

        {errors.name && (
          <p
            id="rename-workspace-name-error"
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

        {successMessage && (
          <p className={styles.successMessage} role="status">
            {successMessage}
          </p>
        )}

        <button
          className={styles.primaryButton}
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Saving…' : 'Save changes'}
        </button>
      </form>
    </section>
  );
};
export default RenameWorkspaceForm;
