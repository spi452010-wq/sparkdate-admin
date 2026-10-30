import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { useApi } from '../auth/AuthContext';
import { QueryView } from '../components/QueryView';
import { Table } from '../components/Table';
import { ConfirmDialog, Modal } from '../components/Modal';
import { Button, Notice, StatusBadge } from '../components/ui';
import { userName, type AppUser, type VerificationStatus } from '../api/types';

export function UsersPage() {
  const api = useApi(); const qc = useQueryClient();
  const [sp, setSp] = useSearchParams();
  const verification = (sp.get('verification') as VerificationStatus | null) ?? undefined;
  const [term, setTerm] = useState(sp.get('q') ?? '');
  const q = sp.get('q') ?? '';
  const users = useQuery({ queryKey: ['users', q, verification ?? ''], queryFn: () => api.listUsers(q || undefined, verification),
    // selfieUrl is signed for 5 min (photos 15 min): never cache long, refetch before expiry
    staleTime: 60_000, gcTime: 0, refetchInterval: 4 * 60_000 });
  const [reviewId, setReviewId] = useState<string | null>(null);
  // Always read the user from the latest list so a refetch swaps in a fresh signed URL.
  const review = users.data?.items.find((u) => u.id === reviewId) ?? null;
  const setReview = (u: AppUser | null) => setReviewId(u?.id ?? null);
  const lastRetry = useRef(0);
  /** A signed URL expired or failed: refetch the list (at most every 10 s to avoid loops). */
  const onImgError = () => { if (Date.now() - lastRetry.current > 10_000) { lastRetry.current = Date.now(); void users.refetch(); } };
  const [blockTarget, setBlockTarget] = useState<AppUser | null>(null);
  const [msg, setMsg] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const done = (text: string) => { setMsg({ kind: 'success', text }); qc.invalidateQueries({ queryKey: ['users'] }); qc.invalidateQueries({ queryKey: ['stats'] }); };
  const fail = (e: Error) => setMsg({ kind: 'error', text: e.message });
  const verify = useMutation({ mutationFn: (v: { u: AppUser; d: 'approved' | 'rejected' }) => api.reviewVerification(v.u.id, v.d), onSuccess: (r, v) => { setReview(null); done(`Selfie ${r.verification.status} for ${userName(v.u)}`); }, onError: fail });
  const block = useMutation({ mutationFn: (u: AppUser) => api.setUserStatus(u.id, u.status === 'blocked' ? 'active' : 'blocked'), onSuccess: (r, u) => { setBlockTarget(null); done(`${userName(u)} is now ${r.status}`); }, onError: fail });
  const setParam = (k: string, v: string) => { const n = new URLSearchParams(sp); if (v) n.set(k, v); else n.delete(k); setSp(n); };

  return (
    <>
      <h1>Users</h1>
      {msg ? <Notice kind={msg.kind}>{msg.text}</Notice> : null}
      <form role="search" className="row" onSubmit={(e) => { e.preventDefault(); setParam('q', term.trim()); }}>
        <label htmlFor="user-search" className="sr-only">Search users</label>
        <input id="user-search" type="search" placeholder="Name, phone or email" value={term} onChange={(e) => setTerm(e.target.value)} />
        <Button type="submit" variant="secondary">Search</Button>
        <label htmlFor="vf" className="sr-only">Verification filter</label>
        <select id="vf" value={verification ?? ''} onChange={(e) => setParam('verification', e.target.value)}>
          <option value="">All verification</option>{(['pending', 'approved', 'rejected', 'none'] as const).map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </form>
      <QueryView query={users} isEmpty={(d) => d.items.length === 0} empty={{ title: 'No users found', message: q ? `Nothing matches "${q}".` : undefined }}>
        {(d) => <Table<AppUser> caption="Users" rows={d.items} columns={[
          { key: 'n', header: 'Name', render: (u) => userName(u) },
          { key: 'p', header: 'Phone', render: (u) => u.phone ?? u.email ?? '-' },
          { key: 'g', header: 'Gender', render: (u) => u.profile?.gender ?? '-' },
          { key: 'v', header: 'Selfie', render: (u) => <StatusBadge status={u.verification.status} /> },
          { key: 's', header: 'Account', render: (u) => <StatusBadge status={u.status} /> },
          { key: 'a', header: 'Actions', render: (u) => (
            <div className="row">
              {u.verification.status === 'pending' ? <Button variant="secondary" onClick={() => setReview(u)} aria-label={`Review selfie of ${userName(u)}`}>Review selfie</Button> : null}
              <Button variant={u.status === 'blocked' ? 'secondary' : 'danger'} onClick={() => setBlockTarget(u)} aria-label={`${u.status === 'blocked' ? 'Unblock' : 'Block'} ${userName(u)}`}>{u.status === 'blocked' ? 'Unblock' : 'Block'}</Button>
            </div>
          ) },
        ]} />}
      </QueryView>
      <Modal open={!!review} title={`Selfie review: ${review ? userName(review) : ''}`} onClose={() => setReview(null)}>
        {review?.selfieUrl
          ? <img className="selfie" src={review.selfieUrl} onError={onImgError} alt={`Selfie submitted by ${userName(review)}`} />
          : <p>No selfie image available.</p>}
        {review?.profile?.photos?.length ? (
          <div className="row" aria-label="Profile photos">
            {[...review.profile.photos].sort((a, b) => a.order - b.order).map((p) => <img key={p.key} src={p.url} onError={onImgError} alt={`Profile photo ${p.order + 1}`} width={72} height={72} style={{ objectFit: 'cover', borderRadius: 8 }} />)}
          </div>) : null}
        <div className="row end">
          <Button variant="danger" loading={verify.isPending && verify.variables?.d === 'rejected'} onClick={() => verify.mutate({ u: review!, d: 'rejected' })}>Reject</Button>
          <Button loading={verify.isPending && verify.variables?.d === 'approved'} onClick={() => verify.mutate({ u: review!, d: 'approved' })}>Approve</Button>
        </div>
      </Modal>
      <ConfirmDialog open={!!blockTarget} danger={blockTarget?.status !== 'blocked'} loading={block.isPending}
        title={blockTarget?.status === 'blocked' ? 'Unblock user?' : 'Block user?'}
        message={blockTarget?.status === 'blocked' ? `${(blockTarget ? userName(blockTarget) : '')} will be able to use the app again.` : `${(blockTarget ? userName(blockTarget) : '')} will be signed out and cannot book events or chat.`}
        confirmLabel={blockTarget?.status === 'blocked' ? 'Unblock' : 'Block'}
        onCancel={() => setBlockTarget(null)} onConfirm={() => blockTarget && block.mutate(blockTarget)} />
    </>
  );
}
