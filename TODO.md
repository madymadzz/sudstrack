# SudsTrack Task List

## COMPLETED

- [x] **Backend Infrastructure:** Express server setup, CORS configured, helmet security.
- [x] **Database Integration:** PostgreSQL connection pooling using pg via Supabase IPv4 Pooler.
- [x] **Authentication Core:** JWT token generation, httpOnly cookie delivery, password hashing with cryptjs.
- [x] **Google OAuth:** Integrated passport-google-oauth20 to allow Google sign-in.
- [x] **Security Constraints:** Rate limiting on auth endpoints, account lockouts on 5 failed attempts, active/banned status tracking.
- [x] **2FA Architecture:** Backend TOTP generation via speakeasy, QR generation, and frontend UI in ccount.html.
- [x] **Password Reset:** Nodemailer integration for secure token-based password resets.
- [x] **Admin Foundation:** Protected routes with dminOnly and superAdminOnly middleware.
- [x] **Customer Management:** SuperAdmin capability to view, edit, ban, and remove customers.
- [x] **Frontend API Layer:** Created js/core/api.js to manage all etch requests and credential handling.
- [x] **Dynamic Packages:** Updated frontend to fetch available laundry packages from the live database.

## IN PROGRESS

- [/] **Order Flow Integration:** Backend endpoints exist (/api/orders), but the frontend UI for the cart/booking flow needs to be fully tested and verified against the live API.

## NOT STARTED

- [ ] **Deployment Prep (Phase 18):** Preparing environment variables, build scripts, and CORS origins for Vercel/Render.
- [ ] **Production Deployment:** Pushing backend to Render and frontend to Vercel.
- [ ] **End-to-End Production Testing:** Verifying cookies and OAuth callbacks function correctly over HTTPS in production.

## KNOWN BUGS

- [ ] None currently identified. Monitor frontend API calls for any lingering hardcoded localhost strings causing cross-site cookie drops.

## NEXT RECOMMENDED TASKS

1. Audit the frontend booking flow (cart/checkout) to ensure it correctly hits POST /api/orders/book with the right payload.
2. Review the Order Tracking UI to ensure it properly fetches and displays data from GET /api/orders/my.
3. Proceed with Phase 18: Generate production configuration files (ercel.json, ender.yaml) and update .env strategies for deployment.
