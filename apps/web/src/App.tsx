function App() {
  return (
    <main className="app-shell">
      <header className="page-header">
        <p className="eyebrow">TeamFlow</p>
        <h1>Tasks</h1>
        <p className="page-description">
          Organize your work and keep track of its progress.
        </p>
      </header>

      <section className="task-section" aria-labelledby="task-heading">
        <h2 id="task-heading">My tasks</h2>
        <p>No tasks loaded yet.</p>
      </section>
    </main>
  );
}

export default App;
