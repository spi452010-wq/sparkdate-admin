import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useApi } from '../auth/AuthContext';
import { QueryView } from '../components/QueryView';
import { Table } from '../components/Table';
import { Button, Notice, StatusBadge } from '../components/ui';
import { formatInr, type Booking, type SpeedEvent } from '../api/types';


export function EventDetailPage() {
  const { id = '' } = useParams();
  const api = useApi(); const qc = useQueryClient();
  const saved = (useLocation().state as { saved?: boolean } | null)?.saved;
  const ev = useQuery({ queryKey: ['event', id], queryFn: () => api.getEvent(id) });
  const bk = useQuery({ queryKey: ['event', id, 'bookings'], queryFn: () => api.listEventBookings(id) });
  const publish = useMutation({ mutationFn: (e: SpeedEvent) => api.updateEvent(e.id, { status: 'published' }), onSuccess: (e) => { qc.setQueryData(['event', id], e); qc.invalidateQueries({ queryKey: ['events'] }); } });
  return (
    <>
      {saved ? <Notice>Event saved.</Notice> : null}
      {publish.isError ? <Notice kind="error">{(publish.error as Error).message}</Notice> : null}
      <QueryView query={ev}>{(e) => (
        <section className="card">
          <div className="row between">
            <h1>{e.title} <StatusBadge status={e.status} /></h1>
            <div className="row">
              {e.status === 'draft' ? <Button loading={publish.isPending} onClick={() => publish.mutate(e)}>Publish</Button> : null}
              {['draft', 'published'].includes(e.status) ? <Link className="btn btn-secondary" to={`/events/${e.id}/edit`}>Edit</Link> : null}
            </div>
          </div>
          <p>{e.description}</p>
          <dl className="dl">
            <dt>Starts</dt><dd>{new Date(e.startsAt).toLocaleString('en-IN')}</dd>
            <dt>Round</dt><dd>{e.roundMinutes} min</dd>
            <dt>Price</dt><dd>{formatInr(e.priceInPaise)}{e.playProductId ? ` (Play product ${e.playProductId})` : ''}</dd>
            <dt>Boys seats</dt><dd>{e.booked.male} / {e.capacity.male}</dd>
            <dt>Girls seats</dt><dd>{e.booked.female} / {e.capacity.female}</dd>
          </dl>
        </section>
      )}</QueryView>
      <h2>Bookings</h2>
      <QueryView query={bk} isEmpty={(d) => d.items.length === 0} empty={{ title: 'No bookings yet' }}>
        {(d) => <Table<Booking> caption="Bookings" rows={d.items} columns={[
          { key: 'u', header: 'User', render: (b) => b.userName },
          { key: 'g', header: 'Gender', render: (b) => b.gender },
          { key: 'a', header: 'Amount', render: (b) => formatInr(b.amountInPaise) },
          { key: 'c', header: 'Dates done', render: (b) => b.datesCompleted },
          { key: 's', header: 'Status', render: (b) => <StatusBadge status={b.status} /> },
        ]} />}
      </QueryView>
    </>
  );
}
