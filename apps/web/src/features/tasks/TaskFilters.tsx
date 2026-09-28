import { useState, type SubmitEvent } from 'react';

import {
  TASK_STATUSES,
  type ListTasksParams,
  type TaskStatus,
} from './task.types';
import styles from './TaskFilters.module.css';

type TaskFiltersProps = Readonly<{
  disabled?: boolean;
  onApply(filters: ListTasksParams): void;
}>;

const TaskFilters: React.FC<TaskFiltersProps> = ({
  disabled = false,
  onApply,
}) => {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<TaskStatus | ''>('');

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedSearch = search.trim();

    onApply({
      ...(normalizedSearch === '' ? {} : { search: normalizedSearch }),
      ...(status === '' ? {} : { status }),
    });
  };

  const handleStatusChange = (value: string) => {
    const nextStatus = TASK_STATUSES.find((taskStatus) => taskStatus === value);

    setStatus(nextStatus ?? '');
  };

  const handleClear = () => {
    setSearch('');
    setStatus('');
    onApply({});
  };

  return (
    <form
      className={styles.form}
      aria-label="Task filters"
      onSubmit={handleSubmit}
    >
      <label className={styles.field}>
        <span>Search</span>
        <input
          className={styles.control}
          disabled={disabled}
          maxLength={120}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search titles and descriptions"
          type="search"
          value={search}
        />
      </label>

      <label className={styles.field}>
        <span>Status</span>
        <select
          className={styles.control}
          disabled={disabled}
          onChange={(event) => handleStatusChange(event.target.value)}
          value={status}
        >
          <option value="">All statuses</option>

          <option value="todo">Todo</option>
          <option value="in_progress">In progress</option>
          <option value="done">Done</option>
        </select>
      </label>

      <button
        className={`${styles.button} ${styles.primaryButton}`}
        disabled={disabled}
        type="submit"
      >
        Apply filters
      </button>

      <button
        className={`${styles.button} ${styles.secondaryButton}`}
        disabled={disabled}
        onClick={handleClear}
        type="button"
      >
        Clear
      </button>
    </form>
  );
};

export default TaskFilters;
