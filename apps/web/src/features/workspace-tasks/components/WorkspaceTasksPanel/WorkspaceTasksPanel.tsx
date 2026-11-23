import { useRef, useState } from 'react';

import type { TaskStatus } from '@teamflow/contracts/tasks';

import CreateTaskForm from 'src/features/tasks/components/CreateTaskForm/CreateTaskForm';
import TaskPagination from 'src/features/tasks/components/TaskPagination/TaskPagination';

import useWorkspaceTasks from '../../hooks/useWorkspaceTasks';
import type { CreateWorkspaceTaskInput } from '../../workspace-task.types';
import styles from './WorkspaceTasksPanel.module.css';

type WorkspaceTasksPanelProps = Readonly<{
  workspaceId: string;
}>;

const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'To do',
  in_progress: 'In progress',
  done: 'Done',
};

function WorkspaceTasksPanel({ workspaceId }: WorkspaceTasksPanelProps) {
  const { state, retry, changePage, createTask } =
    useWorkspaceTasks(workspaceId);

  const dialogRef = useRef<HTMLDialogElement>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function handleCreate(input: CreateWorkspaceTaskInput): Promise<void> {
    setIsSaving(true);

    try {
      await createTask(input);
      dialogRef.current?.close();
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section
      className={`task-section ${styles.panel}`}
      aria-labelledby="workspace-tasks-heading"
    >
      <div className={styles.header}>
        <div>
          <h2 id="workspace-tasks-heading">Workspace tasks</h2>
          <p>Shared with members of this workspace.</p>
        </div>

        <div className={styles.actions}>
          <button
            className={styles.button}
            disabled={state.status === 'loading' || isSaving}
            onClick={retry}
            type="button"
          >
            Refresh
          </button>

          <button
            className={`${styles.button} ${styles.primary}`}
            disabled={state.status !== 'success' || isSaving}
            onClick={() => dialogRef.current?.showModal()}
            type="button"
            aria-haspopup="dialog"
          >
            New task
          </button>
        </div>
      </div>

      {state.status === 'loading' && (
        <p role="status">Loading workspace tasks…</p>
      )}

      {state.status === 'not-found' && (
        <p className={styles.error} role="alert">
          This workspace does not exist, or you no longer have access.
        </p>
      )}

      {state.status === 'error' && (
        <p className={styles.error} role="alert">
          {state.message}
        </p>
      )}

      {state.status === 'success' && (
        <>
          {state.result.data.length === 0 ? (
            <p>No shared tasks yet. Create the first one.</p>
          ) : (
            <ul className={styles.list} aria-label="Workspace tasks">
              {state.result.data.map((task) => (
                <li key={task.id} className={styles.row}>
                  <div>
                    <h3 className={styles.title}>{task.title}</h3>

                    {task.description && (
                      <p className={styles.description}>{task.description}</p>
                    )}
                  </div>

                  <span className={styles.badge} data-status={task.status}>
                    {STATUS_LABELS[task.status]}
                  </span>
                </li>
              ))}
            </ul>
          )}

          <TaskPagination
            disabled={isSaving}
            page={state.result.meta.page}
            total={state.result.meta.total}
            totalPages={state.result.meta.totalPages}
            onPageChange={changePage}
          />
        </>
      )}

      <dialog
        ref={dialogRef}
        className={styles.dialog}
        aria-labelledby="create-task-heading"
        onCancel={(event) => {
          if (isSaving) {
            event.preventDefault();
          }
        }}
      >
        <CreateTaskForm disabled={isSaving} onCreate={handleCreate} />

        <div className={styles.dialogActions}>
          <button
            className={styles.button}
            disabled={isSaving}
            onClick={() => dialogRef.current?.close()}
            type="button"
          >
            Close
          </button>
        </div>
      </dialog>
    </section>
  );
}

export default WorkspaceTasksPanel;
