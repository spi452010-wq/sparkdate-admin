import { useId, type ButtonHTMLAttributes, type ReactNode, type ReactElement, cloneElement } from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';
export function Button({ variant = 'primary', loading, children, disabled, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; loading?: boolean }) {
  return (
    <button type="button" {...rest} className={`btn btn-${variant} ${rest.className ?? ''}`} disabled={disabled || loading} aria-busy={loading || undefined}>
      {loading ? <span className="spinner spinner-sm" aria-hidden /> : null}{children}
    </button>
  );
}

export function Field({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: ReactElement }) {
  const id = useId();
  const errId = `${id}-err`; const hintId = `${id}-hint`;
  const describedBy = [error ? errId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined;
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {cloneElement(children, { id, 'aria-invalid': error ? true : undefined, 'aria-describedby': describedBy })}
      {hint ? <small id={hintId} className="hint">{hint}</small> : null}
      {error ? <small id={errId} className="error" role="alert">{error}</small> : null}
    </div>
  );
}

export function Spinner({ label = 'Loading' }: { label?: string }) {
  return <div className="center" role="status" aria-live="polite"><span className="spinner" aria-hidden /><span className="sr-only">{label}</span></div>;
}

export function EmptyState({ title, message, action }: { title: string; message?: string; action?: ReactNode }) {
  return <div className="state"><h2>{title}</h2>{message ? <p>{message}</p> : null}{action}</div>;
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const msg = error instanceof Error ? error.message : 'Something went wrong';
  return <div className="state state-error" role="alert"><h2>Couldn't load data</h2><p>{msg}</p>{onRetry ? <Button variant="secondary" onClick={onRetry}>Retry</Button> : null}</div>;
}

const tone: Record<string, string> = {
  upcoming: 'info', live: 'success', completed: 'neutral', cancelled: 'danger', draft: 'neutral',
  pending: 'warning', approved: 'success', rejected: 'danger', not_submitted: 'neutral',
  open: 'warning', resolved: 'success', requested: 'warning', confirmed: 'success', refunded: 'neutral',
  blocked: 'danger', active: 'success', free: 'info', paid: 'accent',
};
export function StatusBadge({ status }: { status: string }) {
  return <span className={`badge badge-${tone[status] ?? 'neutral'}`}>{status.replace('_', ' ')}</span>;
}

export function Notice({ children, kind = 'success' }: { children: ReactNode; kind?: 'success' | 'error' }) {
  return <div className={`notice notice-${kind}`} role={kind === 'error' ? 'alert' : 'status'}>{children}</div>;
}
