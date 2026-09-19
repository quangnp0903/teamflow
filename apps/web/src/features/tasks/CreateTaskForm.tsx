import { type SubmitEvent, useState } from 'react';

import type { CreateTaskInput } from './task.types';
import styles from './CreateTaskForm.module.css';

type CreateTaskFormProps = Readonly<{
  disabled?: boolean;
  onCreate(input: CreateTaskInput): Promise<void>;
}>;

const CreateTaskForm: React.FC<CreateTaskFormProps> = ({
  disabled = false,
  onCreate,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isFormDisabled = disabled || isSubmitting;

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedTitle = title.trim();
    const normalizedDescription = description.trim();

    if (normalizedTitle === '') {
      setErrorMessage('Title is required');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await onCreate({
        title: normalizedTitle,
        ...(normalizedDescription === ''
          ? {}
          : { description: normalizedDescription }),
      });

      setTitle('');
      setDescription('');
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Task could not be created'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className={styles.section} aria-labelledby="create-task-heading">
      <h2 id="create-task-heading">Create a task</h2>

      <form
        className={styles.form}
        aria-busy={isSubmitting}
        onSubmit={(event) => void handleSubmit(event)}
      >
        <label className={styles.field}>
          <span>Title</span>
          <input
            maxLength={120}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="What needs to be done?"
            required
            type="text"
            value={title}
            disabled={isFormDisabled}
          />
        </label>

        <label className={styles.field}>
          <span>Description</span>
          <textarea
            maxLength={1000}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Add optional details"
            rows={4}
            value={description}
            disabled={isFormDisabled}
          />
        </label>

        {errorMessage !== null && (
          <p className="error-message" id="create-task-error" role="alert">
            {errorMessage}
          </p>
        )}

        <button
          className={styles.primaryButton}
          disabled={isFormDisabled}
          type="submit"
        >
          {isSubmitting ? 'Creating…' : 'Create task'}
        </button>
      </form>
    </section>
  );
};

export default CreateTaskForm;
