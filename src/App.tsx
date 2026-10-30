import { Route, Routes } from 'react-router-dom';
import { ComingSoon } from './components/ComingSoon';
import { RequireAuth } from './auth/RequireAuth';
import { Layout } from './components/Layout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { EventsPage } from './pages/EventsPage';
import { EventEditPage } from './pages/EventEditPage';
import { EventDetailPage } from './pages/EventDetailPage';
import { UsersPage } from './pages/UsersPage';
import { ReportsPage } from './pages/ReportsPage';
import { RefundsPage } from './pages/RefundsPage';
import { PaymentsPage } from './pages/PaymentsPage';
import { EmptyState } from './components/ui';

const adminOnly = (el: JSX.Element) => <RequireAuth roles={['admin']}>{el}</RequireAuth>;

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireAuth><Layout /></RequireAuth>}>
        <Route index element={<DashboardPage />} />
        <Route path="events" element={<EventsPage />} />
        <Route path="events/new" element={<EventEditPage />} />
        <Route path="events/:id" element={<EventDetailPage />} />
        <Route path="events/:id/edit" element={<EventEditPage />} />
        <Route path="users" element={adminOnly(<UsersPage />)} />
        <Route path="reports" element={adminOnly(<ComingSoon title="Reports" sprint="Sprint 2"><ReportsPage /></ComingSoon>)} />
        <Route path="refunds" element={adminOnly(<RefundsPage />)} />
        <Route path="payments" element={adminOnly(<PaymentsPage />)} />
        <Route path="*" element={<EmptyState title="Page not found" />} />
      </Route>
    </Routes>
  );
}
