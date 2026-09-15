require('dotenv').config();
const path = require('path');

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const passport = require('passport');

// Config
require('./config/db');                    // Connect to database on startup
const { configureGoogleOAuth } = require('./services/googleOAuth');

// Middleware
const { errorHandler } = require('./middleware/errorHandler');

// Routes
const authRoutes     = require('./routes/auth');
const accountRoutes  = require('./routes/account');
const packageRoutes  = require('./routes/packages');
const orderRoutes    = require('./routes/orders');
const weatherRoutes  = require('./routes/weather');
const feedbackRoutes = require('./routes/feedback');
const adminRoutes    = require('./routes/admin');
const ridersRoutes   = require('./routes/riders');
const contactRoutes  = require('./routes/contact');
const promoRoutes    = require('./routes/promotions');
const settingsRoutes = require('./routes/settings');
const chatRoutes        = require('./routes/chat');
const staffChatRoutes   = require('./routes/staffChat');
const notifRoutes       = require('./routes/notifications');

const app = express();

// ─── Security & Utility Middleware ────────────────────────────────────────────

app.use(helmet({
    contentSecurityPolicy: false,          // Disable CSP so CSS/JS/fonts load correctly
    crossOriginEmbedderPolicy: false,      // Allow Google Maps iframes
}));

app.use(cors({
    origin: process.env.FRONTEND_URL,      // Only allow requests from the frontend URL
    credentials: true                      // Allow cookies to be sent cross-origin
}));

app.use(morgan('dev'));                     // Request logging in development
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));                   // Parse JSON request bodies
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());                   // Parse cookies (for JWT httpOnly cookie)
app.use(passport.initialize());            // Google OAuth
configureGoogleOAuth();                    // Register Google OAuth strategy

// ─── API Routes ───────────────────────────────────────────────────────────────

app.use('/api/auth',          authRoutes);
app.use('/api/account',       accountRoutes);
app.use('/api/packages',      packageRoutes);
app.use('/api/orders',        orderRoutes);
app.use('/api/weather',       weatherRoutes);
app.use('/api/feedback',      feedbackRoutes);
app.use('/api/admin',         adminRoutes);
app.use('/api/riders',        ridersRoutes);
app.use('/api/contact',       contactRoutes);
app.use('/api/promotions',    promoRoutes);
app.use('/api/settings',      settingsRoutes);
app.use('/api/chat',          chatRoutes);
app.use('/api/staff-chat',    staffChatRoutes);
app.use('/api/notifications', notifRoutes);

// ─── Health Check ─────────────────────────────────────────────────────────────

app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: '✅ SudsTrack API is running',
        environment: process.env.NODE_ENV,
        timestamp: new Date().toISOString()
    });
});

// ─── 404 Handler ──────────────────────────────────────────────────────────────

// Serve static frontend files (for Vercel / production)
if (process.env.NODE_ENV === 'production') {
    const frontendRoot = path.join(__dirname, '..');
    app.use(express.static(frontendRoot));
    // For any non-API route, serve index.html
    app.get('*', (req, res) => {
        res.sendFile(path.join(frontendRoot, 'index.html'));
    });
} else {
    app.use((req, res) => {
        res.status(404).json({ success: false, message: `Route ${req.method} ${req.path} not found` });
    });
}

// ─── Global Error Handler (must be last) ──────────────────────────────────────

app.use(errorHandler);

// ─── Start Server ─────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 SudsTrack backend running on http://localhost:${PORT}`);
    console.log(`📦 Environment: ${process.env.NODE_ENV}`);
    console.log(`🌐 Accepting requests from: ${process.env.FRONTEND_URL}`);
});
