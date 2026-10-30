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
export type RefundStatus = 'requested' | 'processing' | 'processed' | 'rejected';
export interface Booking {
  id: string; eventId: string; userId: string; userName: string; gender: Gender;
  status: 'pending' | 'confirmed' | 'cancelled' | 'expired' | 'refunded';
  amountInPaise: number; datesCompleted: number; createdAt: string;
  refund?: { status: RefundStatus; requestedAt: string };
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
/** Refund request = booking with refund sub-document. Admin approves/rejects; backend issues the Google Play refund. */
export interface RefundRequest {
  id: string; bookingId: string; userId: string; userName: string; eventId: string; eventTitle: string;
  amountInPaise: number; reason: string; status: RefundStatus; requestedAt: string;
  orderId?: string; // Google Play order id, e.g. GPA.1234-5678-9012-34567
}
export type PurchaseState = 'pending' | 'purchased' | 'cancelled' | 'refunded';
export interface PlayPurchase {
  id: string; userId: string; userName: string; purpose: 'booking' | 'chat_pass'; refId: string;
  orderId: string; productId: string; purchaseState: PurchaseState; acknowledged: boolean;
  amountInPaise: number; createdAt: string;
}
export interface DashboardStats {
  totalUsers: number; pendingVerifications: number; publishedEvents: number; liveEvents: number;
  openReports: number; pendingRefunds: number;
}
export interface Paginated<T> { items: T[]; total: number; page?: number; limit?: number }
export const PLAY_PRODUCTS = ['event_ticket_99', 'event_ticket_199', 'event_ticket_249', 'event_ticket_499'] as const;
export const CHAT_PASS_PRODUCT = 'chat_pass_monthly';
export const formatInr = (paise: number) => (paise === 0 ? 'Free' : `₹${(paise / 100).toLocaleString('en-IN')}`);
