import { screen } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { RequireAuth } from '../auth/RequireAuth';
import { createMockApi } from '../api/mock';
import { renderApp } from './utils';

const routes = (
  <Routes>
    <Route path="/login" element={<p>Login page</p>} />
    <Route path="/users" element={<RequireAuth roles={['admin']}><p>Users page</p></RequireAuth>} />
  </Routes>
);

describe('RequireAuth', () => {
  it('redirects to /login without a session', async () => {
    renderApp(routes, { route: '/users' });
    expect(await screen.findByText('Login page')).toBeInTheDocument();
  });
  it('allows an admin', async () => {
    const api = createMockApi(0); await api.login('admin@sparkdate.in', 'correct-horse-12');
    renderApp(routes, { api, route: '/users' });
    expect(await screen.findByText('Users page')).toBeInTheDocument();
  });
  it('denies a host on admin-only routes', async () => {
    const api = createMockApi(0); await api.login('host@sparkdate.in', 'correct-horse-12');
    renderApp(routes, { api, route: '/users' });
    expect(await screen.findByRole('alert')).toHaveTextContent(/Access denied/);
  });
  it('denies a plain app user', async () => {
    const api = createMockApi(0);
    api.me = async () => ({ id: 'u', role: 'user' });
    renderApp(routes, { api, route: '/users' });
    expect(await screen.findByText(/Access denied/)).toBeInTheDocument();
  });
});
