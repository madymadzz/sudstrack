# SudsTrack Project Context

## What SudsTrack Is
SudsTrack is an integrated laundry booking, delivery, order tracking, and management system designed as a capstone project for TIP QC. It allows customers to book laundry pickups, track their order status, and make payments, while giving staff and administrators a comprehensive dashboard to manage operations.

## Overall System Purpose
To streamline laundry operations by providing a seamless, end-to-end digital experience for customers (from booking to delivery) and a robust operational dashboard for staff (order processing, QR claim system, customer management).

## Current Architecture
The system follows a decoupled Client-Server architecture:
- **Frontend:** Vanilla HTML, CSS, and JavaScript. No modern framework (like React or Vue) is used. It runs on a simple HTTP server (e.g., Live Server on port 5500).
- **Backend:** Node.js with Express.js REST API running on port 3000.
- **Database:** PostgreSQL hosted on Supabase (accessed via Supabase IPv4 Transaction Pooler on port 6543).

## Current Folder Structure
`	ext
SudsTrack/
├── assets/         # Images, icons, backgrounds
├── backend/        # Node.js Express server
│   ├── config/     # Database and Passport.js config
│   ├── controllers/# Route handlers (auth, account, admin, orders, etc.)
│   ├── middleware/ # Auth protection, role-based access, rate limiters
│   ├── routes/     # Express routers
│   ├── .env        # Environment variables (do not commit)
│   ├── package.json
│   └── server.js   # Main Express entry point
├── css/            # Global and page-specific stylesheets
├── js/             # Vanilla JS frontend logic
│   ├── core/       # Global utilities (api.js, auth.js)
│   └── pages/      # Page-specific scripts (landing, account, admin, etc.)
├── pages/          # HTML pages categorized by domain (admin, auth, user)
└── index.html      # Landing page / Customer portal
`

## Frontend Structure
- Completely static files.
- js/core/api.js serves as the single source of truth for making HTTP requests to the backend API via etch, handling credentials (cookies) securely.
- Role-based UI components (e.g., "My Account" link vs "Login" link) adapt dynamically based on Auth.getMe() checks.

## Backend Structure
- Express.js handling JSON requests.
- pg library manages database connections with connection pooling.
- RESTful routes categorized by domain (/api/auth, /api/admin, /api/account, /api/orders, /api/packages, /api/feedback, /api/weather).
- Security middleware: helmet, cors (restricted to frontend origin), cookie-parser.

## Database Structure & Tables
PostgreSQL relational database. Existing tables:
1. ccounts (Users, Staff, SuperAdmins)
2. password_reset_tokens
3. packages (Laundry service offerings)
4. orders (Main transaction records)
5. order_tracking (History of status updates)
6. payments
7. saved_orders
8. weather_checks
9. eedback
10. security_logs (Tracks login attempts, failed logins, lockouts)
11. pi_logs (Tracks API usage and errors)
12. sessions

## Existing API Endpoints
**Auth (/api/auth)**
- POST /register, POST /login, POST /admin-login, POST /logout
- POST /check-email, POST /forgot-password, POST /reset-password
- GET /me
- GET /google, GET /google/callback

**Account (/api/account)**
- PUT /profile, POST /change-password
- POST /2fa/setup, POST /2fa/verify, POST /2fa/disable

**Admin (/api/admin)**
- GET /stats, GET /orders, PUT /orders/:id/status, PUT /orders/:id/cancel
- GET /customers, PUT /customers/:id, PUT /customers/:id/ban, DELETE /customers/:id
- GET /staff, POST /staff, PUT /staff/:id, DELETE /staff/:id
- GET /security-events, GET /api-logs
- PUT /packages/:id

**Orders (/api/orders)**
- POST /book, GET /my, GET /saved, GET /:id/qr

## Feature Implementations

### Authentication Architecture
- Stateless JWT tokens stored securely in httpOnly cookies.
- No tokens are stored in localStorage to prevent XSS attacks.
- Middleware (protect, dminOnly, superAdminOnly) enforces role-based access control.

### Google OAuth
- Implemented using passport-google-oauth20.
- Endpoint redirects user to Google, receives callback, generates JWT, sets httpOnly cookie, and redirects to frontend redirect URL.

### Password Reset
- Generates a cryptographically secure token using crypto, hashes it, stores it in password_reset_tokens with an expiration.
- Uses 
odemailer to send a reset link to the user's email.

### Login Attempt Protection
- Backend tracks login_attempts in the database.
- After 5 failed attempts, sets locked_until to 15 minutes in the future, blocking further login attempts for that specific account. Logs events to security_logs.

### 2FA Implementation
- Uses speakeasy to generate TOTP secrets and verify 6-digit codes.
- Uses qrcode to generate base64 data URIs for authenticator apps.

### Customer Functionality
- Register, login, reset password, manage profile.
- View real-time active packages (pulled from DB).
- Place orders, view order history, view saved orders.
- Secure their account using 2FA and Change Password UI.

### Staff / Super Admin Functionality
- Dedicated staff login form checking for Staff or SuperAdmin roles.
- Interactive Dashboard showing dynamic statistics.
- Kanban-style/List order management (change status, assign riders, cancel orders).
- View claim QR codes.
- Customer management (SuperAdmins can Edit, Ban/Unban, or Delete customer records entirely).

## Existing External API Integrations
- **Google OAuth:** Authentication.
- **Nodemailer/SMTP:** Password reset emails.
- **OpenWeatherMap API:** Used in backend /api/weather to check conditions (to warn users about potential delivery delays due to rain).

## Important Environment Variables (Names Only)
- PORT
- FRONTEND_URL
- DATABASE_URL (Must point to the IPv4 transaction pooler on port 6543)
- JWT_SECRET
- GOOGLE_CLIENT_ID
- GOOGLE_CLIENT_SECRET
- SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
- OPENWEATHER_API_KEY

## Important Frontend/Backend Connections
- The frontend js/core/api.js explicitly connects to http://127.0.0.1:3000/api.
- Using 127.0.0.1 instead of localhost on the frontend live server is mandatory for the browser to send the httpOnly cookie because of SameSite=Lax policy rules.

## Important Security Mechanisms
- httpOnly session cookies.
- cryptjs password hashing.
- Brute-force account lockouts.
- Strict role-checking middleware.
- Foreign Key constraint protection (preventing deletion of customers if they have associated orders).
- UUIDs for tracking identifiers.
