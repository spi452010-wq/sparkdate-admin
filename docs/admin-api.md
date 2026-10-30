# SparkDate Admin Panel: API contract used

Source of truth: `docs/api/AUTH_PROFILE_MEDIA.md` and `services/api`. Base `/api/v1`. Errors `{ error: { code, message, details? } }`.
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
`GET /admin/stats` → `{ totalUsers, pendingVerifications, publishedEvents, liveEvents, openReports, pendingRefunds }` (last two 0 until Sprints 2/4; shown as "Soon"). Hosts don't call it.

## 4. Events ✅ (admin, host; hosts only their own)
| GET | /admin/events?status= | `{ items, total }` |
| GET | /admin/events/{id} | Event |
| POST | /admin/events | EventInput → 201 |
| PATCH | /admin/events/{id} | partial EventInput (publish sends `{ status: "published" }`) |
| GET | /admin/events/{id}/bookings | `{ items, total }` |

Event `{ id, title, description, startsAt, endsAt?, roundMinutes, priceInPaise, playProductId|null, status, capacity{male,female}, booked{male,female} }`.
Rules mirrored in the form: total capacity ≤ 300, `playProductId` required when `priceInPaise > 0` (e.g. `event_ticket_199`), start in the future on create.
Errors: 409 `CAPACITY_BELOW_BOOKED`, 409 `EVENT_LOCKED` (live/ended: no Edit button), 409 `INVALID_STATUS_TRANSITION`, 404 for another host's event.

## 5. Reports ⏳ (Sprint 2)
Planned: `GET /admin/reports?status=`, `POST /admin/reports/{id}/resolve { action: dismiss|block_user }`.

## 6. Refund requests ⏳ (Sprint 4, Google Play)
Planned: `GET /admin/refunds?status=`, `POST /admin/refunds/{id}/approve` (backend issues the Play refund) and `/reject`.

## 7. Google Play purchases ⏳ (Sprint 4, read-only)
Planned: `GET /admin/payments?q=` → items with `orderId, productId (event_ticket_199, chat_pass_monthly…), purchaseState, amountInPaise`.
