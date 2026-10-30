import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { useApi } from '../auth/AuthContext';
import { QueryView } from '../components/QueryView';
import { Table } from '../components/Table';
import { StatusBadge } from '../components/ui';
import { formatInr, type EventStatus, type SpeedEvent } from '../api/types';

const STATUSES: EventStatus[] = ['draft', 'published', 'live', 'ended', 'cancelled'];
export const seatText = (booked: number, cap: number) => `${booked} / ${cap}`;

export function EventsPage() {
  const api = useApi();
  const [sp, setSp] = useSearchParams();
  const status = (sp.get('status') as EventStatus | null) ?? undefined;
  const q = useQuery({ queryKey: ['events', status ?? 'all'], queryFn: () => api.listEvents(status) });
  return (
    <>
      <div className="row between"><h1>Events</h1><Link className="btn btn-primary" to="/events/new">Create event</Link></div>
      <div className="field inline">
        <label htmlFor="status-filter">Status</label>
        <select id="status-filter" value={status ?? ''} onChange={(e) => setSp(e.target.value ? { status: e.target.value } : {})}>
          <option value="">All</option>{STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <QueryView query={q} isEmpty={(d) => d.items.length === 0} empty={{ title: 'No events', message: status ? `No ${status} events.` : 'Create your first event.' }}>
        {(d) => (
          <Table<SpeedEvent> caption="Events" rows={d.items} columns={[
            { key: 't', header: 'Title', render: (e) => <Link to={`/events/${e.id}`}>{e.title}</Link> },
            { key: 'd', header: 'Starts', render: (e) => new Date(e.startsAt).toLocaleString('en-IN') },
            { key: 'b', header: 'Boys', render: (e) => seatText(e.booked.male, e.capacity.male) },
            { key: 'g', header: 'Girls', render: (e) => seatText(e.booked.female, e.capacity.female) },
            { key: 'p', header: 'Price', render: (e) => formatInr(e.priceInPaise) },
            { key: 's', header: 'Status', render: (e) => <StatusBadge status={e.status} /> },
          ]} />
        )}
      </QueryView>
    </>
  );
}
