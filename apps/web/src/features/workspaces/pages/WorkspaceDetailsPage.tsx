import { type FC } from 'react';
import { Link, useParams } from 'react-router';

import LogoutButton from 'src/features/auth/LogoutButton';
import useAuth from 'src/features/auth/useAuth';

import useWorkspace from '../hooks/useWorkspace';
import { WORKSPACE_ROLE_LABELS } from '../workspace.constants';
import WorkspaceMembersPanel from '../components/WorkspaceMembersPanel/WorkspaceMembersPanel';
import RenameWorkspaceForm from '../components/RenameWorkspaceForm/RenameWorkspaceForm';
import styles from './WorkspaceDetailsPage.module.css';

type WorkspaceDetailsProps = Readonly<{
  workspaceId: string;
}>;

const WorkspaceDetails: FC<WorkspaceDetailsProps> = ({ workspaceId }) => {
  const { logout } = useAuth();
  const { state, retry, renameWorkspace } = useWorkspace(workspaceId);

  return (
    <main className="app-shell">
      <header className="page-header">
        <Link className={styles.backLink} to="/workspaces">
          Back to workspaces
        </Link>

        <p className="eyebrow">TeamFlow</p>

        <h1 className={styles.title}>
          {state.status === 'success' ? state.workspace.name : 'Workspace'}
        </h1>

        <LogoutButton onLogout={logout} />
      </header>

      <section
        className={styles.panel}
        aria-labelledby="workspace-details-heading"
      >
        <h2 id="workspace-details-heading">Workspace details</h2>

        {state.status === 'loading' && (
          <p className={styles.message} role="status">
            Loading workspace…
          </p>
        )}

        {state.status === 'not-found' && (
          <p className={styles.errorMessage} role="alert">
            This workspace does not exist, or you do not have access to it.
          </p>
        )}

        {state.status === 'error' && (
          <div>
            <p className={styles.errorMessage} role="alert">
              {state.message}
            </p>

            <button
              className={styles.retryButton}
              type="button"
              onClick={retry}
            >
              Try again
            </button>
          </div>
        )}

        {state.status === 'success' && (
          <dl className={styles.details}>
            <dt>Your role</dt>
            <dd>{WORKSPACE_ROLE_LABELS[state.workspace.role]}</dd>

            <dt>Created</dt>
            <dd>
              <time dateTime={state.workspace.createdAt}>
                {new Date(state.workspace.createdAt).toLocaleDateString()}
              </time>
            </dd>
          </dl>
        )}
      </section>
      {state.status === 'success' && (
        <WorkspaceMembersPanel workspaceId={state.workspace.id} />
      )}
      {state.status === 'success' &&
        (state.workspace.role === 'owner' ||
          state.workspace.role === 'admin') && (
          <RenameWorkspaceForm
            workspaceName={state.workspace.name}
            onRename={renameWorkspace}
          />
        )}
    </main>
  );
};

const WorkspaceDetailsPage: FC = () => {
  const { workspaceId } = useParams();

  if (workspaceId === undefined) {
    return (
      <main className="app-shell">
        <h1>Workspace not found</h1>
        <Link to="/workspaces">Back to workspaces</Link>
      </main>
    );
  }

  return <WorkspaceDetails key={workspaceId} workspaceId={workspaceId} />;
};

export default WorkspaceDetailsPage;
