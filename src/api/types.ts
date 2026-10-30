// Field names follow docs/DB_SCHEMA.md. The API returns `id` (string form of Mongo `_id`). Money is in paise.
export type Role = 'user' | 'host' | 'admin';
export type AdminRole = 'admin' | 'host';
// docs/api/AUTH_PROFILE_MEDIA.md: user.role is a single value
export interface AdminUser { id: string; email?: string; phone?: string; role: Role; fullName?: string }

export type EventStatus = 'draft' | 'published' | 'live' | 'ended' | 'cancelled';
export type Gender = 'male' | 'female';
export interface SpeedEvent {
  id: string; title: string; description: string; hostName?: string; city?: string;
  startsAt: string; endsAt?: string; roundMinutes: number;
  priceInPaise: number; playProductId?: string | null; // Google Play product for paid events, e.g. event_ticket_199
  status: EventStatus;
  capacity: Record<Gender, number>; booked: Record<Gender, number>;
  createdBy?: string;
}
export interface EventInput {
  title: string; description: string; startsAt: string; roundMinutes: number;
  capacity: Record<Gender, number>; priceInPaise: number; playProductId: string | null; status?: EventStatus;
}
export type EventPatch = Partial<EventInput>;
export type RefundStatus = 'requested' | 'processing' | 'processed' | 'rejected' | 'failed';
export interface Booking {
  id: string; eventId: string; userId: string; userName: string; gender: Gender;
  status: BookingStatus;
  amountInPaise: number; datesCompleted: number; createdAt: string;
  refund?: BookingRefund;
}
export type VerificationStatus = 'none' | 'pending' | 'approved' | 'rejected';
export interface Photo { key: string; order: number; url: string } // url is signed, expires in 15 min: never cache long term
export interface AppUser {
  id: string; phone?: string; email?: string; role: Role; status: 'active' | 'blocked' | 'deleted';
  profileCompleted?: boolean;
  profile?: { fullName?: string; gender?: Gender; interestedIn?: Gender; city?: string; bio?: string; photos?: Photo[] };
  verification: { status: VerificationStatus; reviewedAt?: string; reason?: string };
  /** Signed selfie URL from the API, valid ~5 min. Use directly in <img>; refetch the list when it expires or fails to load. */
  selfieUrl?: string;
  createdAt: string;
}
export const userName = (u: Pick<AppUser, 'profile' | 'phone' | 'email' | 'id'>) => u.profile?.fullName || u.phone || u.email || u.id;
export type ReportStatus = 'open' | 'actioned' | 'dismissed';
export interface Report {
  id: string; reporterId: string; reporterName: string; reportedId: string; reportedName: string;
  eventId?: string; dateId?: string; reason: string; details?: string; status: ReportStatus; createdAt: string;
}
export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'expired' | 'refund_requested' | 'refunded' | 'cancelled_by_admin';
/** Booking refund sub-document (docs/api/SPRINT2_API.md, booking.model.ts). */
export interface BookingRefund {
  status: RefundStatus; reason?: string; requestedAt?: string; decidedAt?: string;
  rejectReason?: string; playOrderId?: string; auto?: boolean;
}
/** GET /admin/refunds item: a booking with a refund. Identified by bookingId; backend issues the Google Play refund on approve. */
export interface RefundItem {
  bookingId: string; status: BookingStatus; refund: BookingRefund; amountInPaise: number; playOrderId?: string;
  user: { id: string; fullName?: string; phone?: string };
  event: { id: string; title?: string; startsAt?: string };
}
export type PaymentStatus = 'verified' | 'refunded' | 'refund_failed' | 'voided';
/** GET /admin/payments item. purchaseToken is never returned. */
export interface PlayPayment {
  id: string; userId: string; bookingId: string | null; kind: 'ticket' | 'chat_pass'; productId: string;
  orderId?: string; amountInPaise: number; status: PaymentStatus; acknowledged: boolean; createdAt: string; refundedAt?: string;
}
export interface CancelSummary { cancelledPending: number; cancelledFree: number; refunded: number; refundFailed: number }
export interface CancelEventResult { id: string; status: EventStatus; summary: CancelSummary }
export interface DashboardStats {
  totalUsers: number; pendingVerifications: number; publishedEvents: number; liveEvents: number;
  openReports: number; pendingRefunds: number;
}
export interface Paginated<T> { items: T[]; total: number; page?: number; limit?: number }
export const PLAY_PRODUCTS = ['event_ticket_99', 'event_ticket_199', 'event_ticket_249', 'event_ticket_499'] as const;
export const CHAT_PASS_PRODUCT = 'chat_pass_monthly';
export const formatInr = (paise: number) => (paise === 0 ? 'Free' : `₹${(paise / 100).toLocaleString('en-IN')}`);
