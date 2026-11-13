import { useId, useState, type ChangeEvent, type FC } from 'react';

import {
  ASSIGNABLE_WORKSPACE_ROLES,
  type AssignableWorkspaceRole,
  type UpdateWorkspaceMemberRoleInput,
} from '../../workspace.types';
import { WORKSPACE_ROLE_LABELS } from '../../workspace.constants';
import styles from './WorkspaceMemberActions.module.css';

type WorkspaceMemberActionsProps = Readonly<{
  memberId: string;
  memberName: string;
  role: AssignableWorkspaceRole;
  onUpdate(
    memberId: string,
    input: UpdateWorkspaceMemberRoleInput
  ): Promise<void>;
  onRemove(memberId: string): Promise<void>;
}>;

type PendingAction = 'role' | 'remove' | null;

const WorkspaceMemberActions: FC<WorkspaceMemberActionsProps> = ({
  memberId,
  memberName,
  role,
  onUpdate,
  onRemove,
}) => {
  const errorId = useId();
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [hasSavedRole, setHasSavedRole] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isBusy = pendingAction !== null;

  let statusMessage: string | null = null;

  if (pendingAction === 'role') {
    statusMessage = 'Saving role…';
  } else if (pendingAction === 'remove') {
    statusMessage = 'Removing member…';
  } else if (hasSavedRole) {
    statusMessage = 'Role saved.';
  }

  const handleRoleChange = async (
    event: ChangeEvent<HTMLSelectElement>
  ): Promise<void> => {
    const selectedValue = event.currentTarget.value;
    const nextRole = ASSIGNABLE_WORKSPACE_ROLES.find(
      (candidate) => candidate === selectedValue
    );

    if (isBusy || nextRole === undefined || nextRole === role) {
      return;
    }

    setPendingAction('role');
    setHasSavedRole(false);
    setErrorMessage(null);

    try {
      await onUpdate(memberId, { role: nextRole });
      setHasSavedRole(true);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Member role could not be updated'
      );
    } finally {
      setPendingAction(null);
    }
  };

  const handleRemove = async (): Promise<void> => {
    if (isBusy) {
      return;
    }

    const shouldRemove = window.confirm(
      `Remove "${memberName}" from this workspace? They will lose access.`
    );

    if (!shouldRemove) {
      return;
    }

    setPendingAction('remove');
    setHasSavedRole(false);
    setErrorMessage(null);

    try {
      await onRemove(memberId);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Member could not be removed'
      );
    } finally {
      setPendingAction(null);
    }
  };

  return (
    <div className={styles.container} aria-busy={isBusy}>
      <div className={styles.controls}>
        <select
          className={styles.select}
          aria-label={`Role for ${memberName}`}
          aria-describedby={errorMessage === null ? undefined : errorId}
          value={role}
          disabled={isBusy}
          onChange={(event) => void handleRoleChange(event)}
        >
          {ASSIGNABLE_WORKSPACE_ROLES.map((assignableRole) => (
            <option key={assignableRole} value={assignableRole}>
              {WORKSPACE_ROLE_LABELS[assignableRole]}
            </option>
          ))}
        </select>

        <button
          className={styles.removeButton}
          type="button"
          aria-label={`Remove ${memberName}`}
          aria-describedby={errorMessage === null ? undefined : errorId}
          disabled={isBusy}
          onClick={() => void handleRemove()}
        >
          {pendingAction === 'remove' ? 'Removing…' : 'Remove'}
        </button>
      </div>

      {statusMessage !== null && (
        <p className={styles.message} role="status">
          {statusMessage}
        </p>
      )}

      {errorMessage !== null && (
        <p id={errorId} className={styles.errorMessage} role="alert">
          {errorMessage}
        </p>
      )}
    </div>
  );
};

export default WorkspaceMemberActions;
