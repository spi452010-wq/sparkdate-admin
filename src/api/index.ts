import { ApiError, http } from './http';
import { createMockApi } from './mock';
import type { AdminUser, AppUser, Booking, DashboardStats, EventInput, EventPatch, EventStatus, Paginated, PlayPurchase, RefundRequest, RefundStatus, Report, ReportStatus, SpeedEvent, VerificationStatus } from './types';

export interface AdminApi {
  /** true for the in-memory mock; false for the real backend. */
  readonly mock: boolean;
  login(email: string, password: string): Promise<AdminUser>;
  logout(): Promise<void>;
  me(): Promise<AdminUser>;
  stats(): Promise<DashboardStats>;
  listEvents(status?: EventStatus): Promise<Paginated<SpeedEvent>>;
  getEvent(id: string): Promise<SpeedEvent>;
  createEvent(input: EventInput): Promise<SpeedEvent>;
  updateEvent(id: string, patch: EventPatch): Promise<SpeedEvent>;
  listEventBookings(id: string): Promise<Paginated<Booking>>;
  listUsers(q?: string, verification?: VerificationStatus, status?: 'active' | 'blocked'): Promise<Paginated<AppUser>>;
  reviewVerification(id: string, decision: 'approved' | 'rejected', reason?: string): Promise<Pick<AppUser, 'id' | 'verification'>>;
  setUserStatus(id: string, status: 'active' | 'blocked'): Promise<Pick<AppUser, 'id' | 'status'>>;
  listReports(status?: ReportStatus): Promise<Paginated<Report>>;
  resolveReport(id: string, action: 'dismiss' | 'block_user'): Promise<Report>;
  listRefunds(status?: RefundStatus): Promise<Paginated<RefundRequest>>;
  reviewRefund(id: string, decision: 'approve' | 'reject'): Promise<RefundRequest>;
  listPurchases(q?: string): Promise<Paginated<PlayPurchase>>;
}

const qs = (p: Record<string, string | undefined>) => {
  const s = new URLSearchParams(Object.entries(p).filter(([, v]) => v) as [string, string][]).toString();
  return s ? `?${s}` : '';
};
const json = (method: string, body?: unknown): RequestInit => ({ method, body: body === undefined ? undefined : JSON.stringify(body) });
const e = encodeURIComponent;

const notAvailable = async (): Promise<never> => { throw new ApiError(501, 'NOT_AVAILABLE', 'This section is not available yet.'); };

export const httpApi: AdminApi = {
  mock: false,
  login: (email, password) => http('/admin/auth/login', json('POST', { email, password })),
  logout: () => http('/admin/auth/logout', json('POST')),
  me: () => http('/admin/auth/me'),
  stats: () => http('/admin/stats'),
  listEvents: (status) => http(`/admin/events${qs({ status })}`),
  getEvent: (id) => http(`/admin/events/${e(id)}`),
  createEvent: (input) => http('/admin/events', json('POST', input)),
  updateEvent: (id, input) => http(`/admin/events/${e(id)}`, json('PATCH', input)),
  listEventBookings: (id) => http(`/admin/events/${e(id)}/bookings`),
  listUsers: (q, verification, status) => http(`/admin/users${qs({ q, verification, status, limit: '100' })}`),
  reviewVerification: (id, decision, reason) => http(`/admin/users/${e(id)}/verification`, json('POST', reason ? { decision, reason } : { decision })),
  setUserStatus: (id, status) => http(`/admin/users/${e(id)}/status`, json('POST', { status })),
  // Not in the backend yet (reports: Sprint 2, refunds/payments: Sprint 4). Pages show a "not available yet" state.
  // Planned paths: GET /admin/reports, POST /admin/reports/{id}/resolve, GET /admin/refunds,
  // POST /admin/refunds/{id}/approve|reject, GET /admin/payments.
  listReports: notAvailable, resolveReport: notAvailable, listRefunds: notAvailable, reviewRefund: notAvailable, listPurchases: notAvailable,
};

export const USE_MOCK = (import.meta.env.VITE_USE_MOCK ?? 'true') !== 'false';
export const api: AdminApi = USE_MOCK ? createMockApi() : httpApi;
