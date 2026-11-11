import { useId, useState, type ChangeEvent, type FC } from 'react';

import {
  ASSIGNABLE_WORKSPACE_ROLES,
  type AssignableWorkspaceRole,
  type UpdateWorkspaceMemberRoleInput,
} from '../../workspace.types';
import styles from './WorkspaceMemberRoleSelect.module.css';
import { WORKSPACE_ROLE_LABELS } from '../../workspace.constants';

type WorkspaceMemberRoleSelectProps = Readonly<{
  memberId: string;
  memberName: string;
  role: AssignableWorkspaceRole;
  onUpdate(
    memberId: string,
    input: UpdateWorkspaceMemberRoleInput
  ): Promise<void>;
}>;

const WorkspaceMemberRoleSelect: FC<WorkspaceMemberRoleSelectProps> = ({
  memberId,
  memberName,
  role,
  onUpdate,
}) => {
  const errorId = useId();
  const [isUpdating, setIsUpdating] = useState(false);
  const [hasSaved, setHasSaved] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleChange = async (
    event: ChangeEvent<HTMLSelectElement>
  ): Promise<void> => {
    const selectedValue = event.currentTarget.value;
    const nextRole = ASSIGNABLE_WORKSPACE_ROLES.find(
      (candidate) => candidate === selectedValue
    );

    if (isUpdating || nextRole === undefined || nextRole === role) {
      return;
    }

    setIsUpdating(true);
    setHasSaved(false);
    setErrorMessage(null);

    try {
      await onUpdate(memberId, { role: nextRole });
      setHasSaved(true);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Member role could not be updated'
      );
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className={styles.container} aria-busy={isUpdating}>
      <select
        className={styles.select}
        aria-label={`Role for ${memberName}`}
        aria-describedby={errorMessage === null ? undefined : errorId}
        value={role}
        disabled={isUpdating}
        onChange={(event) => void handleChange(event)}
      >
        {ASSIGNABLE_WORKSPACE_ROLES.map((assignableRole) => (
          <option key={assignableRole} value={assignableRole}>
            {WORKSPACE_ROLE_LABELS[assignableRole]}
          </option>
        ))}
      </select>

      {(isUpdating || hasSaved) && (
        <p className={styles.message} role="status">
          {isUpdating ? 'Saving role…' : 'Role saved.'}
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

export default WorkspaceMemberRoleSelect;
