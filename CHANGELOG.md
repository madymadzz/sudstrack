# SudsTrack Changelog

## Phase 17 (Late Stages)
- **Database Schema Update:** Added is_active boolean column to ccounts table to support banning users.
- **Security Update:** Updated auth middleware and login controllers to reject login attempts from accounts where is_active is false, returning a 403 Forbidden.
- **Admin Dashboard UI Update:**
  - Added "Ban Account" / "Unban Account" and "Remove User" buttons to the Customer cards in dmin.html.
  - Wired action buttons in dmin.js to call the respective backend endpoints via pi.js.
  - Restricted UI visibility of destructive actions to SuperAdmin roles only.
- **Bug Fix:** Fixed a major frontend bug where a duplicate global declaration of statusClass in dmin.js (already defined in pi.js) caused a SyntaxError that broke the admin login event listener, resulting in a native form submission loop.
- **Account Security UI:** Added frontend UI elements in ccount.html for "Change Password" and "Two-Factor Authentication (2FA)". Wired them in ccount.js to securely interact with the backend API.
- **API Client Fix:** Modified js/core/api.js to use http://127.0.0.1:3000/api instead of localhost to align origins and prevent the browser from rejecting httpOnly cookies due to SameSite=Lax policies.
- **Database Connection Fix:** Updated config/db.js and the .env DATABASE_URL to point to the Supabase IPv4 Transaction Pooler (port 6543) instead of the direct IPv6 connection, resolving timeout crashes.

## Phase 16 & Earlier (Summarized)
- **Authentication Infrastructure:** Implemented JWT session handling, Google OAuth integration, password hashing, and brute-force lockouts.
- **Database Schema Creation:** Designed and built the relational schema for accounts, orders, tracking, packages, and logs.
- **API Routing Setup:** Established Express.js backend structure with domain-driven routing and role-based middleware (protect, dminOnly, superAdminOnly).
- **Frontend Refactoring:** Replaced mocked localStorage data arrays with live API calls in pi.js, ccount.js, packages.js, and landing.js.
- **Admin Endpoints:** Created backend controllers for managing stats, orders, customers, and staff.
