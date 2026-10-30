import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useApi, useAuth } from '../auth/AuthContext';
import { QueryView } from '../components/QueryView';

type Stat = readonly [label: string, value: number | string, to: string];
const StatList = ({ stats }: { stats: readonly Stat[] }) => (
  <ul className="stats">
    {stats.map(([label, n, to]) => <li key={label} className="card stat"><Link to={to}><span className="stat-n">{n}</span><span>{label}</span></Link></li>)}
  </ul>
);

export function DashboardPage() {
  const { user } = useAuth();
  return user?.role === 'admin' ? <AdminDashboard /> : <HostDashboard />;
}

/** Admins: GET /admin/stats. Reports/refunds counts are placeholders on the real API until Sprints 2/4. */
function AdminDashboard() {
  const api = useApi();
  const q = useQuery({ queryKey: ['stats'], queryFn: () => api.stats() });
  return (
    <>
      <h1>Dashboard</h1>
      <QueryView query={q}>{(s) => <StatList stats={[
        ['Users', s.totalUsers, '/users'], ['Pending verifications', s.pendingVerifications, '/users?verification=pending'],
        ['Published events', s.publishedEvents, '/events?status=published'], ['Live events', s.liveEvents, '/events?status=live'],
        ['Open reports', api.mock ? s.openReports : 'Soon', '/reports'], ['Pending refunds', s.pendingRefunds, '/refunds'],
      ]} />}</QueryView>
    </>
  );
}

/** Hosts have no access to /admin/stats: summarise their own events instead. */
function HostDashboard() {
  const api = useApi();
  const q = useQuery({ queryKey: ['events', ''], queryFn: () => api.listEvents() });
  return (
    <>
      <h1>My events</h1>
      <QueryView query={q}>{(d) => {
        const n = (s: string) => d.items.filter((e) => e.status === s).length;
        return <StatList stats={[['All my events', d.total, '/events'], ['Drafts', n('draft'), '/events?status=draft'],
          ['Published', n('published'), '/events?status=published'], ['Live', n('live'), '/events?status=live']]} />;
      }}</QueryView>
    </>
  );
}
