require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// ====== EMAIL NOTIFICATION CONFIG ======
// Set up using environment variables:
// Option A: Gmail SMTP with App Password
//   EMAIL_HOST=smtp.gmail.com
//   EMAIL_PORT=587
//   EMAIL_USER=your-email@gmail.com
//   EMAIL_PASS=your-app-password
//   EMAIL_TO=brokenbuiltservices@gmail.com
//   EMAIL_FROM=your-email@gmail.com
//
// Option B: SendGrid
//   EMAIL_HOST=smtp.sendgrid.net
//   EMAIL_PORT=587
//   EMAIL_USER=apikey
//   EMAIL_PASS=your-sendgrid-api-key
//   EMAIL_TO=brokenbuiltservices@gmail.com
//   EMAIL_FROM=your-verified-sender@example.com

const emailConfig = {
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT || '587'),
  user: process.env.EMAIL_USER,
  pass: process.env.EMAIL_PASS,
  to: process.env.EMAIL_TO || 'brokenbuiltservices@gmail.com',
  from: process.env.EMAIL_FROM || 'noreply@broke-n-built-services.com'
};

const isEmailConfigured = !!(emailConfig.host && emailConfig.user && emailConfig.pass);

// Try to send email notification
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
      auth: {
        user: emailConfig.user,
        pass: emailConfig.pass
      }
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
          @media (max-width: 480px) {
            .field { flex-direction: column; }
            .field-label { margin-bottom: 4px; }
          }
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
  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  // Try AI provider if API key is configured (OpenAI or OpenRouter)
  const apiKey = process.env.OPENAI_API_KEY || process.env.OPENROUTER_API_KEY;
  const isOpenRouter = !!process.env.OPENROUTER_API_KEY;
  const defaultKey = 'your-openai-api-key-here';

  if (apiKey && apiKey !== defaultKey) {
    try {
      const OpenAI = require('openai');
      
      const clientConfig = { apiKey };
      
      if (isOpenRouter) {
        clientConfig.baseURL = 'https://openrouter.ai/api/v1';
      }
      
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

  // Smart fallback response
  const reply = generateSmartResponse(message);
  res.json({ reply });
});

// Smart fallback response generator
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
      <li>🏠 <strong>Design advice</strong> — discuss your project ideas</li>
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
  
  return `<p>Thank you for reaching out to <strong>BROKE N BUILT SERVICES</strong>! 😊</p>
  <p>Here's how we can help:</p>
  <ul>
    <li>🏠 <strong>Services:</strong> Renovation, false ceiling, painting, flooring, partitions, electrical/plumbing, custom interiors, and complete transformations</li>
    <li>📍 <strong>Location:</strong> Bangalore, India</li>
    <li>📞 <strong>Call:</strong> +91 7019300855</li>
    <li>📧 <strong>Email:</strong> brokenbuiltservices@gmail.com</li>
  </ul>
  <p>Could you tell me more about your project? I'd be happy to provide specific information! 🛠️</p>`;
}

// ====== CONTACT FORM ENDPOINT ======
app.post('/api/contact', async (req, res) => {
  const { name, email, phone, service, message } = req.body;

  if (!name || !email || !phone || !message) {
    return res.status(400).json({ error: 'Name, email, mobile number, and message are required' });
  }

  const inquiry = {
    name,
    email,
    phone: phone || 'Not provided',
    service: service || 'Not specified',
    message,
    timestamp: new Date().toISOString()
  };

  console.log('📋 New Contact Inquiry:', inquiry);

  // Save to local file for record
  try {
    const inquiriesDir = path.join(__dirname, 'inquiries');
    if (!fs.existsSync(inquiriesDir)) {
      fs.mkdirSync(inquiriesDir, { recursive: true });
    }
    const filename = `inquiry-${Date.now()}.json`;
    fs.writeFileSync(
      path.join(inquiriesDir, filename),
      JSON.stringify(inquiry, null, 2)
    );
  } catch (err) {
    console.error('Failed to save inquiry:', err.message);
  }

  // Try to send email notification
  await sendEmailNotification(inquiry);

  res.json({
    success: true,
    message: 'Thank you! We have received your inquiry and will contact you shortly.'
  });
});

// ====== SERVE PAGES ======
const pages = {
  '/': 'index.html',
  '/about': 'about.html',
  '/services': 'services.html',
  '/contact': 'contact.html'
};

app.get(Object.keys(pages), (req, res) => {
  const page = pages[req.path];
  if (page) {
    res.sendFile(path.join(__dirname, page));
  }
});

// 404 fallback
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'index.html'));
});

// ====== START SERVER ======
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════╗
║                                                      ║
║   🏗️  BROKE N BUILT SERVICES - Website Server        ║
║                                                      ║
║   🌐  http://localhost:${PORT}                         ║
║   📧  brokenbuiltservices@gmail.com                  ║
║   📞  +91 7019300855                                 ║
║                                                      ║
║   📄  Pages: Home | About | Services | Contact       ║
║                                                      ║
║   💡  Set EMAIL_HOST, EMAIL_USER, EMAIL_PASS in .env ║
║        to send inquiry notifications via email       ║
║                                                      ║
║   💡  Set OPENAI_API_KEY or OPENROUTER_API_KEY      ║
║        for AI chatbot (OpenRouter has free models)  ║
║                                                      ║
╚══════════════════════════════════════════════════════╝
  `);

  if (!isEmailConfigured) {
    console.log('⚠️  Email notifications not configured.');
    console.log('   Create a .env file with:');
    console.log('   EMAIL_HOST=smtp.gmail.com');
    console.log('   EMAIL_USER=your-email@gmail.com');
    console.log('   EMAIL_PASS=your-app-password');
    console.log('   EMAIL_TO=brokenbuiltservices@gmail.com\n');
  }
});
