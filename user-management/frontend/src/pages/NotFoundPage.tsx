import { Link } from 'react-router';

export function NotFoundPage() {
  return (
    <section>
      <h1>Page not found</h1>
      <Link to="/">Go to the users list</Link>
    </section>
  );
}
