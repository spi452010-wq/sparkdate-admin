import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useApi, useAuth } from '../auth/AuthContext';
import { ConfirmDialog } from '../components/Modal';
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
  const { user } = useAuth();
  const [confirmCancel, setConfirmCancel] = useState(false);
  const cancel = useMutation({ mutationFn: () => api.cancelEvent(id),
    onSuccess: () => { setConfirmCancel(false); ['event', 'events', 'stats', 'refunds', 'payments'].forEach((k) => qc.invalidateQueries({ queryKey: [k] })); },
    onError: () => setConfirmCancel(false) });
  const s = cancel.data?.summary;
  return (
    <>
      {s ? <Notice>{`Event cancelled. ${s.refunded} paid booking(s) refunded through Google Play, ${s.cancelledFree} free booking(s) and ${s.cancelledPending} seat hold(s) cancelled.`}{s.refundFailed ? ` ${s.refundFailed} refund(s) failed and will be retried automatically.` : ''}</Notice> : null}
      {cancel.isError ? <Notice kind="error">{(cancel.error as Error).message}</Notice> : null}
      {saved ? <Notice>Event saved.</Notice> : null}
      {publish.isError ? <Notice kind="error">{(publish.error as Error).message}</Notice> : null}
      <QueryView query={ev}>{(e) => (
        <section className="card">
          <div className="row between">
            <h1>{e.title} <StatusBadge status={e.status} /></h1>
            <div className="row">
              {e.status === 'draft' ? <Button loading={publish.isPending} onClick={() => publish.mutate(e)}>Publish</Button> : null}
              {['draft', 'published'].includes(e.status) ? <Link className="btn btn-secondary" to={`/events/${e.id}/edit`}>Edit</Link> : null}
              {user?.role === 'admin' && ['draft', 'published'].includes(e.status) ? <Button variant="danger" onClick={() => setConfirmCancel(true)}>Cancel event</Button> : null}
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
      <ConfirmDialog open={confirmCancel} danger loading={cancel.isPending} title="Cancel this event?"
        message="Everyone booked is notified and their bookings are cancelled. Paid bookings are refunded automatically through Google Play, and seat holds are released. This cannot be undone."
        confirmLabel="Cancel event" cancelLabel="Keep event" onCancel={() => setConfirmCancel(false)} onConfirm={() => cancel.mutate()} />
    </>
  );
}
