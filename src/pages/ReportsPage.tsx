import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApi } from '../auth/AuthContext';
import { QueryView } from '../components/QueryView';
import { Table } from '../components/Table';
import { ConfirmDialog } from '../components/Modal';
import { Button, Notice, StatusBadge } from '../components/ui';
import type { Report, ReportStatus } from '../api/types';

export function ReportsPage() {
  const api = useApi(); const qc = useQueryClient();
  const [status, setStatus] = useState<ReportStatus | ''>('open');
  const q = useQuery({ queryKey: ['reports', status], queryFn: () => api.listReports(status || undefined) });
  const [pending, setPending] = useState<{ r: Report; action: 'dismiss' | 'block_user' } | null>(null);
  const [msg, setMsg] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const m = useMutation({
    mutationFn: (p: { r: Report; action: 'dismiss' | 'block_user' }) => api.resolveReport(p.r.id, p.action),
    onSuccess: (r) => { setPending(null); setMsg({ kind: 'success', text: `Report ${r.status}` }); ['reports', 'users', 'stats'].forEach((k) => qc.invalidateQueries({ queryKey: [k] })); },
    onError: (e: Error) => { setPending(null); setMsg({ kind: 'error', text: e.message }); },
  });
  return (
    <>
      <h1>Reports</h1>
      {msg ? <Notice kind={msg.kind}>{msg.text}</Notice> : null}
      <div className="field inline"><label htmlFor="rs">Status</label>
        <select id="rs" value={status} onChange={(e) => setStatus(e.target.value as ReportStatus | '')}>
          <option value="">All</option><option value="open">open</option><option value="actioned">actioned</option><option value="dismissed">dismissed</option>
        </select></div>
      <QueryView query={q} isEmpty={(d) => d.items.length === 0} empty={{ title: 'No reports', message: 'Nothing needs moderation right now.' }}>
        {(d) => <Table<Report> caption="Reports" rows={d.items} columns={[
          { key: 'rp', header: 'Reported user', render: (r) => r.reportedName },
          { key: 'by', header: 'Reported by', render: (r) => r.reporterName },
          { key: 're', header: 'Reason', render: (r) => <>{r.reason.replace(/_/g, ' ')}{r.details ? <div className="muted">{r.details}</div> : null}</> },
          { key: 'd', header: 'Date', render: (r) => new Date(r.createdAt).toLocaleDateString('en-IN') },
          { key: 's', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
          { key: 'a', header: 'Actions', render: (r) => r.status === 'open' ? (
            <div className="row">
              <Button variant="secondary" onClick={() => setPending({ r, action: 'dismiss' })}>Dismiss</Button>
              <Button variant="danger" onClick={() => setPending({ r, action: 'block_user' })}>Block user</Button>
            </div>) : '-' },
        ]} />}
      </QueryView>
      <ConfirmDialog open={!!pending} danger={pending?.action === 'block_user'} loading={m.isPending}
        title={pending?.action === 'block_user' ? 'Block reported user?' : 'Dismiss report?'}
        message={pending?.action === 'block_user' ? `${pending.r.reportedName} will be blocked and the report marked actioned.` : 'The report will be closed with no action.'}
        confirmLabel={pending?.action === 'block_user' ? 'Block user' : 'Dismiss'}
        onCancel={() => setPending(null)} onConfirm={() => pending && m.mutate(pending)} />
    </>
  );
}
