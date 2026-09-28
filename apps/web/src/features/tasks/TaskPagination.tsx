import styles from './TaskPagination.module.css';

type TaskPaginationProps = Readonly<{
  disabled?: boolean;
  page: number;
  total: number;
  totalPages: number;
  onPageChange(page: number): void;
}>;

const TaskPagination: React.FC<TaskPaginationProps> = ({
  disabled = false,
  page,
  total,
  totalPages,
  onPageChange,
}) => {
  if (total === 0) {
    return null;
  }

  const hasPreviousPage = page > 1;
  const hasNextPage = page < totalPages;
  const taskLabel = total === 1 ? 'task' : 'tasks';

  return (
    <nav className={styles.pagination} aria-label="Task pagination">
      <p className={styles.summary}>
        Page {page} of {totalPages} · {total} {taskLabel}
      </p>

      <div className={styles.actions}>
        <button
          className={styles.button}
          disabled={disabled || !hasPreviousPage}
          onClick={() => onPageChange(page - 1)}
          type="button"
        >
          Previous
        </button>

        <button
          className={styles.button}
          disabled={disabled || !hasNextPage}
          onClick={() => onPageChange(page + 1)}
          type="button"
        >
          Next
        </button>
      </div>
    </nav>
  );
};

export default TaskPagination;
