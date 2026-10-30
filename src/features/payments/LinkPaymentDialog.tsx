import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApi } from '../../auth/AuthContext';
import { Modal } from '../../components/Modal';
import { Button, Field, Notice } from '../../components/ui';
import { ApiError } from '../../api/http';
import { formatInr, userLabel, type LinkPaymentResult, type PlayPayment } from '../../api/types';
import { AckDeadline } from './AckDeadline';

/** linkPayment accepts only the payer's pending or expired bookings for an event with the same Play product (else 404). */
const ELIGIBLE = ['pending', 'expired'];
const OBJECT_ID = /^[a-f0-9]{24}$/i;

/** POST /admin/payments/:id/link {bookingId}. Candidates come from GET /admin/users/:id/bookings (newest first); manual ID is the fallback. */
export function LinkPaymentDialog({ payment, onClose, onLinked }: { payment: PlayPayment; onClose: () => void; onLinked: (r: LinkPaymentResult, p: PlayPayment) => void }) {
  const api = useApi(); const qc = useQueryClient();
  const who = userLabel(payment.user, payment.userId);
  const bq = useQuery({ queryKey: ['user-bookings', payment.userId], queryFn: () => api.listUserBookings(payment.userId, { limit: 100 }) });
  const loadingCandidates = bq.isLoading;
  const candidates = (bq.data?.items ?? []).filter((b) => ELIGIBLE.includes(b.status))
    .map((b) => ({ ...b, match: b.event.playProductId === payment.productId }))
    .sort((a, b) => Number(b.match) - Number(a.match));
  const [picked, setPicked] = useState(''); const [manual, setManual] = useState('');
  const [err, setErr] = useState<string>(); const [confirming, setConfirming] = useState(false);
  const bookingId = (manual.trim() || picked);
  const link = useMutation({
    mutationFn: () => api.linkPayment(payment.id, bookingId),
    onSuccess: (r) => { ['payments', 'stats', 'event-bookings', 'user-bookings', 'events', 'refunds'].forEach((k) => qc.invalidateQueries({ queryKey: [k] })); onLinked(r, payment); },
    onError: (e) => { setConfirming(false); if (e instanceof ApiError && e.code === 'PAYMENT_NOT_UNLINKED') qc.invalidateQueries({ queryKey: ['payments'] }); },
  });
  const next = () => {
    if (!bookingId) return setErr('Pick one of the user\'s bookings or enter a booking ID.');
    if (manual.trim() && !api.mock && !OBJECT_ID.test(manual.trim())) return setErr('Booking ID must be a 24-character hex ID.');
    setErr(undefined); setConfirming(true);
  };
  return (
    <Modal open title="Link purchase to booking" onClose={onClose}>
      <p>{who}'s Google Play purchase <code>{payment.orderId ?? payment.id}</code> ({payment.productId}, {formatInr(payment.amountInPaise)}) has no booking.
        Linking confirms the booking, then acknowledges the purchase with Google Play.</p>
      <p>Google deadline: <AckDeadline payment={payment} /> Unacknowledged purchases are refunded by Google after 3 days.</p>
      {link.isError ? <Notice kind="error">{(link.error as Error).message}</Notice> : null}
      {!confirming ? (
        <>
          <fieldset className="field">
            <legend>{who}'s pending or expired bookings (purchase product {payment.productId})</legend>
            {loadingCandidates ? <p className="muted">Looking for bookings…</p>
              : bq.isError ? <Notice kind="error">Could not load this user's bookings: {(bq.error as Error).message} Enter the booking ID below.</Notice>
              : candidates.length === 0 ? <p className="muted">This user has no pending or expired bookings. Enter the booking ID below.</p>
              : candidates.map((b) => (
                <label key={b.id} className="row">
                  <input type="radio" name="link-booking" value={b.id} disabled={!b.match} checked={picked === b.id && !manual} onChange={() => { setPicked(b.id); setManual(''); }} />
                  {b.event.title ?? b.event.id} · {b.status} · {b.event.startsAt ? new Date(b.event.startsAt).toLocaleString('en-IN') : 'no date'}{b.event.city ? ` · ${b.event.city}` : ''} · <code>{b.id}</code>{' '}
                  {b.match ? <span className="badge badge-success">Product match</span>
                    : <span className="badge badge-neutral">Different product ({b.event.playProductId ?? 'free'}), can't link</span>}
                </label>))}
          </fieldset>
          <Field label="Or enter booking ID" error={err}><input value={manual} onChange={(e) => setManual(e.target.value)} placeholder="24-character booking ID" maxLength={40} /></Field>
          <div className="row end"><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={next}>Continue</Button></div>
        </>
      ) : (
        <>
          <p role="alert">Link this purchase to booking <code>{bookingId}</code>? The booking will be confirmed and the purchase acknowledged with Google Play. This cannot be undone here.</p>
          <div className="row end"><Button variant="secondary" onClick={() => setConfirming(false)}>Back</Button>
            <Button loading={link.isPending} onClick={() => link.mutate()}>Confirm link</Button></div>
        </>
      )}
    </Modal>
  );
}
