import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { Button, Field, Notice } from '../components/ui';
import { USE_MOCK } from '../api';

export function LoginPage() {
  const { user, login } = useAuth();
  const nav = useNavigate();
  const from = (useLocation().state as { from?: string } | null)?.from ?? '/';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  if (user) return <Navigate to={from} replace />;

  async function submit(e: FormEvent) {
    e.preventDefault();
    const errs: typeof errors = {};
    if (!/^\S+@\S+\.\S+$/.test(email)) errs.email = 'Enter a valid email';
    if (!password) errs.password = 'Password is required';
    setErrors(errs); setError(null);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try { await login(email, password); nav(from, { replace: true }); }
    catch (err) { setError(err instanceof Error ? err.message : 'Sign in failed'); }
    finally { setBusy(false); }
  }
  return (
    <main className="login">
      <form className="card form" onSubmit={submit} noValidate aria-labelledby="login-title">
        <h1 id="login-title">SparkDate Admin</h1>
        {USE_MOCK ? <p className="muted">Mock mode: any email + 6-char password. Emails starting with "host" sign in as host.</p> : null}
        {error ? <Notice kind="error">{error}</Notice> : null}
        <Field label="Email" error={errors.email}><input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
        <Field label="Password" error={errors.password}><input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
        <Button type="submit" loading={busy}>Sign in</Button>
      </form>
    </main>
  );
}
