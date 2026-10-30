import { ApiError } from './http';
import type { AdminApi } from './index';
import type { AdminUser, AppUser, Booking, EventPatch, PlayPayment, RefundItem, Report, SpeedEvent } from './types';

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
const iso = (d: number) => new Date(Date.now() + d * 86400000).toISOString();
const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));
const page = <T,>(items: T[]) => ({ items: clone(items), total: items.length });
// 1x1 pink SVG placeholder so mock selfie review renders without a server
const SELFIE = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240"><rect width="100%" height="100%" fill="#fde2ec"/><text x="50%" y="50%" text-anchor="middle" fill="#c2185b" font-size="20">Selfie (mock)</text></svg>');

export function createMockApi(latency = 250): AdminApi {
  let seq = 100;
  const wait = () => delay(latency);
  let session: AdminUser | null = null;
  const failed: Record<string, number> = {};
  const admins: Record<string, AdminUser> = {
    'admin@sparkdate.in': { id: 'adm_1', email: 'admin@sparkdate.in', role: 'admin', fullName: 'SparkDate Admin' },
    'host@sparkdate.in': { id: 'host_1', email: 'host@sparkdate.in', role: 'host', fullName: 'Event Host' },
  };
  const events: SpeedEvent[] = [
    { id: 'evt_1', title: 'Friday Night Sparks', description: 'Mumbai singles 25-32', startsAt: iso(2), roundMinutes: 3, priceInPaise: 19900, playProductId: 'event_ticket_199', status: 'published', capacity: { male: 150, female: 150 }, booked: { male: 112, female: 97 }, createdBy: 'host_1' },
    { id: 'evt_2', title: 'Sunday Coffee Dates', description: 'Free community event', startsAt: iso(4), roundMinutes: 3, priceInPaise: 0, playProductId: null, status: 'draft', capacity: { male: 100, female: 100 }, booked: { male: 0, female: 0 }, createdBy: 'adm_1' },
    { id: 'evt_3', title: 'Bangalore Techies', description: 'For people in tech', startsAt: iso(-3), roundMinutes: 3, priceInPaise: 24900, playProductId: 'event_ticket_249', status: 'ended', capacity: { male: 150, female: 150 }, booked: { male: 150, female: 141 }, createdBy: 'adm_1' },
  ];
  const mk = (id: string, fullName: string, gender: 'male' | 'female', v: AppUser['verification']['status'], status: AppUser['status'] = 'active'): AppUser =>
    ({ id, phone: `+9198000000${id.slice(-2)}`, role: 'user', status, profileCompleted: true,
       profile: { fullName, gender, interestedIn: gender === 'male' ? 'female' : 'male', city: 'Mumbai', photos: [{ key: `photos/${id}/1.jpg`, order: 0, url: SELFIE }] },
       verification: { status: v }, selfieUrl: v === 'none' ? undefined : SELFIE, createdAt: iso(-5) });
  const users: AppUser[] = [mk('usr_01', 'Aarav Shah', 'male', 'pending'), mk('usr_02', 'Diya Mehta', 'female', 'approved'), mk('usr_03', 'Kabir Rao', 'male', 'rejected', 'blocked'), mk('usr_04', 'Ananya Iyer', 'female', 'pending')];
  const bookings: Booking[] = [
    { id: 'bkg_1', eventId: 'evt_1', userId: 'usr_01', userName: 'Aarav Shah', gender: 'male', status: 'confirmed', amountInPaise: 19900, datesCompleted: 0, createdAt: iso(-1) },
    { id: 'bkg_2', eventId: 'evt_1', userId: 'usr_02', userName: 'Diya Mehta', gender: 'female', status: 'confirmed', amountInPaise: 19900, datesCompleted: 0, createdAt: iso(-1) },
  ];
  const reports: Report[] = [{ id: 'rpt_1', reporterId: 'usr_02', reporterName: 'Diya Mehta', reportedId: 'usr_03', reportedName: 'Kabir Rao', reason: 'inappropriate_behaviour', details: 'Rude on call', eventId: 'evt_3', status: 'open', createdAt: iso(-2) }];
  const payments: PlayPayment[] = [
    { id: 'pay_1', userId: 'usr_01', bookingId: 'bkg_1', kind: 'ticket', productId: 'event_ticket_199', orderId: 'GPA.3301-1111-2222-00001', amountInPaise: 19900, status: 'verified', acknowledged: true, createdAt: iso(-1) },
    { id: 'pay_2', userId: 'usr_02', bookingId: null, kind: 'chat_pass', productId: 'chat_pass_monthly', orderId: 'GPA.3301-1111-2222-00002', amountInPaise: 29900, status: 'verified', acknowledged: true, createdAt: iso(-3) },
    { id: 'pay_3', userId: 'usr_04', bookingId: 'bkg_9', kind: 'ticket', productId: 'event_ticket_249', orderId: 'GPA.3312-0098-1122-55410', amountInPaise: 24900, status: 'verified', acknowledged: true, createdAt: iso(-4) },
    { id: 'pay_4', userId: 'usr_02', bookingId: 'bkg_2', kind: 'ticket', productId: 'event_ticket_199', orderId: 'GPA.3301-1111-2222-00003', amountInPaise: 19900, status: 'verified', acknowledged: false, createdAt: iso(-1) },
  ];
  const refunds: RefundItem[] = [
    { bookingId: 'bkg_9', status: 'refund_requested', amountInPaise: 24900, playOrderId: 'GPA.3312-0098-1122-55410',
      refund: { status: 'requested', reason: 'no_match', requestedAt: iso(-1) },
      user: { id: 'usr_04', fullName: 'Ananya Iyer', phone: '+919800000004' }, event: { id: 'evt_3', title: 'Bangalore Techies', startsAt: iso(-3) } },
  ];
  const payFor = (bookingId: string) => payments.find((x) => x.bookingId === bookingId);
  const find = <T extends { id: string }>(arr: T[], i: string) => { const x = arr.find((a) => a.id === i); if (!x) throw new ApiError(404, 'NOT_FOUND', 'Not found'); return x; };
  const auth = () => { if (!session) throw new ApiError(401, 'UNAUTHENTICATED', 'Please sign in'); };
  const ALLOWED: Record<string, string[]> = { draft: ['published', 'cancelled'], published: ['draft', 'cancelled', 'live'], live: ['ended'], ended: [], cancelled: [] };
  const fail = (status: number, code: string, msg: string) => { throw new ApiError(status, code, msg); };
  const adminOnly = () => { auth(); if (session!.role !== 'admin') fail(403, 'FORBIDDEN', 'Admins only'); };
  const scoped = () => { auth(); return events.filter((e) => session!.role === 'admin' || e.createdBy === session!.id); };
  const check = (n: SpeedEvent) => {
    if (n.capacity.male < 1 || n.capacity.female < 1 || n.capacity.male + n.capacity.female > 300) fail(400, 'VALIDATION_ERROR', 'Total capacity max 300');
    if (n.priceInPaise > 0 && !n.playProductId) fail(400, 'VALIDATION_ERROR', 'playProductId required for paid events');
  };
  const apply = (e: SpeedEvent, p: EventPatch) => {
    if (p.status && p.status !== e.status && !ALLOWED[e.status].includes(p.status)) fail(409, 'INVALID_STATUS_TRANSITION', `${e.status} -> ${p.status}`);
    if (['live', 'ended'].includes(e.status) && (p.capacity || p.startsAt || p.priceInPaise !== undefined || p.playProductId !== undefined)) fail(409, 'EVENT_LOCKED', 'Event locked');
    if (p.capacity && (p.capacity.male < e.booked.male || p.capacity.female < e.booked.female)) fail(409, 'CAPACITY_BELOW_BOOKED', 'Capacity cannot be below seats already booked');
    const n = { ...e, ...p, capacity: p.capacity ? { ...p.capacity } : e.capacity } as SpeedEvent;
    if (n.priceInPaise === 0) n.playProductId = null;
    check(n); Object.assign(e, n);
  };
  const findEvent = (i: string) => { const e = scoped().find((x) => x.id === i); if (!e) fail(404, 'NOT_FOUND', 'Not found'); return e!; };

  return {
    mock: true,
    // Mock accounts: admin@sparkdate.in / host@sparkdate.in, any password of 12+ chars. 5 wrong tries -> ACCOUNT_LOCKED.
    async login(email, password) {
      await wait();
      const key = email.trim().toLowerCase();
      if ((failed[key] ?? 0) >= 5) throw new ApiError(429, 'ACCOUNT_LOCKED', 'Account locked', { retryAfterSec: 900 });
      if (!admins[key] || password.length < 12) { failed[key] = (failed[key] ?? 0) + 1; throw new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid email or password'); }
      failed[key] = 0; session = admins[key]; return clone(session);
    },
    async logout() { await wait(); session = null; },
    async me() { await wait(); auth(); return session!; },
    async stats() {
      await wait(); adminOnly();
      return { totalUsers: users.length, pendingVerifications: users.filter((u) => u.verification.status === 'pending').length,
        publishedEvents: events.filter((e) => e.status === 'published').length, liveEvents: events.filter((e) => e.status === 'live').length,
        openReports: reports.filter((r) => r.status === 'open').length, pendingRefunds: refunds.filter((r) => r.refund.status === 'requested').length };
    },
    async listEvents(status) { await wait(); return page(scoped().filter((e) => !status || e.status === status)); },
    async getEvent(i) { await wait(); return clone(findEvent(i)); },
    async createEvent(i) {
      await wait(); auth();
      if (new Date(i.startsAt) <= new Date()) fail(400, 'VALIDATION_ERROR', 'startsAt must be in the future');
      if (i.status && !['draft', 'published'].includes(i.status)) fail(400, 'VALIDATION_ERROR', 'New events start as draft or published');
      const e: SpeedEvent = { id: `evt_${++seq}`, ...i, playProductId: i.priceInPaise > 0 ? i.playProductId : null, status: i.status ?? 'draft', capacity: { ...i.capacity }, booked: { male: 0, female: 0 }, createdBy: session!.id };
      check(e); events.unshift(e); return clone(e);
    },
    async updateEvent(i, patch) { await wait(); const e = findEvent(i); apply(e, patch); return clone(e); },
    async listEventBookings(i) { await wait(); findEvent(i); return page(bookings.filter((b) => b.eventId === i)); },
    async listUsers(q, verification, status) {
      await wait(); adminOnly(); const s = (q ?? '').toLowerCase();
      const items = users.filter((u) => (!s || (u.profile?.fullName ?? '').toLowerCase().includes(s) || (u.phone ?? '').includes(s) || (u.email ?? '').toLowerCase().includes(s)) && (!verification || u.verification.status === verification) && (!status || u.status === status));
      return { ...page(items), page: 1, limit: 100 };
    },
    async reviewVerification(i, decision, reason) {
      await wait(); adminOnly(); const u = find(users, i);
      if (u.verification.status !== 'pending') throw new ApiError(404, 'NO_PENDING_VERIFICATION', 'No pending verification for this user');
      u.verification = { status: decision, reviewedAt: new Date().toISOString(), reason }; return { id: u.id, verification: clone(u.verification) };
    },
    async setUserStatus(i, status) { await wait(); adminOnly(); const u = find(users, i); u.status = status; return { id: u.id, status }; },
    async listReports(status) { await wait(); return page(reports.filter((r) => !status || r.status === status)); },
    async resolveReport(i, action) {
      await wait(); const r = find(reports, i);
      if (action === 'block_user') { const u = users.find((x) => x.id === r.reportedId); if (u) u.status = 'blocked'; r.status = 'actioned'; } else r.status = 'dismissed';
      return clone(r);
    },
    async listRefunds(status) { await wait(); adminOnly(); return page(refunds.filter((r) => !status || r.refund.status === status)); },
    async approveRefund(id) {
      await wait(); adminOnly();
      const r = refunds.find((x) => x.bookingId === id && x.status === 'refund_requested' && ['requested', 'failed'].includes(x.refund.status));
      if (!r) fail(409, 'REFUND_NOT_PENDING', 'Refund is not pending');
      const pay = payFor(id); if (!pay?.orderId) fail(409, 'PAYMENT_NOT_FOUND', 'Payment not found');
      pay!.status = 'refunded'; pay!.refundedAt = new Date().toISOString();
      r!.status = 'refunded'; r!.refund = { ...r!.refund, status: 'processed', decidedAt: new Date().toISOString(), playOrderId: pay!.orderId };
      return clone(r!);
    },
    async rejectRefund(id, reason) {
      await wait(); adminOnly();
      if (reason.trim().length < 3 || reason.length > 300) fail(400, 'VALIDATION_ERROR', 'Reason must be 3-300 characters');
      const r = refunds.find((x) => x.bookingId === id && x.status === 'refund_requested' && ['requested', 'failed'].includes(x.refund.status));
      if (!r) fail(409, 'REFUND_NOT_PENDING', 'Refund is not pending');
      r!.status = 'confirmed'; r!.refund = { ...r!.refund, status: 'rejected', rejectReason: reason.trim(), decidedAt: new Date().toISOString() };
      return clone(r!);
    },
    async listPayments(f = {}) {
      await wait(); adminOnly();
      return page(payments.filter((p) => (!f.status || p.status === f.status) && (!f.userId || p.userId === f.userId)));
    },
    async cancelEvent(id) {
      await wait(); adminOnly();
      const ev = events.find((x) => x.id === id); if (!ev) fail(404, 'NOT_FOUND', 'Not found');
      if (!['draft', 'published', 'cancelled'].includes(ev!.status)) fail(409, 'INVALID_STATUS_TRANSITION', 'Live or ended events cannot be cancelled');
      ev!.status = 'cancelled';
      const summary = { cancelledPending: 0, cancelledFree: 0, refunded: 0, refundFailed: 0 };
      const now = new Date().toISOString();
      for (const b of bookings.filter((x) => x.eventId === id && ['pending', 'confirmed', 'refund_requested'].includes(x.status))) {
        if (b.status === 'pending') { b.status = 'cancelled'; summary.cancelledPending++; continue; }
        b.status = 'cancelled_by_admin';
        const pay = payFor(b.id);
        if (b.amountInPaise > 0 && pay) {
          pay.status = 'refunded'; pay.refundedAt = now; summary.refunded++;
          b.refund = { status: 'processed', reason: 'event_cancelled', requestedAt: now, auto: true, playOrderId: pay.orderId };
        } else summary.cancelledFree++;
      }
      return { id: ev!.id, status: ev!.status, summary };
    },
  };
}
