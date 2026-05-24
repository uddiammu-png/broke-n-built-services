require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const session = require('express-session');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const ADMIN_ROUTE = (process.env.ADMIN_ROUTE || 'admin').replace(/^\/+|\/+$/g, '');
const ADMIN_NAME = process.env.ADMIN_NAME || 'Admin';
const ADMIN_SYNC_URL = process.env.ADMIN_SYNC_URL || '';
const SYNC_SECRET = process.env.SYNC_SECRET || '';
const INQUIRIES_FILE = path.join(__dirname, 'inquiries', 'inquiries.json');

// ====== MIGRATE OLD INDIVIDUAL FILES (runs once at startup) ======
(function migrateOldInquiries() {
  const inquiriesDir = path.join(__dirname, 'inquiries');
  if (!fs.existsSync(inquiriesDir)) return;
  if (fs.existsSync(INQUIRIES_FILE)) return;

  const files = fs.readdirSync(inquiriesDir).filter(f => f.startsWith('inquiry-') && f.endsWith('.json'));
  if (files.length === 0) return;

  const inquiries = files.map(f => {
    try {
      const data = JSON.parse(fs.readFileSync(path.join(inquiriesDir, f), 'utf-8'));
      return { ...data, id: f.replace('inquiry-', '').replace('.json', ''), read: false };
    } catch { return null; }
  }).filter(Boolean);

  if (inquiries.length > 0) {
    // Write combined file — db.migrateFileInquiries will pick it up
    try {
      const dir = path.dirname(INQUIRIES_FILE);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(INQUIRIES_FILE, JSON.stringify(inquiries, null, 2));
      console.log(`📦 Migrated ${inquiries.length} existing inquiries to combined storage`);
    } catch (err) {
      console.error('Failed to write combined inquiries file:', err.message);
    }
  }
})();

// ====== SESSION SETUP ======
app.use(session({
  secret: process.env.SESSION_SECRET || 'broke-n-built-admin-secret-2025',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: false,
    maxAge: 24 * 60 * 60 * 1000,
    sameSite: 'lax'
  }
}));

// ====== MIDDLEWARE ======
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

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
    return res.json({ success: true });
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

    const mobileDisplay = inquiry.phone && inquiry.phone !== 'Not provided' ? `<a href="tel:${inquiry.phone}">${inquiry.phone}</a>` : 'Not provided';
    const serviceLabel = inquiry.service && inquiry.service !== 'Not specified'
      ? inquiry.service.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
      : 'Not specified';

    const mailOptions = {
      from: `"Broke N Built Website" <${emailConfig.from}>`,
      to: emailConfig.to,
      subject: `🔨 New Inquiry from ${inquiry.name} - ${serviceLabel}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head><style>
          body { font-family: 'Segoe UI', Arial, sans-serif; background: #f0f2f5; padding: 20px; margin: 0; }
          .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); padding: 32px 24px; text-align: center; }
          .header h1 { color: #ffffff; margin: 0; font-size: 1.5rem; font-weight: 700; letter-spacing: 0.5px; }
          .header p { color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 0.9rem; }
          .body { padding: 28px 24px; }
          .field { margin-bottom: 20px; display: flex; }
          .field-label { font-size: 0.75rem; color: #888; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600; min-width: 120px; padding-top: 2px; }
          .field-value { font-size: 1rem; color: #1a1a1a; font-weight: 500; }
          .field-value a { color: #f97316; text-decoration: none; }
          .field-value a:hover { text-decoration: underline; }
          .message-box { background: #f8f9fa; border-left: 4px solid #f97316; padding: 16px 20px; border-radius: 8px; margin-top: 4px; width: 100%; }
          .message-box p { margin: 0; color: #444; line-height: 1.7; font-size: 0.95rem; }
          .divider { height: 1px; background: linear-gradient(90deg, transparent, #e0e0e0, transparent); margin: 24px 0; }
          .footer { padding: 20px 24px; background: #f8f9fa; border-top: 1px solid #eee; font-size: 0.75rem; color: #999; text-align: center; line-height: 1.6; }
          .badge { display: inline-block; background: rgba(249,115,22,0.1); color: #ea580c; padding: 2px 12px; border-radius: 12px; font-size: 0.75rem; font-weight: 600; }
          @media (max-width: 480px) { .field { flex-direction: column; } .field-label { margin-bottom: 4px; } }
        </style></head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔨 New Client Inquiry</h1>
              <p>BROKE N BUILT SERVICES - Website Contact Form</p>
            </div>
            <div class="body">
              <div class="field">
                <div class="field-label">Name</div>
                <div class="field-value">${inquiry.name}</div>
              </div>
              <div class="field">
                <div class="field-label">Email</div>
                <div class="field-value"><a href="mailto:${inquiry.email}">${inquiry.email}</a></div>
              </div>
              <div class="field">
                <div class="field-label">Mobile</div>
                <div class="field-value">${mobileDisplay}</div>
              </div>
              <div class="field">
                <div class="field-label">Service</div>
                <div class="field-value"><span class="badge">${serviceLabel}</span></div>
              </div>
              <div class="divider"></div>
              <div class="field">
                <div class="field-label">Message</div>
                <div class="message-box"><p>${inquiry.message.replace(/\n/g, '<br>')}</p></div>
              </div>
              <div class="divider"></div>
              <div class="field">
                <div class="field-label">Received</div>
                <div class="field-value">${new Date(inquiry.timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })} IST</div>
              </div>
            </div>
            <div class="footer">
              BROKE N BUILT SERVICES &bull; #8, Adibyraveshwara Nilaya, 3rd Floor, Green Wood Street, Cheemasandra, Bangalore-560049<br>
              📞 +91 7019300855 &bull; 📧 brokenbuiltservices@gmail.com
            </div>
          </div>
        </body>
        </html>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log('✅ Email notification sent to', emailConfig.to);
    return true;
  } catch (err) {
    console.error('❌ Failed to send email:', err.message);
    return false;
  }
}

// ====== AI CHATBOT ENDPOINT ======
app.post('/api/chat', async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: 'Message is required' });

  const apiKey = process.env.OPENAI_API_KEY || process.env.OPENROUTER_API_KEY;
  const isOpenRouter = !!process.env.OPENROUTER_API_KEY;
  const defaultKey = 'your-openai-api-key-here';

  if (apiKey && apiKey !== defaultKey) {
    try {
      const OpenAI = require('openai');
      const clientConfig = { apiKey };
      if (isOpenRouter) clientConfig.baseURL = 'https://openrouter.ai/api/v1';
      const openai = new OpenAI(clientConfig);

      const systemPrompt = `You are a helpful AI assistant for "BROKE N BUILT SERVICES", a renovation and space transformation company based in Bangalore, India.

COMPANY INFO:
- Name: BROKE N BUILT SERVICES
- Phone: +91 7019300855
- Email: brokenbuiltservices@gmail.com
- Address: #8, Adibyraveshwara Nilaya, 3rd Floor, Green Wood Street, Cheemasandra, Virgonagar Post, Bangalore-560049
- GST: 29ABFFB0879G1Z9
- Working Hours: Mon-Sat 9AM-7PM, Sunday by appointment

SERVICES:
1. Renovation Works - Complete renovation of damaged/outdated spaces
2. False Ceiling Installation - Modern ceiling designs (gypsum, POP, metal, wood)
3. Painting & Finishing - Interior/exterior painting, texture finishes, waterproofing
4. Flooring Solutions - Tiles, wood, laminate, polished concrete, vinyl
5. Partition Works - Glass, drywall, modular partitions for homes/offices
6. Electrical & Plumbing - Complete wiring and plumbing solutions
7. Custom Interiors - Modular kitchens, wardrobes, cabinets, custom furniture
8. Repair & Maintenance - Ongoing property maintenance
9. Complete Transformation - End-to-end space transformation

ABOUT: The company transforms damaged, outdated, and incomplete spaces into functional, modern, and visually impressive environments. They focus on quality craftsmanship, smart design, and timely execution for residential, commercial, and workspace projects.

PORTFOLIO / PROJECTS (150+ completed projects):

Residential Projects:
1. KSR CORDILIA - Premium residential apartment complex with modern finishes, false ceiling installations, and complete interior fit-out.
2. SHARADHA ENCLAVE - Gated community enclave with comprehensive renovation, painting, flooring, and electrical works across multiple units.
3. VARS ALLSEASONS - All-seasons residential complex featuring custom interiors, modular kitchen installations, and complete space transformation.
4. ZANITH RESIDENCE - High-end residential project with premium painting, decorative finishes, custom wardrobes, and luxury interior solutions.
5. VARIO - Modern residential development with end-to-end renovation services including plumbing, electrical, and interior finishing.

Commercial Projects:
1. Karle Infra Pvt Ltd - Office interior fit-out, partition works, false ceiling with integrated lighting, and complete electrical solutions for corporate infrastructure.
2. Soliza Partners - Professional office space transformation with modern workstations, glass partitions, reception area design, and premium finishing.
3. Dental Levelle - Complete interior fit-out for a dental clinic including reception, treatment rooms, false ceiling, plumbing, and hygienic finishing.
4. Karle Home Pvt Ltd - Large-scale residential development project with comprehensive renovation works, painting, flooring, and turnkey interior solutions.
5. Northstar Elements - Commercial space transformation with modern office interiors, custom furniture, partition systems, and complete MEP works.

When asked about projects or portfolio, enthusiastically share details about relevant projects. Mention we have 5 residential and 5 commercial projects showcased on our website.

TONE: Friendly, professional, enthusiastic about helping customers transform their spaces. Keep responses concise but helpful. Use emojis sparingly.`;

      const model = isOpenRouter ? 'openrouter/free' : 'gpt-4o-mini';
      const completion = await openai.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        max_tokens: 500,
        temperature: 0.7
      });

      const reply = completion.choices[0].message.content;
      return res.json({ reply });
    } catch (err) {
      console.error('AI API error:', err.message);
    }
  }

  const reply = generateSmartResponse(message);
  res.json({ reply });
});

function generateSmartResponse(message) {
  const msg = message.toLowerCase();

  if (msg.includes('kitchen') || msg.includes('renovation') || msg.includes('remodel')) {
    return `<p>🏠 <strong>Kitchen Renovation</strong></p>
    <p>Great choice! Our kitchen renovation service includes:</p>
    <ul>
      <li>🔨 Demolition of existing structure</li>
      <li>🪵 Custom cabinetry & countertops</li>
      <li>🔌 Plumbing & electrical updates</li>
      <li>🎨 Modern finishing & painting</li>
    </ul>
    <p>📞 Call us at <strong>+91 7019300855</strong> for a free quote or email <strong>brokenbuiltservices@gmail.com</strong></p>`;
  }

  if (msg.includes('price') || msg.includes('cost') || msg.includes('charge') || msg.includes('rate') || msg.includes('pricing') || msg.includes('budget')) {
    return `<p>💰 <strong>Pricing Information</strong></p>
    <p>Our pricing depends on the scope of work, materials, and space size. We offer <strong>free on-site consultations and quotes</strong>!</p>
    <p>📞 Call <strong>+91 7019300855</strong> or email <strong>brokenbuiltservices@gmail.com</strong> to schedule a visit.</p>
    <p>We provide transparent pricing with no hidden costs. ✅</p>`;
  }

  if (msg.includes('visit') || msg.includes('site') || msg.includes('appointment') || msg.includes('schedule') || msg.includes('book') || msg.includes('inspection')) {
    return `<p>📅 <strong>Schedule a Site Visit</strong></p>
    <p>We'd love to visit your space! Here's how to book:</p>
    <p>📞 Call: <strong>+91 7019300855</strong></p>
    <p>📧 Email: <strong>brokenbuiltservices@gmail.com</strong></p>
    <p>📍 Location: Bangalore (and surrounding areas)</p>
    <p>Our team will visit, assess your needs, and provide a detailed quote — free of charge! 🎉</p>`;
  }

  if (msg.includes('hello') || msg.includes('hi') || msg.includes('hey') || msg.includes('good morning') || msg.includes('good evening')) {
    return `<p>👋 Hello! Welcome to <strong>BROKE N BUILT SERVICES</strong>!</p>
    <p>I'm your AI assistant. Here's how I can help:</p>
    <ul>
      <li>📋 <strong>Service inquiries</strong> — learn about our offerings</li>
      <li>💰 <strong>Pricing info</strong> — get cost estimates</li>
      <li>📅 <strong>Book a visit</strong> — schedule a free consultation</li>
      <li>🏠 <strong>Portfolio</strong> — see our 150+ completed projects</li>
    </ul>
    <p>What would you like to know? 😊</p>`;
  }

  if (msg.includes('false ceiling') || msg.includes('ceiling')) {
    return `<p>🔨 <strong>False Ceiling Installation</strong></p>
    <p>We install modern false ceilings for aesthetic appeal and improved acoustics. Options include:</p>
    <ul>
      <li>Gypsum board ceilings</li>
      <li>POP (Plaster of Paris) designs</li>
      <li>Metal grid ceilings</li>
      <li>Wooden panel ceilings</li>
    </ul>
    <p>📞 Call us at <strong>+91 7019300855</strong> for a quote!</p>`;
  }

  if (msg.includes('paint') || msg.includes('painting')) {
    return `<p>🎨 <strong>Painting & Finishing</strong></p>
    <p>We offer premium painting services including:</p>
    <ul>
      <li>Interior & exterior painting</li>
      <li>Texture finishes</li>
      <li>Waterproofing coatings</li>
      <li>Wallpaper installation</li>
    </ul>
    <p>Transform your walls with our expert team!</p>`;
  }

  if (msg.includes('floor') || msg.includes('flooring') || msg.includes('tile')) {
    return `<p>🏗️ <strong>Flooring Solutions</strong></p>
    <p>Expert flooring installation services:</p>
    <ul>
      <li>Ceramic & vitrified tiles</li>
      <li>Wooden & laminate flooring</li>
      <li>Polished concrete</li>
      <li>Vinyl flooring</li>
    </ul>`;
  }

  if (msg.includes('electrical') || msg.includes('plumbing') || msg.includes('pipe') || msg.includes('wire')) {
    return `<p>⚡ <strong>Electrical & Plumbing Solutions</strong></p>
    <p>Complete electrical and plumbing services for renovation and new builds. Our certified team handles everything from wiring to pipe fittings with safety and quality.</p>`;
  }

  if (msg.includes('interior') || msg.includes('furniture') || msg.includes('cabinet') || msg.includes('wardrobe')) {
    return `<p>🛋️ <strong>Custom Interiors</strong></p>
    <p>Bespoke interior solutions including:</p>
    <ul>
      <li>Modular kitchens</li>
      <li>Wardrobes & cabinets</li>
      <li>Custom furniture</li>
      <li>Office workstations</li>
    </ul>`;
  }

  if (msg.includes('commercial') || msg.includes('office') || msg.includes('workspace')) {
    return `<p>🏢 <strong>Commercial & Workspace Solutions</strong></p>
    <p>We specialize in transforming commercial spaces with:</p>
    <ul>
      <li>Office interior fit-outs</li>
      <li>Partition walls</li>
      <li>Workstation installation</li>
      <li>False ceiling & lighting</li>
      <li>Reception area design</li>
    </ul>`;
  }

  if (msg.includes('location') || msg.includes('address') || msg.includes('where') || msg.includes('bangalore') || msg.includes('find')) {
    return `<p>📍 <strong>Our Location</strong></p>
    <p>#8, Adibyraveshwara Nilaya, 3rd Floor,<br>
    Green Wood Street, Cheemasandra,<br>
    Virgonagar Post, Bangalore-560049</p>
    <p>📞 Phone: <strong>+91 7019300855</strong></p>
    <p>📧 Email: <strong>brokenbuiltservices@gmail.com</strong></p>`;
  }

  if (msg.includes('thank') || msg.includes('thanks')) {
    return `<p>🙏 You're welcome! We're glad to help.</p>
    <p>If you have any more questions, feel free to ask. Or if you're ready to get started, give us a call at <strong>+91 7019300855</strong>!</p>
    <p>Have a great day! 😊</p>`;
  }

  if (msg.includes('project') || msg.includes('portfolio') || msg.includes('work done') || msg.includes('completed') || msg.includes('past work') || msg.includes('experience') || msg.includes('cordilia') || msg.includes('sharadha') || msg.includes('allseasons') || msg.includes('zanith') || msg.includes('vario') || msg.includes('karle') || msg.includes('soliza') || msg.includes('levelle') || msg.includes('northstar')) {
    return `<p>🏗️ <strong>Our Project Portfolio</strong></p>
    <p>We've completed <strong>150+ projects</strong> across Bangalore! Here's a selection:</p>
    <p><strong>🏠 Residential:</strong></p>
    <ul>
      <li><strong>KSR CORDILIA</strong> — Premium apartment complex</li>
      <li><strong>SHARADHA ENCLAVE</strong> — Gated community enclave</li>
      <li><strong>VARS ALLSEASONS</strong> — Residential complex</li>
      <li><strong>ZANITH RESIDENCE</strong> — Premium residences</li>
      <li><strong>VARIO</strong> — Modern residential development</li>
    </ul>
    <p><strong>🏢 Commercial:</strong></p>
    <ul>
      <li><strong>Karle Infra Pvt Ltd</strong> — Corporate infrastructure</li>
      <li><strong>Soliza Partners</strong> — Corporate office</li>
      <li><strong>Dental Levelle</strong> — Dental clinic fit-out</li>
      <li><strong>Karle Home Pvt Ltd</strong> — Real estate development</li>
      <li><strong>Northstar Elements</strong> — Commercial space</li>
    </ul>
    <p>📸 View full details at <strong>broke-n-built-services.onrender.com/projects</strong></p>
    <p>📞 Call <strong>+91 7019300855</strong> to discuss your project!</p>`;
  }

  return `<p>Thank you for reaching out to <strong>BROKE N BUILT SERVICES</strong>! 😊</p>
  <p>Here's how we can help:</p>
  <ul>
    <li>🏠 <strong>Services:</strong> Renovation, false ceiling, painting, flooring, partitions, electrical/plumbing, custom interiors, and complete transformations</li>
    <li>🏗️ <strong>Portfolio:</strong> 150+ projects completed — residential & commercial</li>
    <li>📍 <strong>Location:</strong> Bangalore, India</li>
    <li>📞 <strong>Call:</strong> +91 7019300855</li>
    <li>📧 <strong>Email:</strong> brokenbuiltservices@gmail.com</li>
  </ul>
  <p>Could you tell me more about your project? I'd be happy to provide specific information! 🛠️</p>`;
}

// ====== EMAIL CONFIG ENDPOINT ======
app.get('/api/admin/email-status', requireAdmin, (req, res) => {
  res.json({ configured: isEmailConfigured, host: emailConfig.host, to: emailConfig.to });
});

// ====== SMTP DIAGNOSTIC ENDPOINT ======
app.get('/api/admin/diagnose-email', requireAdmin, async (req, res) => {
  const diagnostic = {
    configured: isEmailConfigured,
    host: emailConfig.host,
    port: emailConfig.port,
    user: emailConfig.user,
    to: emailConfig.to,
    from: emailConfig.from,
    passLength: emailConfig.pass ? emailConfig.pass.length : 0,
    passHasSpaces: emailConfig.pass ? emailConfig.pass.includes(' ') : false
  };

  if (!isEmailConfigured) {
    diagnostic.error = 'Email not configured. Set EMAIL_HOST, EMAIL_USER, EMAIL_PASS.';
    return res.json(diagnostic);
  }

  // Test SMTP connection
  try {
    const nodemailer = require('nodemailer');

    const transporter = nodemailer.createTransport({
      host: emailConfig.host,
      port: emailConfig.port,
      secure: emailConfig.port === 465,
      auth: { user: emailConfig.user, pass: emailConfig.pass },
      tls: { rejectUnauthorized: false },
      connectionTimeout: 10000
    });

    // Test 1: Verify SMTP connection
    diagnostic.connectionTest = { label: 'SMTP Connection (verify())' };
    try {
      const start = Date.now();
      await transporter.verify();
      diagnostic.connectionTest.passed = true;
      diagnostic.connectionTest.ms = Date.now() - start;
    } catch (err) {
      diagnostic.connectionTest.passed = false;
      diagnostic.connectionTest.error = err.message;
      diagnostic.connectionTest.code = err.code || null;
      diagnostic.connectionTest.command = err.command || null;
    }

    // Test 2: Send a test email
    diagnostic.sendTest = { label: 'Send Test Email' };
    try {
      const start = Date.now();
      const info = await transporter.sendMail({
        from: `"SMTP Diagnostic" <${emailConfig.from}>`,
        to: emailConfig.to,
        subject: `🧪 SMTP Diagnostic Test — ${new Date().toLocaleString()}`,
        text: `This is an automated diagnostic test from BROKE N BUILT SERVICES.\n\nIf you received this, the SMTP email system is working correctly from the server.\n\nSent at: ${new Date().toISOString()}`
      });
      diagnostic.sendTest.passed = true;
      diagnostic.sendTest.ms = Date.now() - start;
      diagnostic.sendTest.messageId = info.messageId;
    } catch (err) {
      diagnostic.sendTest.passed = false;
      diagnostic.sendTest.error = err.message;
      diagnostic.sendTest.code = err.code || null;
      diagnostic.sendTest.command = err.command || null;
    }

    // Test 3: Attempt WITHOUT spaces in password (in case Gmail rejects spaces)
    if (emailConfig.pass && emailConfig.pass.includes(' ')) {
      diagnostic.noSpacesTest = { label: 'Password without spaces' };
      try {
        const noSpaceTransporter = nodemailer.createTransport({
          host: emailConfig.host,
          port: emailConfig.port,
          secure: emailConfig.port === 465,
          auth: { user: emailConfig.user, pass: emailConfig.pass.replace(/ /g, '') },
          tls: { rejectUnauthorized: false },
          connectionTimeout: 10000
        });
        const start = Date.now();
        await noSpaceTransporter.verify();
        diagnostic.noSpacesTest.passed = true;
        diagnostic.noSpacesTest.ms = Date.now() - start;
        diagnostic.noSpacesTest.note = 'Password works without spaces — update EMAIL_PASS to remove spaces';
      } catch (err) {
        diagnostic.noSpacesTest.passed = false;
        diagnostic.noSpacesTest.error = err.message;
      }
    }

    diagnostic.conclusion = diagnostic.connectionTest.passed && diagnostic.sendTest.passed
      ? '✅ SMTP is fully working. Check your Spam/Promotions folder — emails may be filtered.'
      : '❌ SMTP has issues. See test results above for details. You may need to check: the app password, Gmail security settings, or Render\'s outbound network.';

  } catch (err) {
    diagnostic.criticalError = err.message;
    diagnostic.conclusion = '❌ Fatal error running diagnostic.';
  }

  res.json(diagnostic);
});

// ====== CONTACT FORM ENDPOINT ======
app.post('/api/contact', async (req, res) => {
  const { name, email, phone, service, message } = req.body;

  if (!name || !email || !phone || !message) {
    return res.status(400).json({ error: 'Name, email, mobile number, and message are required' });
  }

  const inquiry = { name, email, phone: phone || 'Not provided', service: service || 'Not specified', message };

  console.log('📋 New Contact Inquiry:', inquiry);

  // Save via db module (PostgreSQL or file-based) — ESSENTIAL, keep awaited
  const saved = await db.addInquiry(inquiry);
  inquiry.timestamp = saved.timestamp;

  // Respond to client IMMEDIATELY — don't make them wait for email/backup/sync
  res.json({
    success: true,
    message: 'Thank you! We have received your inquiry and will contact you shortly.'
  });

  // ====== BACKGROUND TASKS (fire-and-forget — not awaited but still run in same process) ======

  // Save backup file asynchronously
  (async () => {
    try {
      const inquiriesDir = path.join(__dirname, 'inquiries');
      if (!fs.existsSync(inquiriesDir)) fs.mkdirSync(inquiriesDir, { recursive: true });
      await fs.promises.writeFile(path.join(inquiriesDir, `inquiry-${Date.now()}.json`), JSON.stringify(inquiry, null, 2));
    } catch (err) {
      console.error('Failed to save backup inquiry file:', err.message);
    }
  })();

  // Send email notification in background
  sendEmailNotification(inquiry).catch(err => {
    console.error('Background email failed:', err.message);
  });

  // Sync inquiry to standalone admin server (if configured) — in background
  if (ADMIN_SYNC_URL) {
    console.log('🔄 Syncing inquiry to admin server:', ADMIN_SYNC_URL);
    try {
      const https = require('https');
      const http = require('http');
      const transport = ADMIN_SYNC_URL.startsWith('https') ? https : http;
      const body = JSON.stringify(inquiry);
      const url = new URL('/api/sync/inquiry', ADMIN_SYNC_URL);
      const syncReq = transport.request(url.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
          ...(SYNC_SECRET ? { 'x-sync-token': SYNC_SECRET } : {})
        },
        timeout: 5000
      }, (syncRes) => {
        console.log('🔄 Synced inquiry to admin server:', syncRes.statusCode);
      });
      syncReq.on('error', (err) => {
        console.log('⚠️  Failed to sync inquiry to admin server:', err.message);
      });
      syncReq.write(body);
      syncReq.end();
    } catch (err) {
      console.log('⚠️  Failed to sync inquiry to admin server:', err.message);
    }
  } else if (process.env.NODE_ENV === 'production') {
    console.log('⚠️  ADMIN_SYNC_URL not set — inquiry NOT synced to admin server');
  }
});

// ====== CRAWLER ESSENTIALS (explicit routes for SEO) ======
app.get('/robots.txt', (req, res) => {
  res.type('text/plain');
  res.sendFile(path.join(__dirname, 'robots.txt'));
});

app.get('/sitemap.xml', (req, res) => {
  res.type('application/xml');
  res.sendFile(path.join(__dirname, 'sitemap.xml'));
});

// ====== SERVE PAGES ======
const pages = {
  '/': 'index.html',
  '/about': 'about.html',
  '/services': 'services.html',
  '/projects': 'projects.html',
  '/contact': 'contact.html'
};

app.get(Object.keys(pages), (req, res) => {
  const page = pages[req.path];
  if (page) res.sendFile(path.join(__dirname, page));
});

app.get(`/${ADMIN_ROUTE}`, (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

// ====== 404 HANDLER (serves proper 404 page, not index.html) ======
app.use((req, res) => {
  // If it's an API route, return JSON
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
║   🏗️  BROKE N BUILT SERVICES - Website Server        ║
║                                                      ║
║   🌐  http://localhost:${PORT}                         ║
║   🔐  Admin: http://localhost:${PORT}/${ADMIN_ROUTE}      ║
║   📧  brokenbuiltservices@gmail.com                  ║
║   📞  +91 7019300855                                 ║
║                                                      ║
║   📄  Pages: Home | About | Services | Projects | Contact  ║
║   🔑  Admin Password set in .env file                ║
║                                                      ║
╚══════════════════════════════════════════════════════╝
  `);

  // Initialise database
  await db.init();
  if (db.isUsingPostgres()) {
    await db.createTable();
    // Migrate existing file-based inquiries into PostgreSQL
    await db.migrateFileInquiries(INQUIRIES_FILE);
  }

  const stats = await db.getInquiryStats();
  console.log(`📊  ${stats.total} inquiries stored${db.isUsingPostgres() ? ' (PostgreSQL)' : ''}`);

  if (!ADMIN_SYNC_URL && process.env.NODE_ENV === 'production') {
    console.log('⚠️  ADMIN_SYNC_URL not set — inquiries will NOT be synced to admin server');
    console.log('   Set ADMIN_SYNC_URL in your .env or Render environment variables');
  }
});
