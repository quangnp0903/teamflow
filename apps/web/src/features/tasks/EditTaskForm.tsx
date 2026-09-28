import { useState, type SubmitEvent } from 'react';

import type { Task, TaskDetailsInput } from './task.types';
import styles from './EditTaskForm.module.css';

type EditTaskFormProps = Readonly<{
  task: Task;
  onCancel(): void;
  onSave(input: TaskDetailsInput): Promise<void>;
}>;

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Task could not be updated';
}

const EditTaskForm: React.FC<EditTaskFormProps> = ({
  task,
  onCancel,
  onSave,
}) => {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedTitle = title.trim();
    const normalizedDescription = description.trim();

    if (normalizedTitle === '') {
      setErrorMessage('Title is required');
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      await onSave({
        title: normalizedTitle,
        description:
          normalizedDescription === '' ? null : normalizedDescription,
      });
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form
      className={styles.form}
      aria-busy={isSaving}
      aria-label={`Edit ${task.title}`}
      onSubmit={(event) => void handleSubmit(event)}
    >
      <label className={styles.field}>
        <span>Title</span>
        <input
          className={styles.control}
          disabled={isSaving}
          maxLength={120}
          onChange={(event) => setTitle(event.target.value)}
          required
          type="text"
          value={title}
        />
      </label>

      <label className={styles.field}>
        <span>Description</span>
        <textarea
          className={styles.control}
          disabled={isSaving}
          maxLength={1000}
          onChange={(event) => setDescription(event.target.value)}
          rows={3}
          value={description}
        />
      </label>

      {errorMessage !== null && (
        <p className={styles.errorMessage} role="alert">
          {errorMessage}
        </p>
      )}

      <div className={styles.actions}>
        <button
          className={`${styles.button} ${styles.cancelButton}`}
          disabled={isSaving}
          onClick={onCancel}
          type="button"
        >
          Cancel
        </button>

        <button
          className={`${styles.button} ${styles.saveButton}`}
          disabled={isSaving}
          type="submit"
        >
          {isSaving ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </form>
  );
};

export default EditTaskForm;
