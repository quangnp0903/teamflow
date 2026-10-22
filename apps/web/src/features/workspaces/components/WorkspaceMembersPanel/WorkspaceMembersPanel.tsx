import type { FC } from 'react';

import useWorkspaceMembers from '../../hooks/useWorkspaceMembers';
import { WORKSPACE_ROLE_LABELS } from '../../workspace.constants';
import styles from './WorkspaceMembersPanel.module.css';

type WorkspaceMembersPanelProps = Readonly<{
  workspaceId: string;
}>;

const WorkspaceMembersPanel: FC<WorkspaceMembersPanelProps> = ({
  workspaceId,
}) => {
  const { state, retry } = useWorkspaceMembers(workspaceId);
  
  return (
    <section
      className={styles.panel}
      aria-labelledby="workspace-members-heading"
    >
      <h2 id="workspace-members-heading">Members</h2>

      {state.status === 'loading' && (
        <p className={styles.message} role="status">
          Loading members…
        </p>
      )}

      {state.status === 'not-found' && (
        <p className={styles.errorMessage} role="alert">
          This workspace is no longer available, or you no longer have access to
          it.
        </p>
      )}

      {state.status === 'error' && (
        <div>
          <p className={styles.errorMessage} role="alert">
            {state.message}
          </p>

          <button className={styles.retryButton} type="button" onClick={retry}>
            Retry members
          </button>
        </div>
      )}

      {state.status === 'success' && (
        <>
          {state.members.length === 0 ? (
            <p className={styles.message}>No members to display.</p>
          ) : (
            <ul className={styles.list} aria-label="Workspace members">
              {state.members.map((member) => (
                <li className={styles.card} key={member.id}>
                  <div className={styles.identity}>
                    <p className={styles.name}>{member.displayName}</p>

                    <p className={styles.joined}>
                      Joined{' '}
                      <time dateTime={member.joinedAt}>
                        {new Date(member.joinedAt).toLocaleDateString()}
                      </time>
                    </p>
                  </div>

                  <span className={styles.role}>
                    {WORKSPACE_ROLE_LABELS[member.role]}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
};

export default WorkspaceMembersPanel;
