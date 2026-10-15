import LogoutButton from '../../auth/LogoutButton';
import useAuth from '../../auth/useAuth';

import CreateWorkspaceForm from '../components/CreateWorkspaceForm/CreateWorkspaceForm';
import useWorkspaces from '../hooks/useWorkspaces';
import type { WorkspaceRole } from '../workspace.types';
import styles from './WorkspacesPage.module.css';

const WORKSPACE_ROLE_LABELS = {
  owner: 'Owner',
  admin: 'Admin',
  member: 'Member',
} satisfies Record<WorkspaceRole, string>;

const WorkspacesPage = () => {
  const { logout } = useAuth();
  const {
    workspaces,
    isLoading,
    errorMessage,
    refreshWorkspaces,
    createWorkspace,
  } = useWorkspaces();

  const hasLoaded = !isLoading && errorMessage === null;

  return (
    <main className="app-shell">
      <header className="page-header">
        <p className="eyebrow">TeamFlow</p>
        <h1>Workspaces</h1>
        <p className="page-description">
          See your workspaces and your role in each one.
        </p>
        <LogoutButton onLogout={logout} />
      </header>

      <CreateWorkspaceForm disabled={isLoading} onCreate={createWorkspace} />

      <section className={styles.panel} aria-labelledby="workspace-heading">
        <h2 id="workspace-heading">My workspaces</h2>

        {isLoading && (
          <p className={styles.message} role="status">
            Loading workspaces…
          </p>
        )}

        {!isLoading && errorMessage !== null && (
          <div>
            <p className={styles.errorMessage} role="alert">
              {errorMessage}
            </p>

            <button
              className={styles.retryButton}
              type="button"
              onClick={refreshWorkspaces}
            >
              Try again
            </button>
          </div>
        )}

        {hasLoaded && workspaces.length === 0 && (
          <p className={styles.message}>
            You don't belong to any workspaces yet.
          </p>
        )}

        {hasLoaded && workspaces.length > 0 && (
          <ul className={styles.list}>
            {workspaces.map((workspace) => (
              <li className={styles.card} key={workspace.id}>
                <h3 className={styles.name}>{workspace.name}</h3>

                <span className={styles.role}>
                  Your role: {WORKSPACE_ROLE_LABELS[workspace.role]}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
};

export default WorkspacesPage;
