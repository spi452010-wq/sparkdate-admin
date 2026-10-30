import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { useApi } from '../auth/AuthContext';
import { QueryView } from '../components/QueryView';
import { Table } from '../components/Table';
import { Button, Notice, StatusBadge } from '../components/ui';
import { useAuth } from '../auth/AuthContext';
import { AckDeadline } from '../features/payments/AckDeadline';
import { LinkPaymentDialog } from '../features/payments/LinkPaymentDialog';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { formatInr, userLabel, type PaymentStatus, type PlayPayment } from '../api/types';

const STATUSES: PaymentStatus[] = ['verified', 'unlinked', 'refunded', 'refund_failed', 'voided'];

/** GET /admin/payments?status=&userId=&eventId=&q=. Filters live in the URL, like Users and Events. */
export function PaymentsPage() {
  const api = useApi();
  const [sp, setSp] = useSearchParams();
  const setParam = (k: string, v: string) => { const n = new URLSearchParams(sp); if (v) n.set(k, v); else n.delete(k); setSp(n, { replace: true }); };
  const status = (sp.get('status') ?? '') as PaymentStatus | '';
  const eventId = sp.get('eventId') ?? ''; const userId = sp.get('userId') ?? ''; const search = sp.get('q') ?? '';
  const [term, setTerm] = useState(search);
  const debounced = useDebouncedValue(term.trim(), 300);
  useEffect(() => { if (debounced !== search) setParam('q', debounced); }, [debounced]); // eslint-disable-line react-hooks/exhaustive-deps
  const { user } = useAuth(); const isAdmin = user?.role === 'admin';
  const [linkT, setLinkT] = useState<PlayPayment | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const events = useQuery({ queryKey: ['events', 'all'], queryFn: () => api.listEvents() });
  const query = useQuery({ queryKey: ['payments', status, userId, eventId, search],
    queryFn: () => api.listPayments({ status: status || undefined, userId: userId || undefined, eventId: eventId || undefined, q: search || undefined }) });
  return (
    <>
      <h1>Google Play purchases</h1>
      {msg ? <Notice>{msg}</Notice> : null}
      <div className="row" role="search">
        <div className="field inline"><label htmlFor="pq">Search payments</label>
          <input id="pq" type="search" placeholder="Name, phone or email" maxLength={80} value={term} onChange={(e) => setTerm(e.target.value)} /></div>
        <div className="field inline"><label htmlFor="pev">Event</label>
          <select id="pev" value={eventId} onChange={(e) => setParam('eventId', e.target.value)}>
            <option value="">All events</option>
            {(events.data?.items ?? []).map((ev) => <option key={ev.id} value={ev.id}>{ev.title}{ev.city ? ` (${ev.city})` : ''}</option>)}
          </select></div>
        <div className="field inline"><label htmlFor="pst">Payment status</label>
          <select id="pst" value={status} onChange={(e) => setParam('status', e.target.value)}>
            <option value="">All statuses</option>{STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
          </select></div>
        {userId ? <button type="button" className="btn btn-secondary" onClick={() => setParam('userId', '')}>Clear user filter</button> : null}
      </div>
      <QueryView query={query} isEmpty={(d) => d.items.length === 0} empty={{ title: 'No purchases found', message: search ? `Nothing matches “${search}”.` : undefined }}>
        {(d) => <Table<PlayPayment> caption="Google Play purchases" rows={d.items} columns={[
          { key: 'o', header: 'Order ID', render: (p) => <code>{p.orderId ?? '-'}</code> },
          { key: 'p', header: 'Product ID', render: (p) => <code>{p.productId}</code> },
          { key: 'u', header: 'User', render: (p) => p.user?.fullName ? p.user.fullName : <code>{p.user?.id ?? p.userId}</code> },
          { key: 'ph', header: 'Phone', render: (p) => p.user?.phone ?? '-' },
          { key: 'k', header: 'For', render: (p) => (p.kind === 'chat_pass' ? 'Chat Pass' : `Event ticket${p.bookingId ? ` (booking ${p.bookingId})` : ''}`) },
          { key: 'a', header: 'Amount', render: (p) => formatInr(p.amountInPaise) },
          { key: 's', header: 'Status', render: (p) => <StatusBadge status={p.status} /> },
          { key: 'ack', header: 'Acknowledged', render: (p) => (p.acknowledged ? 'Yes' : 'No (retrying)') },
          { key: 'd', header: 'Date', render: (p) => new Date(p.createdAt).toLocaleString('en-IN') },
          { key: 'x', header: 'Actions', render: (p) => p.status === 'unlinked' && isAdmin ? (
            <div className="row">
              <Button onClick={() => { setMsg(null); setLinkT(p); }} aria-label={`Link purchase ${p.orderId ?? p.id} from ${userLabel(p.user, p.userId)} to a booking`}>Link to booking</Button>
              <AckDeadline payment={p} />
            </div>) : '-' },
        ]} />}
      </QueryView>
      {linkT ? <LinkPaymentDialog payment={linkT} onClose={() => setLinkT(null)} onLinked={(r, p) => { setLinkT(null);
        setMsg(r.status === 'pending'
          ? `Linked ${p.orderId ?? p.id} to booking ${r.booking.id}. Google Play still shows the payment as pending; the booking confirms when it completes.`
          : `Linked ${p.orderId ?? p.id} to booking ${r.booking.id}. The booking is ${r.booking.status} and the purchase is being acknowledged with Google Play.`); }} /> : null}
    </>
  );
}
