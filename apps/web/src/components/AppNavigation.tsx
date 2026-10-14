import { NavLink } from 'react-router';

import styles from './AppNavigation.module.css';

const AppNavigation = () => {
  return (
    <nav className={styles.navigation} aria-label="Main navigation">
      <NavLink className={styles.link} to="/" end>
        Tasks
      </NavLink>

      <NavLink className={styles.link} to="/workspaces">
        Workspaces
      </NavLink>
    </nav>
  );
};

export default AppNavigation;
