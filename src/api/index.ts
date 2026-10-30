import { ApiError, http } from './http';
import { createMockApi } from './mock';
import type { AdminUser, AppUser, Booking, DashboardStats, EventInput, EventPatch, EventStatus, Paginated, CancelEventResult, LinkPaymentResult, UserBooking, BookingStatus, PaymentStatus, PlayPayment, RefundItem, RefundStatus, Report, ReportStatus, SpeedEvent, VerificationStatus } from './types';

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
  listRefunds(f?: { status?: RefundStatus; q?: string }): Promise<Paginated<RefundItem>>;
  approveRefund(bookingId: string): Promise<RefundItem>;
  rejectRefund(bookingId: string, reason: string): Promise<RefundItem>;
  listPayments(f?: { status?: PaymentStatus; userId?: string; eventId?: string; q?: string }): Promise<Paginated<PlayPayment>>;
  cancelEvent(id: string): Promise<CancelEventResult>;
  linkPayment(paymentId: string, bookingId: string): Promise<LinkPaymentResult>;
  listUserBookings(userId: string, f?: { status?: BookingStatus; page?: number; limit?: number }): Promise<Paginated<UserBooking>>;
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
  // Sprint 2 (docs/api/SPRINT2_API.md), admin role only. Admin POSTs need CSRF only, no Idempotency-Key.
  listRefunds: (f = {}) => http(`/admin/refunds${qs({ status: f.status, q: f.q, limit: '100' })}`),
  approveRefund: (id) => http(`/admin/refunds/${e(id)}/approve`, json('POST')),
  rejectRefund: (id, reason) => http(`/admin/refunds/${e(id)}/reject`, json('POST', { reason })),
  listPayments: (f = {}) => http(`/admin/payments${qs({ status: f.status, userId: f.userId, eventId: f.eventId, q: f.q, limit: '100' })}`),
  cancelEvent: (id) => http(`/admin/events/${e(id)}/cancel`, json('POST')),
  listUserBookings: (id, f = {}) => http(`/admin/users/${e(id)}/bookings${qs({ status: f.status, page: f.page ? String(f.page) : undefined, limit: String(f.limit ?? 100) })}`),
  linkPayment: (id, bookingId) => http(`/admin/payments/${e(id)}/link`, json('POST', { bookingId })),
  // No admin reports API yet: page shows "Coming soon" on the real API.
  listReports: notAvailable, resolveReport: notAvailable,
};

export const USE_MOCK = (import.meta.env.VITE_USE_MOCK ?? 'true') !== 'false';
export const api: AdminApi = USE_MOCK ? createMockApi() : httpApi;
