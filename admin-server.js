require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const session = require('express-session');
const db = require('./db');

const app = express();

// Trust Render's reverse proxy for secure cookies (HTTPS)
app.set('trust proxy', 1);

const PORT = process.env.PORT || process.env.ADMIN_PORT || 3001;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'venki@1981';
const ADMIN_NAME = process.env.ADMIN_NAME || 'Venkatesh Reddy G';
const INQUIRIES_FILE = path.join(__dirname, 'admin-inquiries', 'inquiries.json');

// ====== SESSION SETUP ======
app.use(session({
  secret: process.env.SESSION_SECRET || 'broke-n-built-admin-secret-2025',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000,
    sameSite: 'lax'
  }
}));

// ====== MIDDLEWARE ======
app.use(cors({
  origin: process.env.MAIN_SITE_URL || '*',
  credentials: true
}));
app.use(express.json());

// ====== SERVE ADMIN PAGE (must be BEFORE static to prevent index.html from overriding) ======
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

app.use(express.static(path.join(__dirname), {
  index: false // Disable serving index.html for root path
}));

// ====== ADMIN AUTH MIDDLEWARE ======
function requireAdmin(req, res, next) {
  if (req.session && req.session.isAdmin) return next();
  res.status(401).json({ error: 'Unauthorized. Please log in.' });
}

// ====== ADMIN AUTH ENDPOINTS ======
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    req.session.isAdmin = true;
    return res.json({ success: true, adminName: ADMIN_NAME });
  }
  res.status(401).json({ error: 'Invalid password' });
});

app.post('/api/admin/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

app.get('/api/admin/check', (req, res) => {
  res.json({
    authenticated: !!(req.session && req.session.isAdmin),
    emailConfigured: isEmailConfigured,
    adminName: ADMIN_NAME
  });
});

// ====== ADMIN API ENDPOINTS (Protected) ======
app.get('/api/admin/stats', requireAdmin, async (req, res) => {
  try {
    const stats = await db.getInquiryStats();
    res.json(stats);
  } catch (err) {
    console.error('Error fetching stats:', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

app.get('/api/admin/inquiries', requireAdmin, async (req, res) => {
  try {
    const inquiries = await db.loadInquiries();
    res.json(inquiries);
  } catch (err) {
    console.error('Error fetching inquiries:', err);
    res.status(500).json({ error: 'Failed to fetch inquiries' });
  }
});

app.put('/api/admin/inquiries/:id/read', requireAdmin, async (req, res) => {
  try {
    const inquiry = await db.updateInquiry(req.params.id, { read: true });
    if (!inquiry) return res.status(404).json({ error: 'Inquiry not found' });
    res.json({ success: true, inquiry });
  } catch (err) {
    console.error('Error marking inquiry as read:', err);
    res.status(500).json({ error: 'Failed to update inquiry' });
  }
});

app.put('/api/admin/inquiries/:id/unread', requireAdmin, async (req, res) => {
  try {
    const inquiry = await db.updateInquiry(req.params.id, { read: false });
    if (!inquiry) return res.status(404).json({ error: 'Inquiry not found' });
    res.json({ success: true, inquiry });
  } catch (err) {
    console.error('Error marking inquiry as unread:', err);
    res.status(500).json({ error: 'Failed to update inquiry' });
  }
});

app.delete('/api/admin/inquiries/:id', requireAdmin, async (req, res) => {
  try {
    const deleted = await db.deleteInquiry(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Inquiry not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting inquiry:', err);
    res.status(500).json({ error: 'Failed to delete inquiry' });
  }
});

app.get('/api/admin/email-status', requireAdmin, (req, res) => {
  res.json({ configured: isEmailConfigured, host: emailConfig.host, to: emailConfig.to });
});

// ====== EMAIL NOTIFICATION CONFIG ======
const emailConfig = {
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT || '587'),
  user: process.env.EMAIL_USER,
  pass: process.env.EMAIL_PASS,
  to: process.env.EMAIL_TO || 'brokenbuiltservices@gmail.com',
  from: process.env.EMAIL_FROM || 'noreply@broke-n-built-services.com'
};

const isEmailConfigured = !!(emailConfig.host && emailConfig.user && emailConfig.pass);

async function sendEmailNotification(inquiry) {
  if (!isEmailConfigured) {
    console.log('⚠️  Email not configured. Set EMAIL_HOST, EMAIL_USER, EMAIL_PASS in .env');
    return false;
  }

  try {
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      host: emailConfig.host,
      port: emailConfig.port,
      secure: emailConfig.port === 465,
      auth: { user: emailConfig.user, pass: emailConfig.pass }
    });

    const serviceLabel = inquiry.service && inquiry.service !== 'Not specified'
      ? inquiry.service.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
      : 'Not specified';

    await transporter.sendMail({
      from: `"Broke N Built Admin" <${emailConfig.from}>`,
      to: emailConfig.to,
      subject: `🔨 New Inquiry from ${inquiry.name} - ${serviceLabel}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head><style>
          body { font-family: 'Segoe UI', Arial, sans-serif; background: #f0f2f5; padding: 20px; margin: 0; }
          .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); padding: 32px 24px; text-align: center; }
          .header h1 { color: #ffffff; margin: 0; font-size: 1.5rem; font-weight: 700; }
          .header p { color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 0.9rem; }
          .body { padding: 28px 24px; }
          .field { margin-bottom: 20px; display: flex; }
          .field-label { font-size: 0.75rem; color: #888; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600; min-width: 120px; padding-top: 2px; }
          .field-value { font-size: 1rem; color: #1a1a1a; font-weight: 500; }
          .field-value a { color: #f97316; text-decoration: none; }
          .message-box { background: #f8f9fa; border-left: 4px solid #f97316; padding: 16px 20px; border-radius: 8px; margin-top: 4px; width: 100%; }
          .message-box p { margin: 0; color: #444; line-height: 1.7; }
          .divider { height: 1px; background: linear-gradient(90deg, transparent, #e0e0e0, transparent); margin: 24px 0; }
          .footer { padding: 20px 24px; background: #f8f9fa; border-top: 1px solid #eee; font-size: 0.75rem; color: #999; text-align: center; }
          .badge { display: inline-block; background: rgba(249,115,22,0.1); color: #ea580c; padding: 2px 12px; border-radius: 12px; font-size: 0.75rem; font-weight: 600; }
          @media (max-width: 480px) { .field { flex-direction: column; } .field-label { margin-bottom: 4px; } }
        </style></head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔨 New Client Inquiry</h1>
              <p>BROKE N BUILT SERVICES - Admin Dashboard</p>
            </div>
            <div class="body">
              <div class="field"><div class="field-label">Name</div><div class="field-value">${inquiry.name}</div></div>
              <div class="field"><div class="field-label">Email</div><div class="field-value"><a href="mailto:${inquiry.email}">${inquiry.email}</a></div></div>
              <div class="field"><div class="field-label">Mobile</div><div class="field-value">${inquiry.phone || 'Not provided'}</div></div>
              <div class="field"><div class="field-label">Service</div><div class="field-value"><span class="badge">${serviceLabel}</span></div></div>
              <div class="divider"></div>
              <div class="field"><div class="field-label">Message</div><div class="message-box"><p>${(inquiry.message || '').replace(/\n/g, '<br>')}</p></div></div>
              <div class="divider"></div>
              <div class="field"><div class="field-label">Received</div><div class="field-value">${new Date(inquiry.timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })} IST</div></div>
            </div>
            <div class="footer">BROKE N BUILT SERVICES &bull; Admin Dashboard</div>
          </div>
        </body>
        </html>
      `
    });

    console.log('✅ Admin: Email notification sent to', emailConfig.to);
    return true;
  } catch (err) {
    console.error('❌ Admin: Failed to send email:', err.message);
    return false;
  }
}

// ====== CONTACT FORM ENDPOINT ======
app.post('/api/contact', async (req, res) => {
  const { name, email, phone, service, message } = req.body;

  if (!name || !email || !phone || !message) {
    return res.status(400).json({ error: 'Name, email, mobile number, and message are required' });
  }

  const inquiry = { name, email, phone: phone || 'Not provided', service: service || 'Not specified', message };

  console.log('📋 Admin: New Contact Inquiry:', inquiry);

  // Save via db module (PostgreSQL or file-based)
  const saved = await db.addInquiry(inquiry);

  // Save individual backup file
  try {
    const inquiriesDir = path.join(__dirname, 'admin-inquiries');
    if (!fs.existsSync(inquiriesDir)) fs.mkdirSync(inquiriesDir, { recursive: true });
    fs.writeFileSync(path.join(inquiriesDir, `inquiry-${Date.now()}.json`), JSON.stringify(inquiry, null, 2));
  } catch (err) {
    console.error('Failed to save backup inquiry file:', err.message);
  }

  await sendEmailNotification(inquiry);
  res.json({ success: true, message: 'Thank you! We have received your inquiry and will contact you shortly.' });
});

// ====== SYNC INQUIRIES FROM MAIN SERVER ======
const SYNC_SECRET = process.env.ADMIN_SYNC_SECRET || '';

app.post('/api/sync/inquiry', async (req, res) => {
  const token = req.headers['x-sync-token'] || req.query.token;
  if (SYNC_SECRET && token !== SYNC_SECRET) {
    return res.status(401).json({ error: 'Invalid sync token' });
  }

  const { name, email, phone, service, message, timestamp } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Name, email, and message are required' });
  }

  const inquiry = {
    name,
    email,
    phone: phone || 'Not provided',
    service: service || 'Not specified',
    message,
    timestamp: timestamp || new Date().toISOString()
  };

  await db.addInquiry(inquiry);
  console.log('🔄 Admin: Synced inquiry from main server:', name);
  res.json({ success: true });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', adminName: ADMIN_NAME });
});

// ====== 404 HANDLER ======
app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Endpoint not found' });
  }
  res.status(404).sendFile(path.join(__dirname, '404.html'));
});
// ====== START SERVER ======
app.listen(PORT, async () => {
  console.log(`
╔══════════════════════════════════════════════════════╗
║                                                      ║
║   🔐  BROKE N BUILT - Admin Server                    ║
║                                                      ║
║   🌐  http://localhost:${PORT}                         ║
║   👤  Admin: ${ADMIN_NAME}                             ║
║   📧  brokenbuiltservices@gmail.com                  ║
║                                                      ║
╚══════════════════════════════════════════════════════╝
  `);

  // Initialise database
  await db.init({ inquiriesFile: INQUIRIES_FILE });
  if (db.isUsingPostgres()) {
    await db.createTable();
    await db.migrateFileInquiries(INQUIRIES_FILE);
  }

  const stats = await db.getInquiryStats();
  console.log(`📊  ${stats.total} inquiries stored${db.isUsingPostgres() ? ' (PostgreSQL)' : ''}`);
});
