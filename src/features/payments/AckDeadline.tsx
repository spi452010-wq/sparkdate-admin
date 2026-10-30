import { useEffect, useState } from 'react';
import type { PlayPayment } from '../../api/types';

const H = 3600_000;
export function useNow(intervalMs = 60_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), intervalMs); return () => clearInterval(t); }, [intervalMs]);
  return now;
}
export function formatLeft(ms: number) {
  const h = Math.floor(ms / H), m = Math.floor((ms % H) / 60_000);
  return h >= 24 ? `${Math.floor(h / 24)}d ${h % 24}h left` : `${h}h ${m}m left`;
}

/** Google Play auto-refunds a purchase not acknowledged within 3 days. Uses the server's `ackDeadline`; urgent (red) under 24 h. */
export function AckDeadline({ payment }: { payment: PlayPayment }) {
  const now = useNow();
  if (!payment.ackDeadline) return <span className="badge badge-neutral" title="The server did not send a Google Play deadline for this purchase">Play deadline unknown</span>;
  const at = new Date(payment.ackDeadline);
  if (Number.isNaN(at.getTime())) return <span className="badge badge-neutral">Play deadline unknown</span>;
  const left = at.getTime() - now;
  const title = `Google Play acknowledge deadline: ${at.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}`;
  if (left <= 0) return <span className="badge badge-danger" title={title}>Play deadline passed (may be auto-refunded)</span>;
  const urgent = left < 24 * H;
  return (
    <span className={`badge ${urgent ? 'badge-danger' : 'badge-warning'}`} title={title} data-urgent={urgent || undefined}>
      {urgent ? 'Urgent: ' : ''}{formatLeft(left)}
      <span className="sr-only">. {title}</span>
    </span>
  );
}
