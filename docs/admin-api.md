# SparkDate Admin Panel: API contract used

Source of truth: `docs/api/AUTH_PROFILE_MEDIA.md`, `docs/api/SPRINT2_API.md` and `services/api` (sparkdate-api repo). Base `/api/v1`. Errors `{ error: { code, message, details? } }`.
Legend: ✅ live in backend · ⏳ not yet (panel shows "coming soon" on the real API; mock only).

## 1. Admin web session ✅
| Method | Path | Notes |
|---|---|---|
| POST | /admin/auth/login | `{ email, password }` → `{ id, email, role, fullName? }`; sets httpOnly `sd_at` (15 min), httpOnly `sd_rt`, readable `csrf_token` |
| GET | /admin/auth/me | user; rotates `sd_at` from `sd_rt`; 401 → login page |
| POST | /admin/auth/logout | 204, clears cookies |

Unsafe methods send `X-CSRF-Token` (= `csrf_token`), else 403 `CSRF_INVALID`. Login errors: 401 `INVALID_CREDENTIALS`, 403 `ACCOUNT_BLOCKED`/`FORBIDDEN`, 429 `TOO_MANY_ATTEMPTS` (IP), 429 `ACCOUNT_LOCKED` (5 wrong passwords, 15 min). Any other request that gets 401 triggers one `/admin/auth/me` refresh + retry.

## 2. Users & verification ✅ (admin)
| GET | /admin/users?q=&verification=&status=&page=&limit=100 | `{ items, page, limit, total }`; item `id, phone, email, role, status, profile{fullName, gender, interestedIn, city, photos:[{key,order,url}]}, verification{status,reason?}, selfieUrl?` |
| POST | /admin/users/{id}/verification | `{ decision: approved|rejected, reason? }` |
| POST | /admin/users/{id}/status | `{ status: active|blocked }` |

`selfieUrl` is signed for 5 min (photos 15 min) and used directly in `<img>`. The list refetches every 4 min and on image `error`.

## 3. Dashboard ✅ (admin)
`GET /admin/stats` → `{ totalUsers, pendingVerifications, publishedEvents, liveEvents, openReports, pendingRefunds }` (`openReports` is 0 until a reports API exists, shown as "Soon"; `pendingRefunds` is live). Hosts don't call it.

## 4. Events ✅ (admin, host; hosts only their own)
| GET | /admin/events?status= | `{ items, total }` |
| GET | /admin/events/{id} | Event |
| POST | /admin/events | EventInput → 201 |
| PATCH | /admin/events/{id} | partial EventInput (publish sends `{ status: "published" }`) |
| GET | /admin/events/{id}/bookings | `{ items, total }` |

Event `{ id, title, city, description, startsAt, endsAt?, roundMinutes, priceInPaise, playProductId|null, status, capacity{male,female}, booked{male,female} }`.
Rules mirrored in the form: total capacity ≤ 300, `playProductId` required when `priceInPaise > 0` (e.g. `event_ticket_199`), start in the future on create. **`city` is required by the panel** (trimmed, 1-60 chars; architect decision, cards show e.g. "Indore • Virtual") and is sent on create and every PATCH from the edit form. Backend (sparkdate-api 7cb3b24+): `POST` requires `city` (1-60); on `PATCH` it is optional but `""`/whitespace/`null` return 400. Older events may have no city; the panel shows "Not set (edit to add)".
| POST | /admin/events/{id}/cancel | admin only → `{ id, status, summary: { cancelledPending, cancelledFree, refunded, refundFailed } }`; safe to re-run; failed refunds retried by the server |

Errors: 409 `USE_CANCEL_ENDPOINT` (PATCH to cancelled when bookings exist), 409 `CAPACITY_BELOW_BOOKED`, 409 `EVENT_LOCKED` (live/ended: no Edit button), 409 `INVALID_STATUS_TRANSITION`, 404 for another host's event.

## 5. Reports ⏳ (no admin API yet)
Planned: `GET /admin/reports?status=`, `POST /admin/reports/{id}/resolve { action: dismiss|block_user }`. Real API: "Coming soon".

## 6. Refunds ✅ (admin only; Google Play)
| GET | /admin/refunds?status=requested\|processing\|processed\|rejected\|failed&q=&page=&limit=100 | `{ items, page, limit, total }` |
| POST | /admin/refunds/{bookingId}/approve | calls Play `orders.refund`; → item with `refund.status: processed` (or 503 `PLAY_UNAVAILABLE`, refund then `failed`, can be retried) |
| POST | /admin/refunds/{bookingId}/reject | `{ reason }` (3-300 chars, final) → item with `refund.status: rejected` |

Item: `{ bookingId, status (booking), refund: { status, reason?, requestedAt?, decidedAt?, rejectReason?, playOrderId?, auto? }, amountInPaise, playOrderId?, user: { id, fullName|null, phone|null }, event: { id, title?, startsAt? } }`.
Approve/reject are allowed when booking `status = refund_requested` and `refund.status` is `requested` or `failed`; otherwise 409 `REFUND_NOT_PENDING`. Also 409 `PAYMENT_NOT_FOUND`.

## 7. Google Play payments ✅ (admin only, read-only)
`GET /admin/payments?status=verified|refunded|refund_failed|voided&userId=&eventId=&q=&page=&limit=100` → `{ items, page, limit, total }`; item `{ id, userId, user: { id, fullName|null, phone|null }, bookingId|null, kind: ticket|chat_pass, productId, orderId?, amountInPaise, status, acknowledged, createdAt, refundedAt? }`. `purchaseToken` is never returned.

### Search, filters and URL state (refunds and payments)
- `q`: 1-80 chars after trim; case-insensitive plain-text match on the user's **name, phone or email** (not order/product ID); at most 200 matching users. The panel debounces typing (300 ms) and keeps it in the URL (`?q=`), like Users/Events.
- Payments `eventId` (ObjectId, else 400): payments whose booking belongs to that event; chosen from an Event dropdown (`?eventId=`). `userId` (`?userId=`) is kept as a URL-only filter with a "Clear user filter" button.
- Refunds `?status=` defaults to `requested`; `?status=all` shows every status.
- `user.fullName`/`phone` are read live from users and are `null` when the user was deleted; the panel then shows the user ID and "-".

## Idempotency
`Idempotency-Key` is required only on app routes (`POST /bookings`, `/payments/play/verify`, `/bookings/:id/refund-request`). Admin POSTs use CSRF only, so the panel doesn't send it.

## Known contract gaps
- No admin reports API yet (`openReports` in stats is always 0).
- `q` does not match Play order IDs or product IDs, only user name/phone/email.
