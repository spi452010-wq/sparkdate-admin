import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useApi } from '../auth/AuthContext';
import { QueryView } from '../components/QueryView';
import { Table } from '../components/Table';
import { Button, StatusBadge } from '../components/ui';
import { formatInr, type PlayPurchase } from '../api/types';

export function PaymentsPage() {
  const api = useApi();
  const [term, setTerm] = useState(''); const [q, setQ] = useState('');
  const query = useQuery({ queryKey: ['payments', q], queryFn: () => api.listPurchases(q || undefined) });
  return (
    <>
      <h1>Google Play purchases</h1>
      <form role="search" className="row" onSubmit={(e) => { e.preventDefault(); setQ(term.trim()); }}>
        <label htmlFor="ps" className="sr-only">Search purchases</label>
        <input id="ps" type="search" placeholder="Order ID, product ID or user" value={term} onChange={(e) => setTerm(e.target.value)} />
        <Button type="submit" variant="secondary">Search</Button>
      </form>
      <QueryView query={query} isEmpty={(d) => d.items.length === 0} empty={{ title: 'No purchases found' }}>
        {(d) => <Table<PlayPurchase> caption="Google Play purchases" rows={d.items} columns={[
          { key: 'o', header: 'Order ID', render: (p) => <code>{p.orderId}</code> },
          { key: 'p', header: 'Product ID', render: (p) => <code>{p.productId}</code> },
          { key: 'u', header: 'User', render: (p) => p.userName },
          { key: 'f', header: 'For', render: (p) => (p.purpose === 'chat_pass' ? 'Chat Pass' : 'Event booking') },
          { key: 'a', header: 'Amount', render: (p) => formatInr(p.amountInPaise) },
          { key: 's', header: 'Purchase state', render: (p) => <StatusBadge status={p.purchaseState} /> },
          { key: 'k', header: 'Acknowledged', render: (p) => (p.acknowledged ? 'Yes' : 'No') },
        ]} />}
      </QueryView>
    </>
  );
}
