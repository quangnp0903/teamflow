import { useState, type FC } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import type { AddWorkspaceMemberInput } from '../../workspace.types';
import {
  addWorkspaceMemberFormSchema,
  type AddWorkspaceMemberFormValues,
} from '../../workspace.form-schema';
import styles from './AddWorkspaceMemberForm.module.css';

type AddWorkspaceMemberFormProps = Readonly<{
  onAdd(input: AddWorkspaceMemberInput): Promise<void>;
}>;

const AddWorkspaceMemberForm: FC<AddWorkspaceMemberFormProps> = ({ onAdd }) => {
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    resetField,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<AddWorkspaceMemberFormValues>({
    resolver: zodResolver(addWorkspaceMemberFormSchema),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = async (
    input: AddWorkspaceMemberFormValues
  ): Promise<void> => {
    setSuccessMessage(null);

    try {
      await onAdd(input);
      resetField('email');
      setSuccessMessage('Member added.');
    } catch (error) {
      setError('root.server', {
        type: 'server',
        message:
          error instanceof Error ? error.message : 'Member could not be added',
      });
    }
  };

  return (
    <div className={styles.section}>
      <h3 id="add-workspace-member-heading">Add a member</h3>

      <p className={styles.description}>
        Enter the email of a registered Teamflow user.
      </p>

      <form
        className={styles.form}
        aria-labelledby="add-workspace-member-heading"
        aria-busy={isSubmitting}
        noValidate
        onSubmit={(event) => void handleSubmit(onSubmit)(event)}
      >
        <label className={styles.field}>
          <span>Member email</span>

          <input
            {...register('email')}
            className={styles.control}
            type="email"
            autoComplete="off"
            required
            maxLength={254}
            readOnly={isSubmitting}
            aria-invalid={Boolean(errors.email)}
            aria-describedby={
              errors.email ? 'add-workspace-member-email-error' : undefined
            }
            onInput={() => setSuccessMessage(null)}
          />
        </label>

        {errors.email && (
          <p
            id="add-workspace-member-email-error"
            className={styles.errorMessage}
            role="alert"
          >
            {errors.email.message}
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
          {isSubmitting ? 'Adding…' : 'Add member'}
        </button>
      </form>
    </div>
  );
};

export default AddWorkspaceMemberForm;
