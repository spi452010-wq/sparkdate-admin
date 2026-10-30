import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useApi } from '../auth/AuthContext';
import { QueryView } from '../components/QueryView';
import { Table } from '../components/Table';
import { Button, StatusBadge } from '../components/ui';
import { formatInr, type PaymentStatus, type PlayPayment } from '../api/types';

const STATUSES: PaymentStatus[] = ['verified', 'refunded', 'refund_failed', 'voided'];

/** GET /admin/payments: filters are status and userId (exact). There is no text search in the API. */
export function PaymentsPage() {
  const api = useApi();
  const [status, setStatus] = useState<PaymentStatus | ''>('');
  const [term, setTerm] = useState(''); const [userId, setUserId] = useState('');
  const query = useQuery({ queryKey: ['payments', status, userId], queryFn: () => api.listPayments({ status: status || undefined, userId: userId || undefined }) });
  return (
    <>
      <h1>Google Play purchases</h1>
      <form role="search" className="row" onSubmit={(e) => { e.preventDefault(); setUserId(term.trim()); }}>
        <label htmlFor="pu" className="sr-only">User ID</label>
        <input id="pu" type="search" placeholder="User ID (exact)" value={term} onChange={(e) => setTerm(e.target.value)} />
        <Button type="submit" variant="secondary">Filter</Button>
        <label htmlFor="pst" className="sr-only">Payment status</label>
        <select id="pst" value={status} onChange={(e) => setStatus(e.target.value as PaymentStatus | '')}>
          <option value="">All statuses</option>{STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>
      </form>
      <QueryView query={query} isEmpty={(d) => d.items.length === 0} empty={{ title: 'No purchases found' }}>
        {(d) => <Table<PlayPayment> caption="Google Play purchases" rows={d.items} columns={[
          { key: 'o', header: 'Order ID', render: (p) => <code>{p.orderId ?? '-'}</code> },
          { key: 'p', header: 'Product ID', render: (p) => <code>{p.productId}</code> },
          { key: 'u', header: 'User ID', render: (p) => <code>{p.userId}</code> },
          { key: 'k', header: 'For', render: (p) => (p.kind === 'chat_pass' ? 'Chat Pass' : `Event ticket${p.bookingId ? ` (booking ${p.bookingId})` : ''}`) },
          { key: 'a', header: 'Amount', render: (p) => formatInr(p.amountInPaise) },
          { key: 's', header: 'Status', render: (p) => <StatusBadge status={p.status} /> },
          { key: 'ack', header: 'Acknowledged', render: (p) => (p.acknowledged ? 'Yes' : 'No (retrying)') },
          { key: 'd', header: 'Date', render: (p) => new Date(p.createdAt).toLocaleString('en-IN') },
        ]} />}
      </QueryView>
    </>
  );
}
