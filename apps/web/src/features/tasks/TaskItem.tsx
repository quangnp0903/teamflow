import { type ChangeEvent, useState } from 'react';

import {
  TASK_STATUSES,
  type Task,
  type TaskDetailsInput,
  type TaskStatus,
  type UpdateTaskInput,
} from './task.types';
import styles from './TaskItem.module.css';
import EditTaskForm from './EditTaskForm';

const TASK_STATUS_LABELS = {
  todo: 'Todo',
  in_progress: 'In progress',
  done: 'Done',
} satisfies Record<TaskStatus, string>;

type TaskItemProps = Readonly<{
  task: Task;
  onUpdate(taskId: string, input: UpdateTaskInput): Promise<void>;
  onDelete(taskId: string): Promise<void>;
}>;

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'Task status could not be updated';
}

const TaskItem: React.FC<TaskItemProps> = ({ task, onUpdate, onDelete }) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isBusy = isUpdating || isDeleting;

  const handleStatusChange = async (event: ChangeEvent<HTMLSelectElement>) => {
    const nextStatus = TASK_STATUSES.find(
      (status) => status === event.target.value
    );

    if (nextStatus === undefined || nextStatus === task.status) {
      return;
    }

    setIsUpdating(true);
    setErrorMessage(null);

    try {
      await onUpdate(task.id, { status: nextStatus });
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    const shouldDelete = window.confirm(
      `Delete "${task.title}"? This cannot be undone.`
    );

    if (!shouldDelete) {
      return;
    }

    setIsDeleting(true);
    setErrorMessage(null);

    try {
      await onDelete(task.id);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Task could not be deleted'
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSave = async (input: TaskDetailsInput): Promise<void> => {
    await onUpdate(task.id, input);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <li className={styles.card}>
        <EditTaskForm
          task={task}
          onCancel={() => setIsEditing(false)}
          onSave={handleSave}
        />
      </li>
    );
  }

  return (
    <li className={styles.card}>
      <div className={styles.header}>
        <h3 className={styles.title}>{task.title}</h3>

        <select
          aria-label={`Status for ${task.title}`}
          className={styles.status}
          disabled={isBusy}
          onChange={(event) => void handleStatusChange(event)}
          value={task.status}
        >
          {TASK_STATUSES.map((status) => (
            <option key={status} value={status}>
              {TASK_STATUS_LABELS[status]}
            </option>
          ))}
        </select>
      </div>

      {task.description !== null && (
        <p className={styles.description}>{task.description}</p>
      )}

      <div className={styles.actions}>
        <button
          className={`${styles.actionButton} ${styles.editButton}`}
          disabled={isBusy}
          onClick={() => {
            setErrorMessage(null);
            setIsEditing(true);
          }}
          type="button"
        >
          Edit
        </button>

        <button
          className={`${styles.actionButton} ${styles.deleteButton}`}
          disabled={isBusy}
          onClick={() => void handleDelete()}
          type="button"
        >
          {isDeleting ? 'Deleting…' : 'Delete'}
        </button>
      </div>

      {isUpdating && (
        <p className={styles.statusMessage} role="status">
          Updating status…
        </p>
      )}

      {errorMessage !== null && (
        <p className={styles.errorMessage} role="alert">
          {errorMessage}
        </p>
      )}
    </li>
  );
};

export default TaskItem;
