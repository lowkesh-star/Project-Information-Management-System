const express = require('express');
const router = express.Router();
const { supabase, authConfig } = require('../config/auth');

// Middleware to check authentication
const checkAuth = async (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }

    try {
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (error) throw error;
        req.user = user;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
};

// Middleware to check role
const checkRole = (allowedRoles) => async (req, res, next) => {
    try {
        const { data, error } = await supabase
            .from('user_profiles')
            .select('role')
            .eq('user_id', req.user.id)
            .single();

        if (error) throw error;
        if (!allowedRoles.includes(data.role)) {
            return res.status(403).json({ error: 'Unauthorized access' });
        }
        next();
    } catch (error) {
        res.status(403).json({ error: 'Role verification failed' });
    }
};

// Sign up route
router.post('/signup', async (req, res) => {
    const { email, password, role } = req.body;

    try {
        // Create auth user
        const { data: { user }, error: signUpError } = await supabase.auth.signUp({
            email,
            password,
            options: {
                emailRedirectTo: `${authConfig.SITE_URL}${authConfig.REDIRECT_URL}`
            }
        });

        if (signUpError) throw signUpError;

        // Create user profile with role
        const { error: profileError } = await supabase
            .from('user_profiles')
            .insert([{
                user_id: user.id,
                email: user.email,
                role: role,
                verified: false
            }]);

        if (profileError) throw profileError;

        res.json({ message: 'Please check your email to verify your account' });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Sign in route
router.post('/signin', async (req, res) => {
    const { email, password } = req.body;

    try {
        const { data: { user, session }, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) throw error;

        // Check if email is verified
        const { data: profile } = await supabase
            .from('user_profiles')
            .select('verified, role')
            .eq('user_id', user.id)
            .single();

        if (!profile.verified) {
            throw new Error('Please verify your email first');
        }

        res.json({
            user,
            session,
            role: profile.role
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Password reset request
router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;

    try {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${authConfig.SITE_URL}/reset-password`
        });

        if (error) throw error;
        res.json({ message: 'Password reset instructions sent to your email' });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Update password
router.post('/update-password', checkAuth, async (req, res) => {
    const { password } = req.body;

    try {
        const { error } = await supabase.auth.updateUser({
            password: password
        });

        if (error) throw error;
        res.json({ message: 'Password updated successfully' });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

module.exports = { router, checkAuth, checkRole }; 