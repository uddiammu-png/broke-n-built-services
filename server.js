require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
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

// ====== MIDDLEWARE ======
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));



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

PORTFOLIO / PROJECTS (50+ completed projects):

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
      <li>🏠 <strong>Portfolio</strong> — see our 50+ completed projects</li>
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
    <p>We've completed <strong>50+ projects</strong> across Bangalore! Here's a selection:</p>
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
    <li>🏗️ <strong>Portfolio:</strong> 50+ projects completed — residential & commercial</li>
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
});
