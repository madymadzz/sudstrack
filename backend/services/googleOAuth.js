const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const pool = require("../config/db");
const { ROLES, AUTH_PROVIDERS } = require("../config/constants");

const configureGoogleOAuth = () => {
    passport.use(new GoogleStrategy(
        {
            clientID:     process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL:  process.env.GOOGLE_CALLBACK_URL
        },
        async (accessToken, refreshToken, profile, done) => {
            try {
                const email     = profile.emails[0].value;
                const full_name = profile.displayName;

                const existing = await pool.query(
                    "SELECT * FROM accounts WHERE email = $1",
                    [email]
                );

                if (existing.rows.length > 0) {
                    const user = existing.rows[0];
                    if (!user.password_hash) {
                        user.is_new = true;
                    }
                    return done(null, user);
                }

                const newAccount = await pool.query(
                    "INSERT INTO accounts (full_name, email, password_hash, role, auth_provider, created_at) VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING *",
                    [full_name, email, null, ROLES.CUSTOMER, AUTH_PROVIDERS.GOOGLE]
                );

                const user = newAccount.rows[0];
                user.is_new = true; // Tag for frontend redirect
                return done(null, user);
            } catch (err) {
                return done(err, null);
            }
        }
    ));
};

module.exports = { configureGoogleOAuth };
