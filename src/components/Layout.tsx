import { useQuery } from '@tanstack/react-query';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useApi, useAuth } from '../auth/AuthContext';
import { USE_MOCK } from '../api';
import { Button } from './ui';

export function Layout() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const isAdmin = user?.role === 'admin';
  return (
    <div className="shell">
      <a href="#main" className="skip">Skip to content</a>
      <header className="topbar">
        <strong className="brand">SparkDate Admin</strong>
        {USE_MOCK ? <span className="badge badge-warning">Mock data</span> : null}
        <span className="spacer" />
        <span className="muted">{user?.fullName ?? user?.email} · {user?.role}</span>
        <Button variant="ghost" onClick={async () => { await logout(); nav('/login'); }}>Sign out</Button>
      </header>
      <nav className="sidenav" aria-label="Main">
        <NavLink to="/" end>Dashboard</NavLink>
        <NavLink to="/events">Events</NavLink>
        {isAdmin ? <><NavLink to="/users">Users</NavLink><NavLink to="/reports">Reports</NavLink><NavLink to="/refunds">Refunds</NavLink><NavLink to="/payments">Play purchases<UnlinkedBadge /></NavLink></> : null}
      </nav>
      <main id="main" className="content"><Outlet /></main>
    </div>
  );
}

/** Admin-only: count of Play purchases with no booking (GET /admin/payments?status=unlinked). */
function UnlinkedBadge() {
  const api = useApi();
  const q = useQuery({ queryKey: ['payments', 'unlinked-count'], queryFn: () => api.listPayments({ status: 'unlinked' }), staleTime: 60_000, refetchInterval: 5 * 60_000 });
  const n = q.data?.total ?? 0;
  return n > 0 ? <> <span className="badge badge-danger" aria-label={`${n} unlinked`}>{n}</span></> : null;
}
