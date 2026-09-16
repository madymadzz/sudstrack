# SudsTrack — System Documentation Report

**Version:** 1.0 — Reverse-Engineered from Source Code
**Date:** 2026-09-16
**Project URL:** Deployed on Vercel (auto-redeploy from GitHub `main`)

---

## 1. Files Inspected

| Location | Files |
|---|---|
| `backend/server.js` | Entry point, route mounting, middleware |
| `backend/routes/` | 14 route files (auth, account, orders, admin, riders, packages, promotions, weather, feedback, chat, staffChat, notifications, contact, settings) |
| `backend/controllers/` | 15 controllers |
| `backend/middleware/` | auth.js (JWT protect), adminOnly.js, superAdminOnly.js, errorHandler.js |
| `backend/services/` | googleOAuth, mapsService, smsService, weatherService, qrService, emailService, apiLogger, auditService |
| `backend/config/constants.js` | Order statuses, roles, load sizes, shop coords |
| `backend/init_db.js` | Migration scripts |
| `pages/user/` | account.html, booking.html, packages.html, contact.html |
| `pages/admin/admin.html` | Unified single-page admin dashboard |
| `pages/auth/` | login.html, registration.html, complete-profile.html |
| `js/pages/` | account.js, admin.js, booking.js, landing.js, login.js, packages.js, registration.js |
| `backend/` | Live Supabase (PostgreSQL) schema (queried directly) |

---

## 2. Actual System Architecture

SudsTrack is a **laundry pickup and delivery booking system** with:

- **Frontend:** Static HTML/CSS/JS, deployed on Vercel
- **Backend:** Node.js + Express REST API, also deployed on Vercel (serverless)
- **Database:** PostgreSQL on Supabase (cloud-hosted, connected via connection pooler)
- **Auth:** JWT stored in `httpOnly` cookies (`sudstrack_token`); Google OAuth 2.0 via Passport.js; TOTP-based 2FA using authenticator apps

### Three User Roles

| Role | Access |
|---|---|
| **Customer** | Browse, book, track orders, feedback, profile |
| **Staff** | All of the above + view/update orders, assign riders |
| **SuperAdmin** | All of the above + manage staff, packages, customers, platform settings, audit logs |

---

## 3. Flowchart Summary

**File:** `docs/diagrams/flowchart/system-flowchart.mmd`

The flowchart covers:
1. **Authentication paths:** Local login (with lockout), Google OAuth, 2FA TOTP, registration, and password reset via email
2. **Customer booking journey:** Package selection → 4-step booking wizard (details, payment, review, confirmation) with weather check and SMS notification
3. **Order lifecycle:** Admin updates status through the 7-step pipeline (Received → Washing → Drying → Ready for Delivery → Out for Delivery → Completed / Cancelled)
4. **Rider tracking:** Only visible when status is "Out for Delivery"; pulls route from Google Maps Directions API
5. **Admin management:** All staff/admin CRUD operations for orders, customers, riders, packages, promotions, audit/security logs

---

## 4. ERD Summary

**File:** `docs/diagrams/erd/sudstrack-erd.mmd`

### Core Tables

| Table | Purpose | Key Relationships |
|---|---|---|
| `accounts` | All users (Customer, Staff, SuperAdmin) | FK source for most tables |
| `packages` | Laundry service package catalogue | Referenced by `orders.package_ids` array |
| `orders` | Central order record | FK to accounts, riders |
| `payments` | Payment record per order | 1:1 with orders |
| `riders` | Rider pool (admin-managed) | Referenced by orders |
| `order_tracking` | Rider assignment snapshot + delivery status | 1:1 with orders |

### Auth Tables

| Table | Purpose |
|---|---|
| `sessions` | JWT session log |
| `password_reset_tokens` | Reset code storage |
| `security_logs` | Login failures, lockouts |

### Notification Tables

| Table | Purpose |
|---|---|
| `notifications` | Customer-facing notifications |
| `admin_notifications` | Staff/admin-facing notifications |
| `chat_messages` | Customer ↔ Staff live chat |
| `staff_messages` | Internal staff-only chat |

### System Tables

| Table | Purpose |
|---|---|
| `promotions` | Landing page promotions (admin-managed) |
| `admin_logs` | Admin action audit trail |
| `api_logs` | External API call log (all APIs) |
| `platform_settings` | Key-value config store |
| `weather_checks` | Weather check records per pickup date |

### ⚠️ Schema Transition Note

The `orders` table has **both** `package_id` (INTEGER, legacy, now nullable) and `package_ids` (INTEGER ARRAY, new). New orders use `package_ids`. Old orders still reference `package_id`. This is a **dual-column transition** — the old FK constraint on `package_id → packages.package_id` still exists but is no longer enforced for new writes.

---

## 5. DFD Summary

### Level 0 (Context Diagram)
**File:** `docs/diagrams/dfd/dfd-level-0.mmd`

Shows SudsTrack as a single system with 8 external entities:
- **Customer** — provides booking/profile data, receives confirmations and tracking
- **Staff/SuperAdmin** — provides management inputs, receives dashboards/logs
- **Google OAuth** — bidirectional: token exchange + profile retrieval
- **Semaphore SMS** — outbound SMS for order events and password reset
- **OpenWeatherMap** — outbound forecast query, inbound warning flag
- **Google Maps** — outbound route request, inbound distance/ETA/polyline
- **QRServer** — outbound order code, inbound QR image URL *(used in backend, but QR is no longer shown to customers on the UI)*
- **Gmail SMTP** — outbound email for password reset codes

### Level 1 (Process Breakdown)
**File:** `docs/diagrams/dfd/dfd-level-1.mmd`

| Process | Description |
|---|---|
| **1.0 User & Auth Management** | Registration, login (local + Google), 2FA, password reset, session logging |
| **2.0 Booking Management** | 4-step booking wizard, weather check, order + payment insertion, SMS trigger |
| **3.0 Order Management** | View/save orders, status updates, rider assignment, feedback, notifications |
| **4.0 Rider & Delivery Tracking** | Rider CRUD, tracking panel, Google Maps route request |
| **5.0 Payment Processing** | Payment record creation, simulated online payment |
| **6.0 Notification & Communication** | Customer + admin notifications, customer-staff chat, staff internal chat |
| **7.0 Admin & System Management** | Customer/staff/package/promo management, analytics, logs, settings |
| **8.0 External API Orchestration** | Centralized gateway for all 4 external API calls with retry logic and API log recording |

---

## 6. External APIs / Services

| API | Provider | Usage | Auth | Status |
|---|---|---|---|---|
| **Google OAuth 2.0** | Google | Login with Google | OAuth Client ID/Secret | ✅ Active |
| **Google Maps Directions API** | Google | Rider tracking route | API Key (`GOOGLE_MAPS_API_KEY`) | ✅ Active |
| **Google Maps Geocoding API** | Google | Address → coordinates | Same key | ✅ Active |
| **OpenWeatherMap** | OpenWeather | Weather warning on booking | API Key (`OPENWEATHER_API_KEY`) | ✅ Active |
| **Semaphore SMS** | Semaphore (PH) | SMS for order events & password reset | API Key (`SEMAPHORE_API_KEY`) | ⚠️ Stub mode if key is placeholder |
| **QRServer** | api.qrserver.com | Generate QR code URLs | No key needed | ✅ Active (but QR hidden from UI) |
| **Nominatim** | OpenStreetMap | Reverse geocoding (drag map pin) | No key needed (public) | ✅ Active (frontend only) |
| **Gmail SMTP** | Nodemailer + Gmail | Password reset email | Gmail app password | ✅ Active |
| **Vercel** | Vercel | Hosting + CI/CD | GitHub integration | ✅ Active |
| **Supabase** | Supabase | PostgreSQL DB + pooler | `DATABASE_URL` env var | ✅ Active |

---

## 7. Implementation–Documentation Discrepancies

### DISCREPANCY 1 — Dual `package_id` / `package_ids` Columns
| Aspect | Detail |
|---|---|
| **Frontend sends** | `package_ids` (array) since the latest fix |
| **Backend expects** | `package_ids` array |
| **Database contains** | Both `package_id` (legacy FK, nullable) AND `package_ids` (array) |
| **Diagram represents** | Both columns annotated with a note |
| **Incomplete?** | The old `package_id` column and its FK constraint should eventually be dropped via a migration |

### DISCREPANCY 2 — QR Codes (Generated but Not Displayed to Customers)
| Aspect | Detail |
|---|---|
| **Backend generates** | QR code URL via `qrService.js` and stores in `order_tracking.claim_qr_code` |
| **Frontend shows** | QR code removed from booking success screen and order detail view (per user request) |
| **Diagram represents** | QR service noted as active in the API list but UI-hidden |

### DISCREPANCY 3 — Online Payment is a Simulation
| Aspect | Detail |
|---|---|
| **UI shows** | "Simulate Payment" modal button |
| **Backend does** | Sets `payment_status = 'Paid'` if `payment_status = 'Paid'` is passed in |
| **No real payment gateway** | No Stripe, PayMongo, or any real payment API is integrated |
| **Diagram represents** | Marked as simulation, not a real external payment provider |

### DISCREPANCY 4 — SMS Service is Stub Mode by Default
| Aspect | Detail |
|---|---|
| **Code behavior** | If `SEMAPHORE_API_KEY` is missing or `"placeholder"`, SMS is only logged to console |
| **Production behavior** | Depends on whether a real API key is set in Vercel env vars |
| **Diagram represents** | Shown as external API but noted as potentially stub |

### DISCREPANCY 5 — `chat_messages.room_id` FK
| Aspect | Detail |
|---|---|
| **Database FK** | `chat_messages.room_id → accounts.account_id` (room = customer account) |
| **Expected** | A proper `chat_rooms` table is semantically implied but does not exist |
| **Diagram represents** | Reflects actual FK to accounts as-is |

### DISCREPANCY 6 — `admin_logs` `admin_id` Has No Active FK
| Aspect | Detail |
|---|---|
| **Database** | `admin_logs.admin_id → accounts.account_id` defined in `init_db.js` but writes occur across different code paths |
| **Status** | Partially used; `auditService.js` is a thin wrapper |

---

## 8. Confidence / Missing Information

| Item | Confidence | Notes |
|---|---|---|
| All database tables and columns | ✅ HIGH | Queried directly from live Supabase DB |
| All API routes | ✅ HIGH | Read all route files |
| Auth flow (JWT, 2FA, Google, lockout) | ✅ HIGH | Full authController read |
| Order lifecycle statuses | ✅ HIGH | Confirmed in constants.js |
| SMS delivery in production | ⚠️ NOT VERIFIED | Depends on whether `SEMAPHORE_API_KEY` is set in Vercel |
| Email delivery in production | ⚠️ NOT VERIFIED | Depends on Gmail app password in env vars |
| Google Maps API live usage | ✅ HIGH | Confirmed in mapsService.js |
| Real-time WebSocket/Socket.io | ✅ NOT PRESENT | Chat is polled via REST, no WebSocket |
| Rider live GPS tracking | ✅ NOT PRESENT | Location is simulated from shop coordinates, not real GPS |
