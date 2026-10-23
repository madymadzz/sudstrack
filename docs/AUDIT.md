# SudsTrack Codebase Audit Report

*Generated: October 23, 2026 | Read-Only Comprehensive Architecture & Readiness Audit*  
*Target Environment: Node.js, Express, PostgreSQL (Supabase), Vanilla JS/HTML/CSS*  
*Repository: `https://github.com/madymadzz/sudstrack.git` (Branch: `main`)*

---

## 1. Stack Summary

| Layer | Technology | Details / Versions |
|---|---|---|
| **Frontend Runtime** | Vanilla ES6+ JavaScript | Zero-build, standard browser DOM APIs, Async/Await, Fetch API. |
| **Markup & Layout** | Semantic HTML5 & CSS3 | Multi-page architecture (10 HTML view documents), custom CSS variables, Flexbox, CSS Grid. |
| **Frontend Libraries (CDN)**| Phosphor Icons, Leaflet.js, Chart.js, html5-qrcode, Google Fonts | Phosphor Icons (`@phosphor-icons/web`), Leaflet (`1.9.4` for location pinning), Chart.js (`4.4.0` for analytics), html5-qrcode (`2.3.8` for scanner), Fonts (*Baloo 2*, *Nunito*, *IBM Plex Mono*). |
| **Backend Runtime** | Node.js | `>=18.x` (ES6 CommonJS module system). |
| **Backend Framework** | Express.js | `v4.19.2` (`backend/package.json:19`). |
| **Database** | PostgreSQL | Hosted on Supabase, connected through `pg` (`v8.12.0`) pooler with SSL (`rejectUnauthorized: false`). |
| **Package Manager** | `npm` | Primary lockfile: `backend/package-lock.json`. Root `package.json` contains startup scripts only. |
| **Startup / Entry Points** | `node backend/server.js` | Root script: `npm start` or `npm run dev` (runs `cd backend && nodemon server.js`). Backend script: `npm start` (runs `node server.js`). Windows script: `backend/start.bat`. |
| **Hosting & Deploy** | Vercel Serverless | Configured via `vercel.json` routing all requests to `backend/server.js`. In production, Express serves root static files directly (`backend/server.js:99-105`). |
| **Ports & Origins** | Port `3000` | Default listening port: `3000` (`http://localhost:3000` or `http://127.0.0.1:3000`). CORS allows `FRONTEND_URL`, `http://localhost:5500`, `http://127.0.0.1:5500`, `http://localhost:3000`, `http://127.0.0.1:3000` (`backend/server.js:43-59`). |

### Backend Dependencies (`backend/package.json`)
```json
{
  "axios": "^1.7.2",
  "bcryptjs": "^2.4.3",
  "cookie-parser": "^1.4.6",
  "cors": "^2.8.5",
  "dotenv": "^16.4.5",
  "express": "^4.19.2",
  "express-rate-limit": "^7.3.1",
  "express-validator": "^7.1.0",
  "helmet": "^7.1.0",
  "jsonwebtoken": "^9.0.2",
  "morgan": "^1.10.0",
  "nodemailer": "^6.9.14",
  "passport": "^0.7.0",
  "passport-google-oauth20": "^2.0.0",
  "pg": "^8.12.0",
  "qrcode": "^1.5.4",
  "speakeasy": "^2.0.0",
  "uuid": "^10.0.0"
}
```
*Dev Dependencies:* `nodemon: ^3.1.4`

---

## 2. Project Map (Annotated)

### Expected vs. Actual Structure Comparison

```
Expected Structure                    Actual Structure                     Status & Discrepancies
──────────────────────────────────────────────────────────────────────────────────────────────────
index.html                            index.html                           MATCH (Root landing page)
pages/                                pages/                               
  auth/                                 auth/                              
    login.html                            login.html                       MATCH
    registration.html                     registration.html                MATCH
                                          complete-profile.html            EXTRA (Post-Google OAuth password setup)
  user/                                 user/                              
    account.html                          account.html                     MATCH
    booking.html                          booking.html                     MATCH
    packages.html                         packages.html                    MATCH
                                          orders.html                      EXTRA (Order history & live tracking page)
                                          contact.html                     EXTRA (Contact form & FAQ page)
  admin/                                admin/                             
                                          admin.html                       MATCH (Unified admin dashboard)
css/                                  css/                                 
  components/                           (none)                             MISSING: Component CSS is mixed into page CSS
  pages/                                pages/                             MATCH (7 CSS stylesheets)
js/                                   js/                                  
  core/                                 core/                              MATCH (api.js)
  components/                           components/                        MATCH (footer.js only)
  pages/                                pages/                             MATCH (8 page-specific controller scripts)
assets/                               assets/                              
  images/                               images/                            MATCH (logo.png)
  icons/                                icons/                             EMPTY: Vector icons loaded via Phosphor CDN
  fonts/                                fonts/                             EMPTY: Webfonts loaded via Google Fonts CDN
backend/                              backend/                             
  config/                               config/                            MATCH (constants.js, db.js)
  routes/                               routes/                            MATCH (14 route handlers)
  controllers/                          controllers/                       MATCH (15 controller modules)
  models/                               (none)                             MISSING: No ORM/models; raw SQL in controllers
  middleware/                           middleware/                        MATCH (adminOnly, auth, errorHandler, superAdminOnly)
  services/                             services/                          MATCH (8 service integration modules)
  (none)                                db/                                EXTRA: schema.sql, seed.sql, runMigration.js
  (none)                                (loose scripts)                    EXTRA: 8 loose migration/patch scripts in backend root
(none)                                temp_scripts/                        EXTRA: 220 ad-hoc python/js/sql scripts in root
(none)                                audit_output/                        EXTRA: 17 documentation/report files in root
(none)                                scratch/                             EXTRA: Development test scripts in root
(none)                                fix_html.py, fix_sticky.py           EXTRA: Loose maintenance scripts in root
```

### Complete Annotated File Map

```
Sudstrack/
├── .gitignore                          # Ignores node_modules, .env, *.log, dist, .vercel, temp_scripts
├── fix_html.py                         # Maintenance regex script patching admin.css cache busters
├── fix_sticky.py                       # Maintenance regex script commenting out sticky CSS rules
├── index.html                          # Landing page (hero, cards, active promo banners, chat widget)
├── package.json                        # Root npm script wrapper (npm start, npm run dev)
├── PROJECT_MEMORY.md                   # System memory archive generated during codebase scan
├── vercel.json                         # Vercel deployment routes and serverless bundle config
├── assets/
│   ├── fonts/                          # Empty directory (Google Fonts CDN used instead)
│   ├── icons/                          # Empty directory (Phosphor Icons CDN used instead)
│   └── images/
│       └── logo.png                    # Brand logo graphic (273 KB)
├── audit_output/                       # Generated audit reports and architecture diagrams
│   ├── architecture.mmd / .png / .svg  # Architectural flowcharts
│   ├── AUDIT_REPORT.md                 # Prior audit document from Oct 14, 2026
│   ├── DEV_TOOLS.md                    # Technical tooling inventory
│   ├── INVENTORY.md                    # Detailed line-by-line file breakdown
│   └── *.json / *.py                   # Automated audit scripts and metrics
├── backend/                            # Express.js REST API
│   ├── .env                            # Active environment configuration containing secret keys (untracked)
│   ├── .env.example                    # Blueprint template of all required environment variables
│   ├── .gitignore                      # Backend ignore rules (node_modules, .env, *.log)
│   ├── alter_packages.js               # Standalone DDL script adding turnaround_time column
│   ├── fix_db.js                       # SQL script updating missing paid_at timestamps
│   ├── fix_paid_at.js                  # Duplicate utility updating paid_at timestamps
│   ├── init_db.js                      # DDL script creating notifications, promotions, admin_logs
│   ├── migrate_notifications.js        # DDL script creating admin_notifications table
│   ├── migrate_riders.js               # DDL script creating riders table & altering orders
│   ├── migrate_staff_chat.js           # DDL script creating staff_messages table
│   ├── migrate_tokens.js               # DDL script creating password_reset_tokens table
│   ├── package.json                    # Backend dependencies, engine constraints, and scripts
│   ├── package-lock.json               # Deterministic dependency tree
│   ├── seed.js                         # Database seed populating demo SuperAdmin & Staff accounts
│   ├── server.js                       # Express app bootstrap, middleware, CORS, routes & static serving
│   ├── start.bat                       # Windows batch launcher (node server.js)
│   ├── test_revenue.js                 # Test script validating 7-day revenue SQL queries
│   ├── config/
│   │   ├── constants.js                # System constants (statuses, roles, load sizes, shop coords)
│   │   └── db.js                       # PostgreSQL pg.Pool initialization with SSL for Supabase
│   ├── controllers/
│   │   ├── accountController.js        # Profile edits, password changes, 2FA setup/disable, base64 avatars
│   │   ├── adminController.js          # Admin stats, order status transitions, staff/customer CRUD, analytics
│   │   ├── authController.js           # Register, login, 2FA verification, password reset, Google SSO
│   │   ├── chatController.js           # Customer-to-Staff live support chat rooms and messages
│   │   ├── contactController.js        # Contact inquiry dispatch via Gmail SMTP Nodemailer
│   │   ├── feedbackController.js       # Customer ratings & reviews submission/listing
│   │   ├── notificationController.js   # Customer in-app notification queries & read status
│   │   ├── notificationsController.js  # Staff/Admin in-app notification queries & read status
│   │   ├── ordersController.js         # Order creation, order history, stars, QR codes, map tracking
│   │   ├── packagesController.js       # Laundry package catalog queries
│   │   ├── promoController.js          # Promotional banner CRUD & public active display
│   │   ├── ridersController.js         # Courier management, auto-assignment & dispatch lifecycle
│   │   ├── settingsController.js       # Key-value store for store hours, contact info, maintenance mode
│   │   ├── staffChatController.js      # Internal staff communication with @mentions
│   │   └── weatherController.js        # OpenWeatherMap forecast querying for rain warnings
│   ├── db/
│   │   ├── runMigration.js             # Migration runner executing schema.sql and seed.sql
│   │   ├── schema.sql                  # Main PostgreSQL DDL schema definition
│   │   └── seed.sql                    # Initial seed data for accounts and packages
│   ├── middleware/
│   │   ├── adminOnly.js                # Restricts route access to Staff and SuperAdmin roles
│   │   ├── auth.js                     # Verifies JWT httpOnly cookie (`protect`) & role checks (`requireRole`)
│   │   ├── errorHandler.js             # Global Express error handler with Postgres error translation
│   │   └── superAdminOnly.js           # Restricts route access strictly to SuperAdmin role
│   ├── routes/
│   │   ├── account.js                  # `/api/account` (profile, password, 2FA, avatar, notifications)
│   │   ├── admin.js                    # `/api/admin` (orders, customers, staff, logs, analytics, packages)
│   │   ├── auth.js                     # `/api/auth` (register, login, 2FA verify, password reset, Google SSO)
│   │   ├── chat.js                     # `/api/chat` (live support chat endpoints)
│   │   ├── contact.js                  # `/api/contact` (contact form submission with rate limiting)
│   │   ├── feedback.js                 # `/api/feedback` (review submission & admin review list)
│   │   ├── notifications.js            # `/api/notifications` (staff notifications)
│   │   ├── orders.js                   # `/api/orders` (booking, user orders, starred, QR, tracking)
│   │   ├── packages.js                 # `/api/packages` (laundry packages catalog)
│   │   ├── promotions.js               # `/api/promotions` (promotional banner management)
│   │   ├── riders.js                   # `/api/riders` (courier driver endpoints)
│   │   ├── settings.js                 # `/api/settings` (platform configuration key-value store)
│   │   ├── staffChat.js                # `/api/staff-chat` (internal staff messaging)
│   │   └── weather.js                  # `/api/weather` (pickup date rain forecast checking)
│   ├── services/
│   │   ├── apiLogger.js                # Logs external API failures & metrics to `api_logs`
│   │   ├── auditService.js             # Logs administrative actions to `admin_logs`
│   │   ├── emailService.js             # Nodemailer Gmail SMTP transport for password resets & 2FA
│   │   ├── googleOAuth.js              # Passport.js Google OAuth 2.0 strategy setup
│   │   ├── mapsService.js              # Google Maps Directions & Geocoding API route generator
│   │   ├── qrService.js                # QR code image generator via api.qrserver.com
│   │   ├── smsService.js               # Semaphore Philippine SMS gateway (in stub mode)
│   │   └── weatherService.js           # OpenWeatherMap 5-day forecast checker
│   └── utils/
│       ├── orderCodeUtils.js           # Generates 4-char hex order codes (`#SD-XXXX`)
│       ├── passwordUtils.js            # Bcrypt hashing and password comparison
│       ├── responseUtils.js            # Standardized `{ success, message, data }` response formatters
│       └── tokenUtils.js               # JWT signing, cookie setting (`setTokenCookie`), and clearing
├── css/pages/
│   ├── account.css                     # Profile settings, avatar wrapper, and security card styles
│   ├── admin.css                       # Staff layout, sidebar drawer, stat cards, chat UI, scanner
│   ├── booking.css                     # 4-step booking wizard, Leaflet map box, payment cards, review stub
│   ├── landing.css                     # Global reset, typography, header, hero, footer, and navbar styles
│   ├── login.css                       # Auth card, field validation, and modal styles
│   ├── packages.css                    # Package cards, load size selector, and cart drawer modal
│   └── registration.css                # Signup layout and dynamic password strength checklist
├── js/
│   ├── components/
│   │   └── footer.js                   # Injected footer HTML via document.write
│   ├── core/
│   │   └── api.js                      # Core fetch wrapper, API namespaces, session helpers & toasts
│   └── pages/
│       ├── account.js                  # Profile management, password change, 2FA setup controller
│       ├── admin.js                    # Admin dashboard logic, tab switching, orders, staff chat, analytics
│       ├── booking.js                  # Booking wizard, Leaflet map pinning, weather checker, mock payment
│       ├── landing.js                  # Public promo loader, customer chat widget, dynamic navbar updater
│       ├── login.js                    # Login form handler, 2FA code modal, 3-step password reset wizard
│       ├── orders.js                   # Customer order history, status filter, star toggles, maps embed
│       ├── packages.js                 # Package catalog loader, localStorage cart manager
│       └── registration.js             # Registration form validation & account creation
├── pages/
│   ├── admin/
│   │   └── admin.html                  # Full staff/superadmin operations console
│   ├── auth/
│   │   ├── complete-profile.html       # Post-Google SSO password creation page
│   │   ├── login.html                  # Login interface with 2FA & forgot password modals
│   │   └── registration.html           # Public customer registration interface
│   └── user/
│       ├── account.html                # Customer profile, contact info, and 2FA configuration
│       ├── booking.html                # Multi-step laundry booking checkout with interactive map
│       ├── contact.html                # Contact form and FAQ accordion
│       ├── orders.html                 # Customer order tracker, claim stub, and rider map
│       └── packages.html               # Service catalog and multi-load cart selection
├── scratch/                            # Ad-hoc test scripts (check.js, check2.js, account_fix.js)
└── temp_scripts/                       # 220 historical migration/regex/cleanup scripts in root
```

---

## 3. Auth & Navbar Findings

### Authentication Architecture (Frontend & Backend)

#### Registration Flow
1. **Frontend:** Handled in [`pages/auth/registration.html`](file:///c:/Users/moham/Desktop/Sudstrack/pages/auth/registration.html) and [`js/pages/registration.js:34-65`](file:///c:/Users/moham/Desktop/Sudstrack/js/pages/registration.js#L34-L65). Collects `fullName`, `email`, `password`, `confirmPassword`. Validates that password length $\ge 6$ and passwords match. Submits to `POST /api/auth/register` via `Auth.register()` in [`js/core/api.js:48-53`](file:///c:/Users/moham/Desktop/Sudstrack/js/core/api.js#L48-L53).
2. **Backend:** Handled in [`backend/controllers/authController.js:26-63`](file:///c:/Users/moham/Desktop/Sudstrack/backend/controllers/authController.js#L26-L63).
   - Validates required fields and password length $\ge 6$.
   - Normalizes email to lowercase. Checks for existing email in `accounts` table.
   - Hashes password using bcrypt (12 rounds) via [`backend/utils/passwordUtils.js:8-10`](file:///c:/Users/moham/Desktop/Sudstrack/backend/utils/passwordUtils.js#L8-L10).
   - Inserts record into `accounts` (`role = 'Customer'`, `auth_provider = 'Local'`).
   - Signs JWT containing `{ accountId, role }` via [`backend/utils/tokenUtils.js:6-12`](file:///c:/Users/moham/Desktop/Sudstrack/backend/utils/tokenUtils.js#L6-L12).
   - Sets `sudstrack_token` httpOnly cookie via [`backend/utils/tokenUtils.js:24-32`](file:///c:/Users/moham/Desktop/Sudstrack/backend/utils/tokenUtils.js#L24-L32).
   - Returns HTTP 201 with user profile data.

#### Login Flow
1. **Frontend:** Handled in [`pages/auth/login.html`](file:///c:/Users/moham/Desktop/Sudstrack/pages/auth/login.html) and [`js/pages/login.js:77-117`](file:///c:/Users/moham/Desktop/Sudstrack/js/pages/login.js#L77-L117). Submits credentials to `POST /api/auth/login`.
2. **Backend:** Handled in [`backend/controllers/authController.js:67-172`](file:///c:/Users/moham/Desktop/Sudstrack/backend/controllers/authController.js#L67-L172).
   - Checks if user exists and `is_active = TRUE`. Rejects banned/deactivated accounts.
   - Checks lockout window (`accounts.locked_until > NOW()`). Rejects with HTTP 429 if locked.
   - Verifies password with `bcrypt.compare`. On failure, increments `login_attempts`; locks account for 5 minutes (`LOGIN_LOCKOUT_MINUTES`) if attempts reach 5 (`LOGIN_MAX_ATTEMPTS`). Logs failure to `security_logs`.
   - On success, resets `login_attempts = 0` and `locked_until = NULL`.
   - **2FA Branch:** If `two_factor_enabled = TRUE`, does not issue full session cookie. Instead generates a short-lived (5-minute) stateless JWT `{ account_id, role, is_2fa: true }` returned in JSON as `temp_token`.
   - If 2FA disabled, issues `sudstrack_token` httpOnly cookie (7-day expiry) and returns HTTP 200.

#### 2FA Verification Flow
- Handled in [`backend/controllers/authController.js:175-219`](file:///c:/Users/moham/Desktop/Sudstrack/backend/controllers/authController.js#L175-L219).
- Receives `{ temp_token, code }`. Verifies `temp_token` JWT. Fetches `totp_secret` from `accounts`. Verifies code via `speakeasy.totp.verify()`.
- **CRITICAL BUG AT LINE 209:** Executes `global.loginTempTokens.delete(temp_token);`, but `global.loginTempTokens` is undefined. Crashes with `TypeError: Cannot read properties of undefined (reading 'delete')`.

#### Google OAuth 2.0 Flow
- Configured in [`backend/services/googleOAuth.js:6-50`](file:///c:/Users/moham/Desktop/Sudstrack/backend/services/googleOAuth.js#L6-L50). Mounted in [`backend/routes/auth.js:37-65`](file:///c:/Users/moham/Desktop/Sudstrack/backend/routes/auth.js#L37-L65).
- Redirects to Google consent screen. Callback dynamically handles protocol and proxy host, finds or creates account (`auth_provider = 'Google'`), sets session cookie directly, and redirects new users to `complete-profile.html` to establish an optional local password.

#### Session & JWT Architecture
- Token cookie: `sudstrack_token`.
- Flags: `httpOnly: true`, `secure: isProduction`, `sameSite: isProduction ? 'None' : 'Lax'`, `maxAge: 7 days`.
- Middleware: [`backend/middleware/auth.js:9-38`](file:///c:/Users/moham/Desktop/Sudstrack/backend/middleware/auth.js#L9-L38) (`protect`). Extracts cookie, verifies JWT with `process.env.JWT_SECRET`, queries database to verify account still exists and is active, and attaches record to `req.user`.

---

### Navbar Implementation & Duplication Analysis

The navigation bar is **NOT a shared reusable component**. It is manually duplicated with slight variations across all 10 HTML pages in the workspace.

| Page | File Path & Lines | Login / Account Button Markup | Notes & Inconsistencies |
|---|---|---|---|
| **Landing** | [`index.html:22-47`](file:///c:/Users/moham/Desktop/Sudstrack/index.html#L22-L47) | Line 41: `<a class="login-btn" id="navLoginBtn" href="pages/auth/login.html">Login</a>` | Has `#navContactBtn`, `#navLoginBtn`, `#navToggle`, `#navMenu`. |
| **Login** | [`pages/auth/login.html:23-47`](file:///c:/Users/moham/Desktop/Sudstrack/pages/auth/login.html#L23-L47) | Line 41: `<a class="login-btn" href="../user/booking.html">Book laundry</a>` | **INCONSISTENCY:** Missing `id="navLoginBtn"`. Text is "Book laundry" instead of "Login". `landing.js` cannot update this button. |
| **Register** | [`pages/auth/registration.html:23-47`](file:///c:/Users/moham/Desktop/Sudstrack/pages/auth/registration.html#L23-L47) | Line 41: `<a class="login-btn" href="login.html">Login</a>` | **INCONSISTENCY:** Missing `id="navLoginBtn"` and `#navContactBtn`. |
| **Complete Profile**| [`pages/auth/complete-profile.html:18-28`](file:///c:/Users/moham/Desktop/Sudstrack/pages/auth/complete-profile.html#L18-L28)| Line 26: `<a class="login-btn" href="login.html">Login</a>` | Stripped minimal navbar. No menu links, no `id="navLoginBtn"`. |
| **Account** | [`pages/user/account.html:16-37`](file:///c:/Users/moham/Desktop/Sudstrack/pages/user/account.html#L16-L37) | Line 32: `<a class="login-btn" id="navLoginBtn" href="../auth/login.html">Login</a>` | Standard user navbar. |
| **Booking** | [`pages/user/booking.html:27-52`](file:///c:/Users/moham/Desktop/Sudstrack/pages/user/booking.html#L27-L52) | Line 46: `<a class="login-btn" id="navLoginBtn" href="../auth/login.html">Login</a>` | Standard user navbar. |
| **Orders** | [`pages/user/orders.html:16-37`](file:///c:/Users/moham/Desktop/Sudstrack/pages/user/orders.html#L16-L37) | Line 32: `<a class="login-btn" id="navLoginBtn" href="../auth/login.html">Login</a>` | Standard user navbar. |
| **Packages** | [`pages/user/packages.html:23-52`](file:///c:/Users/moham/Desktop/Sudstrack/pages/user/packages.html#L23-L52) | Line 46: `<a class="login-btn" id="navLoginBtn" href="../auth/login.html">Login</a>` | Includes `#navCartIcon` shopping cart button. |
| **Contact** | [`pages/user/contact.html:54-75`](file:///c:/Users/moham/Desktop/Sudstrack/pages/user/contact.html#L54-L75) | Line 70: `<a class="login-btn" id="navLoginBtn" href="../auth/login.html">Login</a>` | Standard user navbar. |
| **Admin** | [`pages/admin/admin.html:17-51`](file:///c:/Users/moham/Desktop/Sudstrack/pages/admin/admin.html#L17-L51) | Line 49: `<button type="button" class="login-btn" id="adminLogoutBtn">Log out</button>` | Custom staff navbar with role pill, hamburger, notification bell dropdown, logout button. |

---

### "My Account" Button Definition & Logged-In State Detection

1. **Where "My Account" Button is Defined:**
   - **Static HTML:** Defined as `<a class="login-btn" id="navLoginBtn" href="...">Login</a>` across individual HTML view files (e.g., [`index.html:41`](file:///c:/Users/moham/Desktop/Sudstrack/index.html#L41), [`pages/user/account.html:32`](file:///c:/Users/moham/Desktop/Sudstrack/pages/user/account.html#L32)).
   - **Dynamic Mutation:** The text is dynamically changed to **"My Account"** at runtime in [`js/pages/landing.js:187-201`](file:///c:/Users/moham/Desktop/Sudstrack/js/pages/landing.js#L187-L201):
     ```javascript
     // js/pages/landing.js:187-201
     const loginBtn = document.getElementById("navLoginBtn");
     if (loginBtn && user) {
         loginBtn.textContent = user.role === "Customer" ? "My Account" : "Dashboard";
         
         const path = window.location.pathname;
         const depth = path.split("/").filter(Boolean).length - (path.endsWith("/") ? 0 : 1);
         const prefix = depth > 0 ? "../".repeat(depth) : "./";

         if (user.role === "Customer") {
             loginBtn.href = prefix + "pages/user/account.html";
         } else {
             loginBtn.href = prefix + "pages/admin/admin.html";
         }
     }
     ```

2. **How Logged-In State is Detected on the Frontend:**
   - On page load, [`js/pages/landing.js:169-172`](file:///c:/Users/moham/Desktop/Sudstrack/js/pages/landing.js#L169-L172) invokes:
     ```javascript
     window.currentUser = await window.getCurrentUser();
     ```
   - `getCurrentUser()` is defined in [`js/core/api.js:272-279`](file:///c:/Users/moham/Desktop/Sudstrack/js/core/api.js#L272-L279):
     ```javascript
     async function getCurrentUser() {
         try {
             const res = await Auth.getMe();
             return res.data;
         } catch {
             return null;
         }
     }
     ```
   - `Auth.getMe()` sends `GET /api/auth/me` with `credentials: "include"`, which decodes the `sudstrack_token` cookie.
   - If the user is logged out, the cookie is absent or invalid, and `res.data` is `null`.
   - In [`css/pages/landing.css:67-73`](file:///c:/Users/moham/Desktop/Sudstrack/css/pages/landing.css#L67-L73), logged-out users have `#navMenu` and `#navContactBtn` hidden by default via `display: none;`.
   - When a valid user is returned, [`js/pages/landing.js:177-184`](file:///c:/Users/moham/Desktop/Sudstrack/js/pages/landing.js#L177-L184) overrides the CSS and displays the nav items:
     ```javascript
     if (user) {
         const navMenu    = document.getElementById("navMenu");
         const navContact = document.getElementById("navContactBtn");
         const navToggle  = document.getElementById("navToggle");
         if (navMenu)    navMenu.style.display    = "flex";
         if (navContact) navContact.style.display = "inline-block";
         if (navToggle)  navToggle.style.display  = "";
     }
     ```

---

## 4. Database Findings

### Entity Schema & Field Analysis

| Table Name | Primary Key | Key Fields | Profile Pic? | Consent Fields? | Payment Status? | Payment Proof? |
|---|---|---|---|---|---|---|
| **`accounts`** | `account_id` | `full_name`, `email`, `password_hash`, `role`, `contact_number`, `address`, `auth_provider`, `two_factor_enabled`, `totp_secret`, `login_attempts`, `locked_until`, `is_active`, `profile_picture`, `created_at` | **YES** (`profile_picture TEXT`) | **NO** (No terms, privacy, or consent timestamp fields) | N/A | N/A |
| **`orders`** | `order_id` | `order_code`, `account_id`, `package_ids` (INT[]), `pickup_address`, `delivery_address`, `load_size`, `pickup_slot`, `delivery_slot`, `status`, `notes`, `map_lat`, `map_lng`, `rider_id`, `created_at` | N/A | N/A | Handled in `payments` | **NO** (No payment proof or receipt field) |
| **`payments`** | `payment_id` | `order_id`, `payment_method` (`Cash`/`Online`), `amount`, `payment_status` (`Pending`/`Paid`/`Failed`/`Refunded`), `paid_at` | N/A | N/A | **YES** (`payment_status VARCHAR(10)`) | **NO** (No proof URL, receipt image, or transaction ref field) |
| **`order_tracking`** | `tracking_id` | `order_id`, `rider_name`, `claim_qr_code`, `delivery_status`, `updated_at` | N/A | N/A | N/A | N/A |
| **`packages`** | `package_id` | `package_name`, `description`, `price`, `turnaround_time`, `is_active` | N/A | N/A | N/A | N/A |
| **`riders`** | `rider_id` | `name`, `phone`, `vehicle`, `status` (`Available`/`Occupied`/`Offline`), `created_at` | N/A | N/A | N/A | N/A |
| **`chat_messages`** | `message_id` | `room_id`, `sender_id`, `sender_name`, `sender_role`, `message`, `created_at` | N/A | N/A | N/A | N/A |
| **`staff_messages`** | `message_id` | `sender_id`, `content`, `created_at` | N/A | N/A | N/A | N/A |
| **`notifications`** | `notification_id` | `account_id`, `title`, `message`, `is_read`, `created_at` | N/A | N/A | N/A | N/A |
| **`admin_notifications`**| `id` | `account_id`, `title`, `message`, `link_tab`, `is_read`, `created_at` | N/A | N/A | N/A | N/A |
| **`promotions`** | `promo_id` | `title`, `description`, `image_url`, `is_active`, `created_at` | N/A | N/A | N/A | N/A |
| **`platform_settings`** | `setting_key` | `setting_value`, `updated_at` | N/A | N/A | N/A | N/A |
| **`admin_logs`** | `log_id` | `admin_id`, `action`, `details`, `created_at` | N/A | N/A | N/A | N/A |
| **`security_logs`** | `log_id` | `account_id`, `email_attempted`, `event_type`, `ip_address`, `attempts_count`, `lockout_triggered`, `reset_requested`, `created_at` | N/A | N/A | N/A | N/A |
| **`api_logs`** | `log_id` | `api_name`, `endpoint`, `error_type`, `error_message`, `retry_count`, `recovered`, `severity`, `created_at` | N/A | N/A | N/A | N/A |
| **`feedback`** | `feedback_id` | `order_id`, `account_id`, `rating` (1-5), `comment`, `submitted_at` | N/A | N/A | N/A | N/A |
| **`weather_checks`**| `weather_check_id`| `order_id`, `forecast_result`, `description`, `warning`, `checked_at` | N/A | N/A | N/A | N/A |
| **`saved_orders`** | `saved_order_id` | `account_id`, `order_id`, `starred_at` | N/A | N/A | N/A | N/A |
| **`password_reset_tokens`**| `reset_id` / `token_id` | `account_id`, `token_hash`, `expires_at`, `used`, `created_at` | N/A | N/A | N/A | N/A |
| **`sessions`** | `session_id` | `account_id`, `token_hash`, `login_method`, `created_at`, `expires_at` | N/A | N/A | N/A | N/A |

---

### How Tables are Created and Migrated

1. **No Migration Tooling:** There is no schema migration framework (e.g., Knex, Sequelize, Prisma, TypeORM, or Flyway).
2. **Base Schema:** [`backend/db/schema.sql`](file:///c:/Users/moham/Desktop/Sudstrack/backend/db/schema.sql) defines the original 12 tables. It begins with destructive statements: `DROP TABLE IF EXISTS ... CASCADE;`.
3. **Execution Script:** [`backend/db/runMigration.js`](file:///c:/Users/moham/Desktop/Sudstrack/backend/db/runMigration.js) reads `schema.sql` and `seed.sql` synchronously using `fs.readFileSync` and executes them via `pool.query(schema)`.
4. **Ad-Hoc Standalone Scripts:** As features were added, individual JavaScript scripts were created in `backend/` and `temp_scripts/` containing raw SQL `CREATE TABLE IF NOT EXISTS` or `ALTER TABLE ADD COLUMN IF NOT EXISTS`:
   - `backend/init_db.js`: Creates `notifications`, `promotions`, and `admin_logs`.
   - `backend/migrate_riders.js`: Creates `riders` and alters `orders` to add `rider_id`.
   - `backend/migrate_notifications.js`: Creates `admin_notifications`.
   - `backend/migrate_staff_chat.js`: Creates `staff_messages`.
   - `backend/migrate_tokens.js`: Creates `password_reset_tokens` (with conflicting column names).
   - `backend/alter_packages.js`: Alters `packages` to add `turnaround_time`.
   - `temp_scripts/phase16.sql`: Creates `platform_settings` and `chat_messages`.

---

## 5. Reusable Existing Code

### 1. File Upload Setup
- **Current State:** **No standard file upload library exists**. `multer`, `formidable`, or `busboy` are **NOT** installed in `package.json`.
- **Existing Reusable Implementation:** In [`backend/controllers/accountController.js:180-205`](file:///c:/Users/moham/Desktop/Sudstrack/backend/controllers/accountController.js#L180-L205) and [`js/pages/account.js:40-69`](file:///c:/Users/moham/Desktop/Sudstrack/js/pages/account.js#L40-L69), profile picture uploads are handled via client-side `FileReader.readAsDataURL(file)`.
- **Destination:** The base64 data URI string is sent in a standard JSON payload (`POST /api/account/profile-picture`) and saved directly into the PostgreSQL text column `accounts.profile_picture`.
- **Serving:** Files are **not** saved to disk and are **not** served statically. They are returned as inline data URIs in API JSON responses.

### 2. Email Service & Nodemailer / SMTP
- **Current State:** **Fully implemented and reusable**.
- **Location:** [`backend/services/emailService.js`](file:///c:/Users/moham/Desktop/Sudstrack/backend/services/emailService.js).
- **Transport:** Nodemailer configured with Gmail SMTP service using `EMAIL_USER` and `EMAIL_APP_PASSWORD`.
- **Implemented Functions:**
  - `sendPasswordResetEmail(toEmail, resetToken, fullName)`: Sends branded 6-digit OTP code with expiration notice ([`lines 16-50`](file:///c:/Users/moham/Desktop/Sudstrack/backend/services/emailService.js#L16-L50)).
  - `send2FACodeEmail(toEmail, code, fullName)`: Sends 2FA verification code ([`lines 55-85`](file:///c:/Users/moham/Desktop/Sudstrack/backend/services/emailService.js#L55-L85)).
- **Stub Fallback:** Lines 17-21 and 56-60 safely check if `EMAIL_USER` is empty or set to `"placeholder@gmail.com"`, falling back to console logging (`[EMAIL STUB]`) without throwing an exception.
- **Contact Controller SMTP:** [`backend/controllers/contactController.js:11-24`](file:///c:/Users/moham/Desktop/Sudstrack/backend/controllers/contactController.js#L11-L24) also creates a Nodemailer transport directly to forward contact inquiries.

### 3. Terms & Conditions and Privacy Policy Content
- **Current State:** **Zero content or pages exist**.
- There is no `terms.html`, `privacy.html`, or legal content in the repository.
- There are no consent checkboxes or legal disclaimers in `registration.html` or `booking.html`.
- There are no consent tracking fields in `accounts` table.

### 4. Existing Payment Code & UI
- **Database Model:** Table `payments` has `payment_id`, `order_id`, `payment_method` (`Cash` or `Online`), `amount`, `payment_status` (`Pending`, `Paid`, `Failed`, `Refunded`), and `paid_at`.
- **Frontend Payment Options:** In [`pages/user/booking.html:201-223`](file:///c:/Users/moham/Desktop/Sudstrack/pages/user/booking.html#L201-L223), users select from:
  1. Cash on Delivery (`value="Cash"`)
  2. GCash (`value="Online"`)
  3. Maya (`value="Online"`)
  4. Credit/Debit Card (`value="Online"`)
- **Simulated Payment Gateway UI:** In [`pages/user/booking.html:282-296`](file:///c:/Users/moham/Desktop/Sudstrack/pages/user/booking.html#L282-L296), a modal (`#paymentModal`) styled as "PayMongo Test Sandbox Mode" is rendered.
- **Simulated Gateway Handler:** In [`js/pages/booking.js:237-267`](file:///c:/Users/moham/Desktop/Sudstrack/js/pages/booking.js#L237-L267), when `Online` is selected, the modal is displayed. Clicking "Simulate Successful Payment" resolves a JavaScript Promise with `true`, marking `payment_status: "Paid"` in the booking request payload.
- **Backend Order Payment Integration:** In [`backend/controllers/ordersController.js:84-89`](file:///c:/Users/moham/Desktop/Sudstrack/backend/controllers/ordersController.js#L84-L89), `payments` record is created with `resolvedPaymentStatus`. In [`backend/controllers/adminController.js:108-113`](file:///c:/Users/moham/Desktop/Sudstrack/backend/controllers/adminController.js#L108-L113), when order status reaches "Completed", Cash payments are automatically marked as "Paid" with `paid_at = NOW()`.

---

## 6. Environment

### Active Key Names in `backend/.env` (Values Omitted)

```
PORT
NODE_ENV
FRONTEND_URL
DATABASE_URL
JWT_SECRET
JWT_EXPIRES_IN
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
GOOGLE_CALLBACK_URL
GOOGLE_MAPS_API_KEY
OPENWEATHER_API_KEY
SEMAPHORE_API_KEY
SEMAPHORE_SENDER_NAME
EMAIL_USER
EMAIL_APP_PASSWORD
EMAIL_FROM_NAME
QR_API_BASE_URL
```

### Categorization & Missing Key Audit

| Category | Existing Keys in `.env` | Missing / Needed Keys |
|---|---|---|
| **Database** | `DATABASE_URL` | None (Supabase URI is complete). |
| **JWT / Session** | `JWT_SECRET`, `JWT_EXPIRES_IN` | None. |
| **Email / SMTP** | `EMAIL_USER`, `EMAIL_APP_PASSWORD`, `EMAIL_FROM_NAME` | `SMTP_HOST`, `SMTP_PORT` (currently hardcoded to Gmail in `emailService.js`). |
| **File Uploads** | *(None)* | **MISSING:** `MAX_FILE_SIZE`, `UPLOAD_DIR`, or Cloud Storage credentials (`SUPABASE_STORAGE_URL`, `SUPABASE_SERVICE_ROLE_KEY`). |
| **Payment Gateway**| *(None)* | **MISSING:** `PAYMONGO_SECRET_KEY`, `PAYMONGO_PUBLIC_KEY`, `PAYMONGO_WEBHOOK_SECRET`. |
| **SMS** | `SEMAPHORE_API_KEY`, `SEMAPHORE_SENDER_NAME` | None (configured for Semaphore API v4). |
| **Maps & Weather**| `GOOGLE_MAPS_API_KEY`, `OPENWEATHER_API_KEY` | None. |

### Gitignore & Blueprint Verification
- `.env` files: `.env`, `backend/.env`, and `*.env` are in root [`.gitignore:6-8`](file:///c:/Users/moham/Desktop/Sudstrack/.gitignore#L6-L8) and [`backend/.gitignore:2`](file:///c:/Users/moham/Desktop/Sudstrack/backend/.gitignore#L2).
- `node_modules`: Ignored in root [`.gitignore:2-3`](file:///c:/Users/moham/Desktop/Sudstrack/.gitignore#L2-L3) and [`backend/.gitignore:1`](file:///c:/Users/moham/Desktop/Sudstrack/backend/.gitignore#L1).
- Upload directories: **NOT in `.gitignore`** (e.g., `uploads/` or `public/uploads/` is not listed).
- `.env.example`: Exists at [`backend/.env.example`](file:///c:/Users/moham/Desktop/Sudstrack/backend/.env.example) (contains template comments and placeholders for all active keys).

---

## 7. Code Health & Security

### Critical Issues

1. **`backend/controllers/authController.js:209` — Runtime Crash on 2FA Login Verification**
   - *Issue:* `global.loginTempTokens.delete(temp_token);` references an undeclared global variable. Any user with 2FA enabled crashes the request handler with `TypeError: Cannot read properties of undefined (reading 'delete')`.
   - *Fix:* Delete line 209 (login verification already uses stateless JWT).

2. **`backend/controllers/ridersController.js:86-92` — PostgreSQL Constraint Violation on Order Assignment**
   - *Issue:* Sets `orders.status = 'Waiting for Rider'`, which violates the PostgreSQL CHECK constraint `orders_status_check` (`CHECK (status IN ('Received','Washing','Drying','Ready for Delivery','Out for Delivery','Completed','Cancelled'))`). Order creation fails whenever no riders are available.
   - *Fix:* Add `'Waiting for Rider'` to `ORDER_STATUSES` in `constants.js` and update table constraint in `schema.sql`.

3. **`backend/controllers/chatController.js:76, 84, 101` — SQL Column Errors on Support Chat Edit/Delete**
   - *Issue:* Queries `SELECT sender_type, sender_id, content FROM chat_messages` and updates `content`. The table columns are actually `sender_role` and `message`. Throws `column "sender_type" does not exist`.
   - *Fix:* Replace `sender_type` with `sender_role` and `content` with `message`.

4. **`backend/controllers/authController.js:435` & `backend/db/schema.sql:58-65` — Schema Primary Key Inconsistency in Password Reset**
   - *Issue:* `schema.sql` defines `password_reset_tokens.reset_id`, but `authController.js:435` executes `WHERE token_id = $1`. Conversely, `migrate_tokens.js` creates `token_id` but omits the `used` column, breaking queries on lines 353, 360, and 386.
   - *Fix:* Harmonize `password_reset_tokens` to have `token_id`, `account_id`, `token_hash`, `expires_at`, `used`, `created_at`.

5. **`backend/db/schema.sql:82-96` — Outdated Base DDL File**
   - *Issue:* Running `backend/db/runMigration.js` wipes the database and executes `schema.sql`, which is missing `package_ids INT[]`, `map_lat`, `map_lng`, and `rider_id` on `orders`, and lacks `platform_settings`, `chat_messages`, `admin_notifications`, and `riders` tables entirely.
   - *Fix:* Update `backend/db/schema.sql` to include all currently active columns and tables.

### Medium Issues

1. **`backend/services/mapsService.js:64, 93` & `backend/controllers/ordersController.js:308` — Server Google Maps API Key Exposed in Public JSON**
   - *Issue:* Returns `process.env.GOOGLE_MAPS_API_KEY` in JSON responses (`map_data.mapsApiKey` and `maps_api_key`) to client browsers.
   - *Fix:* Remove server API key from response payloads; use an HTTP referrer-restricted browser key.

2. **`js/pages/login.js:53` — Hardcoded Localhost Origin in Google OAuth Session Finalizer**
   - *Issue:* `fetch('http://127.0.0.1:3000/api/auth/google/session?t=' + googleToken)` fails on Vercel or custom domain deployments.
   - *Fix:* Replace with dynamic `API_BASE`: `fetch(`${API_BASE}/auth/google/session?t=${googleToken}`, { credentials: "include" })`.

3. **`backend/services/mapsService.js:23, 28` — Double URL-Encoding Bug**
   - *Issue:* Destination address is encoded with `encodeURIComponent()` before passing into `axios.get(..., { params: { destination } })`, causing Axios to double-encode spaces into `%2520`.
   - *Fix:* Pass raw string to `params.destination`; let Axios handle parameter encoding.

4. **`js/pages/login.js:222-230` — Client Pre-Check Circumvents Email Enumeration Defense**
   - *Issue:* Backend returns generic success to prevent email harvesting, but `login.js` calls `Auth.checkEmail(email)` first, alerting user if the email does not exist.
   - *Fix:* Remove `Auth.checkEmail` in `login.js`; always show the uniform message.

5. **`backend/utils/tokenUtils.js:38-42` — Inconsistent Cookie Attributes on Logout**
   - *Issue:* `setTokenCookie` sets `SameSite=None; Secure` in production, but `clearTokenCookie` hardcodes `SameSite=Lax` without `Secure`, causing cookie clearance to fail in cross-origin production setups.
   - *Fix:* Set identical `sameSite` and `secure` options in `clearTokenCookie`.

6. **`package.json:1-12` — Root Package.json Missing Dependencies Declaration**
   - *Issue:* Root `package.json` defines startup scripts targeting `backend/server.js`, but has no `dependencies`. Running `npm install` at root installs nothing.
   - *Fix:* Add npm workspaces configuration (`"workspaces": ["backend"]`) to root `package.json`.

7. **`backend/utils/orderCodeUtils.js:8` — High Collision Risk for Order Reference Codes**
   - *Issue:* Order codes use 4 hex characters (`SD-XXXX`), limiting total combinations to 65,536 and risking duplicate key errors under volume.
   - *Fix:* Increase random suffix to 6 alphanumeric characters (`SD-XXXXXX`).

8. **`js/pages/landing.js:103, 257` & `js/pages/admin.js:89` — Unbounded Polling Loops**
   - *Issue:* Fixed `setInterval` loops run continuously (5s chat, 10s admin notifs, 30s customer notifs) without idle backoff or tab visibility detection.
   - *Fix:* Pause timers when `document.hidden` is true and implement exponential backoff.

9. **`js/pages/admin.js:1924` — Incomplete Apostrophe Replacement in Dynamic Event Handlers**
   - *Issue:* Package edit handler uses `.replace("'", "\'")` which only escapes the first quote, risking syntax crashes on titles with multiple quotes.
   - *Fix:* Attach event listeners programmatically with `addEventListener`.

10. **`backend/package.json:21` — Unused Production Dependency**
    - *Issue:* `express-validator` is installed in `backend/package.json` but is never imported or used.
    - *Fix:* Either implement validation middleware or remove the package.

### Low Issues

1. **`backend/middleware/errorHandler.js:8` — Raw HTML Tags in Terminal Error Log**
   - *Issue:* `console.error('<i class="ph ph-fire"></i> Unhandled error:', err);` prints raw HTML tags into the terminal.
   - *Fix:* Replace HTML tag with text identifier `[Error]`.

2. **`js/components/footer.js:11` — Deprecated `document.write()` API**
   - *Issue:* `footer.js` inserts footer markup using `document.write()`.
   - *Fix:* Append footer element using `document.body.insertAdjacentHTML('beforeend', ...)`.

3. **`pages/user/orders.html:104-114` — Malformed HTML Structure**
   - *Issue:* `#mapModal` markup is located after the closing `</html>` tag.
   - *Fix:* Move modal inside `<body>` before scripts.

4. **`pages/user/account.html:157` — Stray Closing DIV Tag**
   - *Issue:* Redundant `</div>` tag creates mismatched DOM nesting.
   - *Fix:* Remove redundant closing tag.

5. **`backend/controllers/ordersController.js:281-285` — Active Production Debug Logs**
   - *Issue:* `console.log("isAdmin:", isAdmin, ...)` outputs query parameters on every tracking request.
   - *Fix:* Remove debug log statements.

6. **`backend/routes/feedback.js:7` & `backend/routes/riders.js:7-10` — Dead Role Check for `'Admin'`**
   - *Issue:* Code checks `requireRole("Admin", "SuperAdmin", "Staff")`, but role `'Admin'` does not exist in DB check constraints.
   - *Fix:* Remove `'Admin'` and standardize on `'Staff'` and `'SuperAdmin'`.

7. **`temp_scripts/` — 220 Outdated Maintenance Scripts in Workspace**
   - *Issue:* 220 ad-hoc refactoring scripts pollute workspace search and file listing.
   - *Fix:* Move to an external branch or archive folder.

---

### Potential Breakages When Adding the 4 Planned Features

1. **Feature 1: Navbar User Display with Avatar**
   - *Nav Code Duplication:* The navbar is duplicated across 10 separate HTML files. In [`pages/auth/login.html:41`](file:///c:/Users/moham/Desktop/Sudstrack/pages/auth/login.html#L41) and [`pages/auth/registration.html:41`](file:///c:/Users/moham/Desktop/Sudstrack/pages/auth/registration.html#L41), `id="navLoginBtn"` is missing. Any script that assumes `id="navLoginBtn"` exists on all pages will throw a null reference error.
   - *CSS Conflicts:* In [`css/pages/landing.css:67-73`](file:///c:/Users/moham/Desktop/Sudstrack/css/pages/landing.css#L67-L73), the navbar uses strict `display: none;` rules that are overridden by inline styles in [`js/pages/landing.js:181-183`](file:///c:/Users/moham/Desktop/Sudstrack/js/pages/landing.js#L181-L183). Introducing avatar containers will cause layout breaks or horizontal overflow on mobile viewports if CSS flexbox rules and media queries are not updated in tandem.
   - *Large Base64 Strings:* Avatars are stored as full base64 strings in `accounts.profile_picture`. Injecting raw base64 data URIs into the navbar on every page load will increase DOM memory usage.

2. **Feature 2: Welcome Email on Registration**
   - *Synchronous Execution Risk:* If `sendWelcomeEmail` is called synchronously inside `register()` in [`backend/controllers/authController.js:26-63`](file:///c:/Users/moham/Desktop/Sudstrack/backend/controllers/authController.js#L26-L63), any SMTP connection timeout or network glitch with Gmail will cause user registration to fail with HTTP 500. It must be dispatched asynchronously in a non-blocking background promise with a `.catch()` handler.
   - *Missing SMTP Config Keys:* `emailService.js` currently hardcodes Gmail SMTP. Deployments without `EMAIL_USER` or `EMAIL_APP_PASSWORD` configured will fail unless the stub fallback is preserved.

3. **Feature 3: Terms & Conditions and Data Privacy Checkboxes**
   - *Database Schema Gap:* Table `accounts` has **no consent columns**. If frontend sends `terms_accepted: true`, the backend cannot persist it without schema changes.
   - *Form Validation Failure:* In [`js/pages/registration.js:43-48`](file:///c:/Users/moham/Desktop/Sudstrack/js/pages/registration.js#L43-L48), registration checks only `fullName`, `email`, `password`, `confirmPassword`. Checkbox validation must be added or users will be able to register without consenting.

4. **Feature 4: Payment Proof Upload on Bookings**
   - *No Upload Middleware:* Express currently has **no multipart form parser** (no `multer`). It only parses JSON up to 10MB (`server.js:62`). Submitting a file upload via `multipart/form-data` will result in `req.file` being undefined and `req.body` being empty.
   - *Serverless Read-Only Filesystem:* On Vercel, the local filesystem is read-only (except `/tmp`, which is ephemeral and wiped between invocations). Uploads cannot be saved to a local folder like `backend/uploads/` in production; they must be stored in Supabase Storage or sent as base64 strings like profile pictures.
   - *JSON Contract Mismatch:* [`js/pages/booking.js:271-285`](file:///c:/Users/moham/Desktop/Sudstrack/js/pages/booking.js#L271-L285) calls `Orders.create` with a JSON object. Adding a file requires either refactoring `Orders.create` to send `FormData` or creating a dedicated `/api/upload` endpoint that returns an image URL before order submission.
   - *Database Column Gap:* Neither `orders` nor `payments` has a `payment_proof_url` or `proof_image` column.

---

## 8. Git State

- **Current Branch:** `main`
- **Remote Tracking URL:** `https://github.com/madymadzz/sudstrack.git`
- **Working Tree State:** Clean tracking branch (no uncommitted modifications to tracked files).
- **Untracked Files:**
  - `PROJECT_MEMORY.md` (Generated system audit file)
  - `audit_output/` (Audit output folder from previous audit)
  - `backend/alter_packages.js` (Standalone DDL script)
  - `backend/fix_paid_at.js` (Standalone DDL patch script)
  - `backend/test_revenue.js` (Test SQL script)
  - `fix_html.py`, `fix_sticky.py` (Local utility scripts)
  - `scratch/` (Temporary testing folder)
- **Last 10 Commits on `main`:**
  1. `f9a09dd` Fix: Weather banner visibility, top-level escapeHTML scope, and 5-day forecast message
  2. `b87d5e0` Fix: Resolve root startup dotenv path, guard Google OAuth, fix init_db syntax, and sanitize booking XSS
  3. `cee7163` Fix: View my orders button now links to orders.html instead of account.html
  4. `24115d5` Fix: nav items now correctly appear for logged-in users (was broken by !important CSS)
  5. `94021f3` Feat: hide nav items for logged-out users, show only logo + Login
  6. `338e11f` Fix: Packages nav link now goes to packages.html on user pages
  7. `ad3b1f0` Fix: check email exists before sending password reset code
  8. `99b9782` Fix: eliminate login flash (FOUC-auth) on all protected pages
  9. `54c61ae` UI: Refactor admin dashboard to proper flex layout, fix mobile overflow, restore full width footer
  10. `8a17dd3` UI: Fix layout bugs, extract footer component, align sidebar
- **Sensitive File Tracking Check:**
  - `backend/.env` is **NOT tracked** in git and has never been committed to git history.
  - `backend/.env.example` is tracked (contains only sanitized placeholders).
  - No secret keys, credentials, or upload directories are tracked in git.

---

## 9. Readiness Checklist for Planned Features

### Feature 1: Navbar User Display with Avatar
- [ ] **Database Changes:** **None required.** `accounts.profile_picture` (`TEXT`) and `accounts.full_name` (`VARCHAR(150)`) already exist and are returned by `GET /api/auth/me`.
- [ ] **Files to Edit:**
  1. [`js/pages/landing.js:187-208`](file:///c:/Users/moham/Desktop/Sudstrack/js/pages/landing.js#L187-L208): In `DOMContentLoaded`, update `#navLoginBtn` replacement logic to render an avatar circular badge (`<img src="${user.profile_picture}">` or initials) alongside user first name.
  2. [`css/pages/landing.css`](file:///c:/Users/moham/Desktop/Sudstrack/css/pages/landing.css): Add CSS rules for `.nav-user-badge`, `.nav-avatar`, and responsive dropdown menu.
  3. Navbar HTML files to ensure consistency:
     - [`pages/auth/login.html:41`](file:///c:/Users/moham/Desktop/Sudstrack/pages/auth/login.html#L41): Add `id="navLoginBtn"` so script can target it.
     - [`pages/auth/registration.html:41`](file:///c:/Users/moham/Desktop/Sudstrack/pages/auth/registration.html#L41): Add `id="navLoginBtn"`.
     - [`index.html:39-45`](file:///c:/Users/moham/Desktop/Sudstrack/index.html#L39-L45), [`pages/user/account.html:30-36`](file:///c:/Users/moham/Desktop/Sudstrack/pages/user/account.html#L30-L36), [`pages/user/booking.html:44-50`](file:///c:/Users/moham/Desktop/Sudstrack/pages/user/booking.html#L44-L50), [`pages/user/orders.html:30-36`](file:///c:/Users/moham/Desktop/Sudstrack/pages/user/orders.html#L30-L36), [`pages/user/packages.html:40-50`](file:///c:/Users/moham/Desktop/Sudstrack/pages/user/packages.html#L40-L50), [`pages/user/contact.html:68-74`](file:///c:/Users/moham/Desktop/Sudstrack/pages/user/contact.html#L68-L74): Standardize container structure.

### Feature 2: Welcome Email on Registration
- [ ] **Database Changes:** **None required.** Uses existing `accounts.email` and `accounts.full_name`.
- [ ] **Files to Edit:**
  1. [`backend/services/emailService.js`](file:///c:/Users/moham/Desktop/Sudstrack/backend/services/emailService.js): Implement and export `sendWelcomeEmail(toEmail, fullName)` with responsive HTML template containing shop details and getting-started link.
  2. [`backend/controllers/authController.js:48-62`](file:///c:/Users/moham/Desktop/Sudstrack/backend/controllers/authController.js#L48-L62): In `register()`, call `sendWelcomeEmail(user.email, user.full_name).catch(err => console.error('[Email] Welcome email failed:', err.message));` right after account insertion (non-blocking).

### Feature 3: Terms & Conditions and Data Privacy Checkboxes
- [ ] **Database Changes Required:**
  ```sql
  ALTER TABLE accounts ADD COLUMN IF NOT EXISTS terms_accepted BOOLEAN NOT NULL DEFAULT FALSE;
  ALTER TABLE accounts ADD COLUMN IF NOT EXISTS privacy_accepted BOOLEAN NOT NULL DEFAULT FALSE;
  ALTER TABLE accounts ADD COLUMN IF NOT EXISTS consent_at TIMESTAMPTZ;
  ```
  *(Must also be added to `backend/db/schema.sql`)*
- [ ] **Files to Edit:**
  1. [`pages/auth/registration.html:86-92`](file:///c:/Users/moham/Desktop/Sudstrack/pages/auth/registration.html#L86-L92): Add two mandatory checkbox inputs for T&C and Privacy Policy before submit button.
  2. [`css/pages/registration.css`](file:///c:/Users/moham/Desktop/Sudstrack/css/pages/registration.css): Add styles for checkbox alignment, links, and `.invalid` field state.
  3. [`js/pages/registration.js:34-65`](file:///c:/Users/moham/Desktop/Sudstrack/js/pages/registration.js#L34-L65): Validate checkboxes on submit; pass `terms_accepted` and `privacy_accepted` into `Auth.register()`.
  4. [`js/core/api.js:48-53`](file:///c:/Users/moham/Desktop/Sudstrack/js/core/api.js#L48-L53): Update `Auth.register()` payload to include consent parameters.
  5. [`backend/controllers/authController.js:26-63`](file:///c:/Users/moham/Desktop/Sudstrack/backend/controllers/authController.js#L26-L63): Validate `terms_accepted === true` and `privacy_accepted === true`; insert into `accounts` along with `consent_at = NOW()`.
  6. *(New Optional Pages)*: Create [`pages/legal/terms.html`](file:///c:/Users/moham/Desktop/Sudstrack/pages/legal/terms.html) and [`pages/legal/privacy.html`](file:///c:/Users/moham/Desktop/Sudstrack/pages/legal/privacy.html) (or modal popups) for user reference.

### Feature 4: Payment Proof Upload on Bookings
- [ ] **Database Changes Required:**
  ```sql
  ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_proof_url TEXT;
  ```
  *(Must also be added to `backend/db/schema.sql`)*
- [ ] **Files to Edit:**
  1. [`backend/package.json`](file:///c:/Users/moham/Desktop/Sudstrack/backend/package.json): Install `multer` (if storing locally) or `@supabase/supabase-js` (if uploading to Supabase Storage bucket for Vercel compatibility).
  2. [`backend/.gitignore`](file:///c:/Users/moham/Desktop/Sudstrack/backend/.gitignore) & [`.gitignore`](file:///c:/Users/moham/Desktop/Sudstrack/.gitignore): Add `uploads/` to prevent committing customer payment receipts to source control.
  3. [`backend/server.js`](file:///c:/Users/moham/Desktop/Sudstrack/backend/server.js): If using local storage, serve static uploads via `app.use('/uploads', express.static(path.join(__dirname, 'uploads')))`.
  4. [`backend/routes/orders.js`](file:///c:/Users/moham/Desktop/Sudstrack/backend/routes/orders.js) & [`backend/controllers/ordersController.js:10-100`](file:///c:/Users/moham/Desktop/Sudstrack/backend/controllers/ordersController.js#L10-L100): Update `POST /api/orders` (or add `POST /api/orders/upload-proof`) to receive the file/URL and save `payment_proof_url` in `payments` table.
  5. [`pages/user/booking.html:201-230`](file:///c:/Users/moham/Desktop/Sudstrack/pages/user/booking.html#L201-L230): In Step 2 (payment), add a file picker `<input type="file" id="paymentProofInput" accept="image/jpeg,image/png,image/webp">` shown when GCash/Maya/Online is selected.
  6. [`js/pages/booking.js:218-301`](file:///c:/Users/moham/Desktop/Sudstrack/js/pages/booking.js#L218-L301): Validate that proof is uploaded for online orders; submit file or base64/uploaded URL with the order request.
  7. [`pages/admin/admin.html:152-169`](file:///c:/Users/moham/Desktop/Sudstrack/pages/admin/admin.html#L152-L169) & [`js/pages/admin.js:238-380`](file:///c:/Users/moham/Desktop/Sudstrack/js/pages/admin.js#L238-L380): Render a clickable receipt badge in the staff orders table so staff can inspect the proof before marking payment as Paid.
