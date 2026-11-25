import { useEffect, useId, useRef, useState } from 'react';

import { TASK_STATUSES, type TaskStatus } from '@teamflow/contracts/tasks';
import type { WorkspaceRole } from '@teamflow/contracts/workspaces';

import CreateTaskForm from 'src/features/tasks/components/CreateTaskForm/CreateTaskForm';
import TaskPagination from 'src/features/tasks/components/TaskPagination/TaskPagination';
import EditTaskForm from 'src/features/tasks/components/EditTaskForm/EditTaskForm';

import useWorkspaceTasks from '../../hooks/useWorkspaceTasks';
import type {
  CreateWorkspaceTaskInput,
  WorkspaceTask,
  WorkspaceTaskDetailsInput,
} from '../../workspace-task.types';
import styles from './WorkspaceTasksPanel.module.css';

type WorkspaceTasksPanelProps = Readonly<{
  workspaceId: string;
  requesterId: string;
  requesterRole: WorkspaceRole;
}>;

const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'To do',
  in_progress: 'In progress',
  done: 'Done',
};

function WorkspaceTasksPanel({
  workspaceId,
  requesterId,
  requesterRole,
}: WorkspaceTasksPanelProps) {
  const { state, retry, changePage, createTask, updateTask } =
    useWorkspaceTasks(workspaceId);

  const dialogRef = useRef<HTMLDialogElement>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);

  const [statusError, setStatusError] = useState<Readonly<{
    taskId: string;
    message: string;
  }> | null>(null);

  const editDialogRef = useRef<HTMLDialogElement>(null);
  const editHeadingId = useId();

  const [editingTask, setEditingTask] = useState<WorkspaceTask | null>(null);

  const statusErrorId = useId();
  const isBusy = isSaving || updatingTaskId !== null || editingTask !== null;

  const canManageAllTasks =
    requesterRole === 'owner' || requesterRole === 'admin';

  async function handleCreate(input: CreateWorkspaceTaskInput): Promise<void> {
    setIsSaving(true);
    setStatusError(null);

    try {
      await createTask(input);
      dialogRef.current?.close();
    } finally {
      setIsSaving(false);
    }
  }

  async function handleStatusChange(
    task: WorkspaceTask,
    value: string
  ): Promise<void> {
    const nextStatus = TASK_STATUSES.find((status) => status === value);

    if (nextStatus === undefined || nextStatus === task.status || isBusy) {
      return;
    }

    setUpdatingTaskId(task.id);
    setStatusError(null);

    try {
      await updateTask(task.id, {
        status: nextStatus,
      });
    } catch (error) {
      setStatusError({
        taskId: task.id,
        message:
          error instanceof Error
            ? error.message
            : 'Task status could not be updated',
      });
    } finally {
      setUpdatingTaskId(null);
    }
  }

  async function handleEditSave(
    input: WorkspaceTaskDetailsInput
  ): Promise<void> {
    if (editingTask === null) {
      return;
    }

    setIsSaving(true);
    setStatusError(null);

    try {
      await updateTask(editingTask.id, input);
      setEditingTask(null);
    } finally {
      setIsSaving(false);
    }
  }

  useEffect(() => {
    if (editingTask === null) {
      return;
    }

    const dialog = editDialogRef.current;

    if (dialog === null) {
      return;
    }

    dialog.showModal();

    return () => {
      dialog.close();
    };
  }, [editingTask]);

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
            disabled={state.status === 'loading' || isBusy}
            onClick={() => {
              setStatusError(null);
              retry();
            }}
            type="button"
          >
            Refresh
          </button>

          <button
            className={`${styles.button} ${styles.primary}`}
            disabled={state.status !== 'success' || isBusy}
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

      {updatingTaskId !== null && <p role="status">Saving task status…</p>}

      {statusError !== null && (
        <p id={statusErrorId} className={styles.error} role="alert">
          {statusError.message}
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

                  {canManageAllTasks || task.createdById === requesterId ? (
                    <div className={styles.rowActions}>
                      <select
                        className={`${styles.badge} ${styles.statusSelect}`}
                        aria-label={`Status for ${task.title}`}
                        aria-busy={updatingTaskId === task.id}
                        aria-describedby={
                          statusError?.taskId === task.id
                            ? statusErrorId
                            : undefined
                        }
                        data-status={task.status}
                        disabled={isBusy}
                        value={task.status}
                        onChange={(event) => {
                          void handleStatusChange(
                            task,
                            event.currentTarget.value
                          );
                        }}
                      >
                        {TASK_STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {STATUS_LABELS[status]}
                          </option>
                        ))}
                      </select>
                      <button
                        className={styles.button}
                        disabled={isBusy}
                        aria-label={`Edit ${task.title}`}
                        aria-haspopup="dialog"
                        onClick={() => {
                          setStatusError(null);
                          setEditingTask(task);
                        }}
                        type="button"
                      >
                        Edit
                      </button>
                    </div>
                  ) : (
                    <span className={styles.badge} data-status={task.status}>
                      {STATUS_LABELS[task.status]}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}

          <TaskPagination
            disabled={isBusy}
            page={state.result.meta.page}
            total={state.result.meta.total}
            totalPages={state.result.meta.totalPages}
            onPageChange={(nextPage) => {
              setStatusError(null);
              changePage(nextPage);
            }}
          />
        </>
      )}

      <dialog
        ref={dialogRef}
        className={styles.dialog}
        aria-labelledby="create-task-heading"
        onCancel={(event) => {
          if (isBusy) {
            event.preventDefault();
          }
        }}
      >
        <CreateTaskForm
          disabled={state.status !== 'success' || isBusy}
          onCreate={handleCreate}
        />

        <div className={styles.dialogActions}>
          <button
            className={styles.button}
            disabled={isBusy}
            onClick={() => dialogRef.current?.close()}
            type="button"
          >
            Close
          </button>
        </div>
      </dialog>

      <dialog
        ref={editDialogRef}
        className={styles.dialog}
        aria-labelledby={editHeadingId}
        onCancel={(event) => {
          event.preventDefault();

          if (!isSaving) {
            setEditingTask(null);
          }
        }}
      >
        {editingTask !== null && (
          <div className={styles.editContent}>
            <h2 id={editHeadingId}>Edit task</h2>

            <EditTaskForm
              key={editingTask.id}
              task={editingTask}
              onCancel={() => {
                if (!isSaving) {
                  setEditingTask(null);
                }
              }}
              onSave={handleEditSave}
            />
          </div>
        )}
      </dialog>
    </section>
  );
}

export default WorkspaceTasksPanel;
