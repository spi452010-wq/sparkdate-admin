import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApi } from '../auth/AuthContext';
import { QueryView } from '../components/QueryView';
import { Table } from '../components/Table';
import { ConfirmDialog } from '../components/Modal';
import { Button, Notice, StatusBadge } from '../components/ui';
import { formatInr, type RefundRequest, type RefundStatus } from '../api/types';

export function RefundsPage() {
  const api = useApi(); const qc = useQueryClient();
  const [status, setStatus] = useState<RefundStatus | ''>('requested');
  const q = useQuery({ queryKey: ['refunds', status], queryFn: () => api.listRefunds(status || undefined) });
  const [pending, setPending] = useState<{ r: RefundRequest; d: 'approve' | 'reject' } | null>(null);
  const [msg, setMsg] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const m = useMutation({
    mutationFn: (p: { r: RefundRequest; d: 'approve' | 'reject' }) => api.reviewRefund(p.r.id, p.d),
    onSuccess: (r) => { setPending(null); setMsg({ kind: 'success', text: r.status === 'rejected' ? 'Refund rejected.' : 'Refund approved. The server is processing the Google Play refund.' }); ['refunds', 'stats', 'payments'].forEach((k) => qc.invalidateQueries({ queryKey: [k] })); },
    onError: (e: Error) => { setPending(null); setMsg({ kind: 'error', text: e.message }); },
  });
  return (
    <>
      <h1>Refund requests</h1>
      {msg ? <Notice kind={msg.kind}>{msg.text}</Notice> : null}
      <div className="field inline"><label htmlFor="rf">Status</label>
        <select id="rf" value={status} onChange={(e) => setStatus(e.target.value as RefundStatus | '')}>
          <option value="">All</option>{(['requested', 'processing', 'processed', 'rejected'] as const).map((s) => <option key={s} value={s}>{s}</option>)}
        </select></div>
      <QueryView query={q} isEmpty={(d) => d.items.length === 0} empty={{ title: 'No refund requests' }}>
        {(d) => <Table<RefundRequest> caption="Refund requests" rows={d.items} columns={[
          { key: 'u', header: 'User', render: (r) => r.userName },
          { key: 'e', header: 'Event', render: (r) => r.eventTitle },
          { key: 'a', header: 'Amount', render: (r) => formatInr(r.amountInPaise) },
          { key: 'o', header: 'Play order ID', render: (r) => <code>{r.orderId ?? '-'}</code> },
          { key: 'r', header: 'Reason', render: (r) => r.reason.replace(/_/g, ' ') },
          { key: 's', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
          { key: 'x', header: 'Actions', render: (r) => r.status === 'requested' ? (
            <div className="row">
              <Button variant="secondary" onClick={() => setPending({ r, d: 'reject' })}>Reject</Button>
              <Button onClick={() => setPending({ r, d: 'approve' })}>Approve</Button>
            </div>) : '-' },
        ]} />}
      </QueryView>
      <ConfirmDialog open={!!pending} danger={pending?.d === 'reject'} loading={m.isPending}
        title={pending?.d === 'approve' ? 'Approve refund?' : 'Reject refund?'}
        message={pending ? (pending.d === 'approve' ? `${formatInr(pending.r.amountInPaise)} will be refunded to ${pending.r.userName} through Google Play.` : `${pending.r.userName}'s refund request will be rejected.`) : ''}
        confirmLabel={pending?.d === 'approve' ? 'Approve' : 'Reject'}
        onCancel={() => setPending(null)} onConfirm={() => pending && m.mutate(pending)} />
    </>
  );
}
