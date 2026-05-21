/**
 * ORAI Insight Hub - Main Server
 * Express.js backend with MongoDB, JWT auth, cron jobs
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');
const cron = require('node-cron');

// Route imports
const authRoutes        = require('./routes/auth');
const meetingRoutes     = require('./routes/meetings');
const botRoutes         = require('./routes/bots');
const clientRoutes      = require('./routes/clients');
const upsellRoutes      = require('./routes/upsell');
const requirementRoutes = require('./routes/requirements');
const analyticsRoutes   = require('./routes/analytics');

// Utils
const { sendExpiryReminders } = require('./utils/emailService');

const app = express();

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// ─── Database Connection ──────────────────────────────────────────────────────
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/orai_insight_hub')
  .then(() => console.log('✅ MongoDB connected successfully'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth',         authRoutes);
app.use('/api/users',        require('./routes/users'));
app.use('/api/meetings',     meetingRoutes);              // FIX: removed duplicate
app.use('/api/bots',         botRoutes);
app.use('/api/clients',      clientRoutes);
app.use('/api/upsell',       upsellRoutes);
app.use('/api/requirements', requirementRoutes);
app.use('/api/analytics',    analyticsRoutes);
app.use('/api/whatsapp',     require('./routes/whatsappRoutes'));
app.use('/api/healthchecks', require('./routes/healthCheckRoutes'));
app.use('/api/import',       require('./routes/importRoutes'));
app.use('/api/tickets',      require('./routes/ticketRoutes'));
app.use('/api/invoices',     require('./routes/invoiceRoutes'));
app.use('/api/payments',     require('./routes/paymentRoutes'));
app.use('/api/expenses',     require('./routes/expenseRoutes'));
app.use('/api/agent',        require('./routes/agentRoutes'));
app.use('/api/tasks', require('./modules/dailyTasks/routes'));
app.use('/api/members',     require('./routes/memberRoutes'));
app.use('/api/proposals',    require('./routes/proposalRoutes'));
app.use('/api',              require('./routes/ai'));      // FIX: moved above app.listen()

// ─── Microsoft Teams Auth (separate from app auth) ────────────────────────────
app.use('/teams-auth',       require('./routes/teamsAuth'));

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'ORAI Insight Hub API is running',
    timestamp: new Date()
  });
});

// ─── Serve Frontend for All Non-API Routes ────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// ─── Error Handler ────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Server Error:', err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ─── Cron Jobs ────────────────────────────────────────────────────────────────
const { initCronJobs } = require('./utils/cronJobs');
initCronJobs();


// ─── Start Server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 ORAI Insight Hub server running on port ${PORT}`);
  console.log(`🌐 Dashboard:    http://localhost:${PORT}`);
  console.log(`📊 Environment:  ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Teams Auth:   http://localhost:${PORT}/teams-auth/login`);
  console.log(`❤️  Health:       http://localhost:${PORT}/api/health`);
});

module.exports = app;