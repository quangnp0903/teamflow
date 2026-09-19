import { type ChangeEvent, useState } from 'react';

import { TASK_STATUSES, type Task, type TaskStatus } from './task.types';

const TASK_STATUS_LABELS = {
  todo: 'Todo',
  in_progress: 'In progress',
  done: 'Done',
} satisfies Record<TaskStatus, string>;

type TaskItemProps = Readonly<{
  task: Task;
  onStatusChange(taskId: string, status: TaskStatus): Promise<void>;
}>;

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'Task status could not be updated';
}

const TaskItem: React.FC<TaskItemProps> = ({ task, onStatusChange }) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
      await onStatusChange(task.id, nextStatus);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <li className="task-card">
      <div className="task-card-header">
        <h3>{task.title}</h3>

        <select
          aria-label={`Status for ${task.title}`}
          className="task-status"
          disabled={isUpdating}
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

      {task.description !== null && <p>{task.description}</p>}

      {isUpdating && <p role="status">Updating status…</p>}

      {errorMessage !== null && (
        <p className="error-message" role="alert">
          {errorMessage}
        </p>
      )}
    </li>
  );
};

export default TaskItem;
