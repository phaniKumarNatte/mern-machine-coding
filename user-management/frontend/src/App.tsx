import { Route, Routes } from 'react-router';
import { Layout } from './components/Layout';
import { CreateUserPage } from './pages/CreateUserPage';
import { EditUserPage } from './pages/EditUserPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { UsersListPage } from './pages/UsersListPage';
import { ViewUserPage } from './pages/ViewUserPage';

/**
 * The route table: which page renders for which URL.
 * The router itself (<BrowserRouter>) is added in main.tsx, so tests can wrap
 * <App /> in a <MemoryRouter> instead and start at any URL they like.
 */
export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<UsersListPage />} />
        <Route path="users/new" element={<CreateUserPage />} />
        <Route path="users/:id" element={<ViewUserPage />} />
        <Route path="users/:id/edit" element={<EditUserPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
