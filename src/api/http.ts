export class ApiError extends Error {
  /** `message` is the server text; the stored message is the user-facing one for known codes. */
  constructor(public status: number, public code: string, message: string, public details?: Record<string, unknown>) { super(friendlyMessage(code, message, details)); }
}

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '/api/v1').replace(/\/$/, '');

/** Human-readable messages for API error codes (docs/api/AUTH_PROFILE_MEDIA.md). */
export function friendlyMessage(code: string, fallback: string, details?: Record<string, unknown>): string {
  const mins = typeof details?.retryAfterSec === 'number' ? Math.ceil(details.retryAfterSec / 60) : 15;
  switch (code) {
    case 'INVALID_CREDENTIALS': return 'Incorrect email or password.';
    case 'ACCOUNT_LOCKED': return `Too many wrong passwords. This account is locked, try again in about ${mins} minutes.`;
    case 'TOO_MANY_ATTEMPTS': return `Too many sign-in attempts from this network. Try again in about ${mins} minutes.`;
    case 'ACCOUNT_BLOCKED': return 'This account is blocked. Contact a SparkDate admin.';
    case 'FORBIDDEN': return 'Your account does not have access to the admin panel or this action.';
    case 'CSRF_INVALID': return 'Your security token expired. Refresh the page and try again (sign in again if it keeps happening).';
    case 'UNAUTHORIZED': case 'TOKEN_INVALID': case 'REFRESH_INVALID': case 'REFRESH_REUSED': return 'Your session expired. Please sign in again.';
    case 'CAPACITY_BELOW_BOOKED': return 'Capacity cannot be lower than the seats already booked for this event.';
    case 'EVENT_LOCKED': return 'Schedule, price and capacity cannot change once an event is live or ended.';
    case 'INVALID_STATUS_TRANSITION': return `This status change is not allowed (${fallback}).`;
    case 'NO_PENDING_VERIFICATION': return 'This selfie was already reviewed. The list has been refreshed.';
    case 'CANNOT_CHANGE_SELF': return 'You cannot block your own account.';
    case 'NOT_AVAILABLE': return 'This section is not available yet.';
    default: return fallback;
  }
}

/** Readable (non-httpOnly) double-submit CSRF cookie. The session cookies sd_at / sd_rt stay httpOnly and are never read by JS. */
export function csrfToken(): string | undefined {
  const v = document.cookie.split('; ').find((c) => c.startsWith('csrf_token='))?.slice('csrf_token='.length);
  return v ? decodeURIComponent(v) : undefined;
}

async function raw(path: string, init: RequestInit): Promise<Response> {
  const unsafe = !!init.method && init.method !== 'GET';
  const token = unsafe ? csrfToken() : undefined;
  return fetch(`${API_BASE_URL}${path}`, {
    ...init, credentials: 'include',
    headers: { ...(token ? { 'X-CSRF-Token': token } : {}), 'Content-Type': 'application/json', Accept: 'application/json', ...(init.headers ?? {}) },
  });
}

let refreshing: Promise<boolean> | null = null;
/** sd_at lives 15 min; GET /admin/auth/me rotates it from sd_rt. Shared so parallel 401s refresh once. */
function refreshSession(): Promise<boolean> {
  refreshing ??= raw('/admin/auth/me', { method: 'GET' }).then((r) => r.ok).catch(() => false).finally(() => { refreshing = null; });
  return refreshing;
}

export async function http<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res = await raw(path, init);
  if (res.status === 401 && !path.startsWith('/admin/auth/') && (await refreshSession())) res = await raw(path, init);
  if (res.status === 204) return undefined as T;
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const err = body?.error ?? {};
    const code = err.code ?? 'HTTP_ERROR';
    throw new ApiError(res.status, code, err.message ?? `Request failed (${res.status})`, err.details);
  }
  return body as T;
}
