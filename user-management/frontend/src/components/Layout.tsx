import { Link, Outlet } from 'react-router';

/** The page shell shared by every route. <Outlet /> is where the current page renders. */
export function Layout() {
  return (
    <div className="app">
      <header className="header">
        <Link to="/" className="brand">
          User Management
        </Link>
      </header>
      <main className="container">
        <Outlet />
      </main>
    </div>
  );
}
