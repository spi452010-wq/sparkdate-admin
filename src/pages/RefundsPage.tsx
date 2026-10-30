import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApi } from '../auth/AuthContext';
import { QueryView } from '../components/QueryView';
import { Table } from '../components/Table';
import { ConfirmDialog, Modal } from '../components/Modal';
import { Button, Field, Notice, StatusBadge } from '../components/ui';
import { formatInr, type RefundItem, type RefundStatus } from '../api/types';

const STATUSES: RefundStatus[] = ['requested', 'processing', 'processed', 'rejected', 'failed'];
const canDecide = (r: RefundItem) => r.status === 'refund_requested' && (r.refund.status === 'requested' || r.refund.status === 'failed');
const who = (r: RefundItem) => r.user.fullName ?? r.user.phone ?? r.user.id;

export function RefundsPage() {
  const api = useApi(); const qc = useQueryClient();
  const [status, setStatus] = useState<RefundStatus | ''>('requested');
  const q = useQuery({ queryKey: ['refunds', status], queryFn: () => api.listRefunds(status || undefined) });
  const [approveT, setApproveT] = useState<RefundItem | null>(null);
  const [rejectT, setRejectT] = useState<RefundItem | null>(null);
  const [reason, setReason] = useState(''); const [reasonErr, setReasonErr] = useState<string>();
  const [msg, setMsg] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const refresh = () => ['refunds', 'stats', 'payments'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
  const onError = (e: Error) => { setApproveT(null); setRejectT(null); setMsg({ kind: 'error', text: e.message }); refresh(); };
  const approve = useMutation({ mutationFn: (r: RefundItem) => api.approveRefund(r.bookingId), onError,
    onSuccess: (r) => { setApproveT(null); setMsg({ kind: 'success', text: `Refund ${r.refund.status} for ${who(r)} (Google Play order ${r.refund.playOrderId ?? r.playOrderId ?? '-'}).` }); refresh(); } });
  const reject = useMutation({ mutationFn: (v: { r: RefundItem; reason: string }) => api.rejectRefund(v.r.bookingId, v.reason), onError,
    onSuccess: (r) => { setRejectT(null); setMsg({ kind: 'success', text: `Refund rejected for ${who(r)}. This decision is final.` }); refresh(); } });
  const submitReject = () => {
    const t = reason.trim();
    if (t.length < 3 || t.length > 300) { setReasonErr('Give a reason of 3 to 300 characters. The user sees it.'); return; }
    reject.mutate({ r: rejectT!, reason: t });
  };
  return (
    <>
      <h1>Refund requests</h1>
      {msg ? <Notice kind={msg.kind}>{msg.text}</Notice> : null}
      <div className="field inline"><label htmlFor="rf">Refund status</label>
        <select id="rf" value={status} onChange={(e) => setStatus(e.target.value as RefundStatus | '')}>
          <option value="">All</option>{STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select></div>
      <QueryView query={q} isEmpty={(d) => d.items.length === 0} empty={{ title: 'No refund requests' }}>
        {(d) => <Table<RefundItem> caption="Refund requests" rows={d.items} rowKey={(r) => r.bookingId} columns={[
          { key: 'u', header: 'User', render: (r) => <>{who(r)}{r.user.phone && r.user.fullName ? <div className="muted">{r.user.phone}</div> : null}</> },
          { key: 'e', header: 'Event', render: (r) => <>{r.event.title ?? r.event.id}{r.event.startsAt ? <div className="muted">{new Date(r.event.startsAt).toLocaleDateString('en-IN')}</div> : null}</> },
          { key: 'a', header: 'Amount', render: (r) => formatInr(r.amountInPaise) },
          { key: 'o', header: 'Play order ID', render: (r) => <code>{r.refund.playOrderId ?? r.playOrderId ?? '-'}</code> },
          { key: 'r', header: 'Reason', render: (r) => <>{(r.refund.reason ?? '-').replace(/_/g, ' ')}{r.refund.auto ? <div className="muted">automatic</div> : null}{r.refund.rejectReason ? <div className="muted">Rejected: {r.refund.rejectReason}</div> : null}</> },
          { key: 's', header: 'Refund', render: (r) => <StatusBadge status={r.refund.status} /> },
          { key: 'x', header: 'Actions', render: (r) => canDecide(r) ? (
            <div className="row">
              <Button variant="secondary" onClick={() => { setRejectT(r); setReason(''); setReasonErr(undefined); }} aria-label={`Reject refund for ${who(r)}`}>Reject</Button>
              <Button onClick={() => setApproveT(r)} aria-label={`${r.refund.status === 'failed' ? 'Retry' : 'Approve'} refund for ${who(r)}`}>{r.refund.status === 'failed' ? 'Retry refund' : 'Approve'}</Button>
            </div>) : '-' },
        ]} />}
      </QueryView>
      <ConfirmDialog open={!!approveT} loading={approve.isPending} title="Approve refund?" confirmLabel="Approve"
        message={approveT ? `${formatInr(approveT.amountInPaise)} will be refunded to ${who(approveT)} through Google Play right away.` : ''}
        onCancel={() => setApproveT(null)} onConfirm={() => approveT && approve.mutate(approveT)} />
      <Modal open={!!rejectT} title="Reject refund?" onClose={() => setRejectT(null)}>
        <p>{rejectT ? `${who(rejectT)}'s refund request will be rejected. This is final.` : ''}</p>
        <Field label="Reason (shown to the user)" error={reasonErr}><textarea rows={3} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
        <div className="row end">
          <Button variant="secondary" onClick={() => setRejectT(null)}>Back</Button>
          <Button variant="danger" loading={reject.isPending} onClick={submitReject}>Reject refund</Button>
        </div>
      </Modal>
    </>
  );
}
