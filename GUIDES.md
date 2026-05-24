# BROKE N BUILT SERVICES - Setup & Deployment Guides

---

## 📧 1. EMAIL SETUP (Send inquiries to brokenbuiltservices@gmail.com)

### Step 1: Create a .env file
Create a file named `.env` in the project folder with:

```env
# === GMAIL SMTP (Use App Password) ===
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=brokenbuiltservices@gmail.com
EMAIL_PASS=your-16-digit-app-password
EMAIL_TO=brokenbuiltservices@gmail.com
EMAIL_FROM=brokenbuiltservices@gmail.com

# === AI CHATBOT ===
OPENAI_API_KEY=sk-your-openai-api-key
```

### Step 2: Generate Gmail App Password
1. Go to https://myaccount.google.com/security
2. Turn ON **2-Step Verification** (if not already on)
3. Go to https://myaccount.google.com/apppasswords
4. Select "Mail" and "Windows Computer"
5. Click **Generate** — you'll get a 16-character code like `abcd efgh ijkl mnop`
6. Copy that code and put it as `EMAIL_PASS` in `.env` (remove spaces)

### Step 3: Restart the server
```bash
node server.js
```

Now every time someone fills the contact form, you'll get an email at **brokenbuiltservices@gmail.com** with all their details.

---

## 🚀 2. DEPLOY TO RENDER (Free Hosting)

### What you get:
- Live website at: `https://broke-n-built-services.onrender.com`
- Free SSL certificate (HTTPS)
- Automatic deploys when you push to GitHub
- 100% free (no credit card needed for first 30 days, then $7/month or free tier)

### Step-by-step:

#### A. Push code to GitHub
```bash
cd C:\Users\Dell\Desktop\FREEBUFF
git add .
git commit -m "Multi-page website with images, email, chatbot"
git push
```

#### B. Connect to Render
1. Go to https://dashboard.render.com
2. Sign up with your GitHub account
3. Click **New +** → **Web Service**
4. Connect your GitHub repository (`uddiammu-png/broke-n-built-services`)
5. Fill in:
   - **Name**: `broke-n-built-services`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free
6. Click **Advanced** → **Add Environment Variable**:
   - `NODE_VERSION` = `18`
   - `EMAIL_HOST` = `smtp.gmail.com`
   - `EMAIL_PORT` = `587`
   - `EMAIL_USER` = `brokenbuiltservices@gmail.com`
   - `EMAIL_PASS` = `your-16-digit-app-password`
   - `EMAIL_TO` = `brokenbuiltservices@gmail.com`
   - `EMAIL_FROM` = `brokenbuiltservices@gmail.com`
   - `OPENAI_API_KEY` = `sk-your-openai-api-key`
7. Click **Create Web Service**

Your site will be live in 2-3 minutes at `https://broke-n-built-services.onrender.com` 🎉

---

## 🔍 3. GOOGLE SEARCH CONSOLE (Appear in Google Search)

### Step 1: Submit your site to Google
1. Go to https://search.google.com/search-console
2. Sign in with your Google account (same as brokenbuiltservices@gmail.com)
3. Click **Add Property** → **URL prefix**
4. Enter: `https://broke-n-built-services.onrender.com`
5. Click **Continue**

### Step 2: Verify ownership
Choose **HTML tag** method:
1. Copy the meta tag Google gives you
2. Add it inside the `<head>` section of your `index.html` (I can do this for you)
3. Save and deploy
4. Click **Verify** in Google Search Console

### Step 3: Submit your Sitemap
1. In Google Search Console, go to **Sitemaps** (left menu)
2. Enter: `sitemap.xml`
3. Click **Submit**

### Step 4: Check performance
- After a few days, check the **Performance** tab to see how many people find you on Google
- Submit to Google Business Profile (maps.google.com) for local search visibility

---

## 🤖 4. AI CHATBOT SETUP

The chatbot already works with smart fallback responses (without any API key). To enable real AI responses:

### Option A: OpenAI (you have a key)
Add to your `.env` file:
```env
OPENAI_API_KEY=sk-your-actual-key-here
```

### Option B: OpenRouter (free alternative)
1. Go to https://openrouter.ai/keys
2. Sign up (no credit card needed - get free credits)
3. Copy your API key
4. Add to `.env`:
```env
OPENROUTER_API_KEY=sk-or-your-key-here
```

---

## 🖼️ 5. ADD YOUR LOGO

1. Send me the logo image file
2. I'll add it to the `images/` folder as `logo.png`
3. I'll update the website to show it in the navbar and footer

---

## 🌍 6. GOOGLE BUSINESS PROFILE (Appear on Google Maps & Local Search)

This is how customers in Bangalore find you when they search "renovation near me" or "best renovation company Bangalore" on Google!

### What you get:
- ✅ Show up on **Google Maps** when people search for renovation services
- ✅ Appear in the **local 3-pack** at the top of Google search results
- ✅ Customers can **call, message, or get directions** directly from Google
- ✅ Collect **reviews** from happy customers
- ✅ Post **photos of your projects** (before/after)

---

### Step 1: Go to Google Business Profile
Open your browser and go to:
**https://business.google.com**

Sign in with: **brokenbuiltservices@gmail.com**

---

### Step 2: Add Your Business
Click **"Add your business"** or **"Create a profile"**

---

### Step 3: Fill in Business Details

Use these exact details:

| Field | Value |
|-------|-------|
| **Business Name** | `BROKE N BUILT SERVICES` |
| **Category** | Search and select **"Renovation Contractor"** or **"Construction Company"** |
| **Phone** | `+91 7019300855` |
| **Website** | `https://broke-n-built-services.onrender.com/` |

---

### Step 4: Enter Your Address

```
#8, Adibyraveshwara Nilaya, 3rd Floor
Green Wood Street, Cheemasandra
Virgonagar Post
Bangalore - 560049
Karnataka
```

**Important:** Since you visit client sites (not a walk-in office), Google will ask:
> "Do you serve customers at this location?"

Select **"Yes, I serve customers at my location"** → this makes your address visible on Maps.

If you prefer to hide your exact address (since you go to clients):
- Select **"No, I deliver goods or serve customers at their location"**
- Then you can set a **service area** like: **Bangalore, Karnataka**
- This way your business shows up for people searching in Bangalore but your home address stays private

---

### Step 5: Set Service Area (Recommended)

If you selected "serve at customer location":
1. Click **Add service area**
2. Start typing and add:
   - `Bangalore`
   - `Whitefield`
   - `Electronic City`
   - `HSR Layout`
   - `Koramangala`
   - `Indiranagar`
   - `JP Nagar`
   - `Yelahanka`
   - (Add any other areas you work in)

This makes your business show up when someone in any of these areas searches!

---

### Step 6: Add Business Hours

| Day | Hours |
|-----|-------|
| Monday - Saturday | 9:00 AM – 7:00 PM |
| Sunday | Appointment only (check "Open by appointment") |

---

### Step 7: Add Photos (Crucial!)

Google profiles **with photos** get 42% more requests for directions and 35% more clicks!

Upload at least:
- 📸 **Logo** → `/images/logo.png` (you already have this!)
- 🏠 **Cover photo** → Use `/images/hero-bg.jpg` or `/images/about-renovation.jpg`
- 🛠️ **Project photos** → Add before/after shots of your work
- 🏗️ **Team photo** → `/images/construction-team.jpg`

---

### Step 8: Write a Business Description

Copy and paste this description:

```
BROKE N BUILT SERVICES is Bangalore's trusted renovation and space transformation company with 12+ years of experience and 150+ completed projects. We specialize in transforming damaged, outdated, and incomplete spaces into functional, modern environments.

Services: Renovation Works, False Ceiling Installation, Painting & Finishing, Flooring Solutions, Partition Works, Electrical & Plumbing, Custom Interiors, Repair & Maintenance, and Complete Space Transformation.

We serve residential and commercial clients across Bangalore with quality craftsmanship, smart design, and timely execution.

📞 Call us at +91 7019300855 for a free consultation and quote!
```

---

### Step 9: Set Service Categories

Select **all that apply**:
- ✅ Renovation Contractor
- ✅ Interior Designer
- ✅ Painting Contractor
- ✅ Flooring Contractor
- ✅ Construction Company
- ✅ Home Improvement Service

---

### Step 10: Verification

Google will send a **postcard** to your business address with a verification code.
- 📬 Takes **5-10 days** to arrive by post
- 📮 Enter the code on your Google Business Profile dashboard
- ✅ Once verified, your profile goes live on Google Maps!

**Faster option (if available):** Google may offer **phone verification** or **email verification** — choose that if you see it!

---

### Step 11: Finish & Optimize

After verification, complete your profile:

- [ ] **Add Q&A** — Add common questions like "Do you offer free quotes?" and answer them
- [ ] **Add posts** — Share project photos as "Updates" (like social media posts)
- [ ] **Ask for reviews** — After completing a project, send clients the review link:
      `https://g.page/r/your-business-slug/review`
      (Google will give you this link after verification)
- [ ] **Link to Google Search Console** — Under **Performance** > **Google Search Console**, link your account

---

### Step 12: Share Your Google Maps Link

Once verified, your business will have a Google Maps link like:
`https://maps.google.com/?cid=XXXXXXXXXX`

Share this on your website, WhatsApp, and with clients! I can add it to your website footer once you give me the link.

---

## ⏱️ Timeline Expectations

| Time | What Happens |
|------|-------------|
| Now | Create profile & submit for verification |
| 5-10 days | Postcard arrives with verification code |
| After verification | Profile appears on Google Maps within 48 hours |
| 2-4 weeks | Start appearing in local search results |
| 1-3 months | Build reviews → Move up in rankings |

---

## 📈 Pro Tips

1. **Reviews matter most** — A 5-star review is the #1 factor for showing up in local search. Always ask happy clients to leave a review!
2. **Post regularly** — Share at least 1 photo per week on your profile
3. **Respond to every review** — Reply to all 5-star and even 1-star reviews professionally
4. **Keep hours updated** — Especially during holidays
5. **Use GBP Insights** — See how many people found you on Maps, called you, or visited your website

---

## ✅ Quick Checklist

- [ ] Got Gmail App Password? → Create `.env` file
- [ ] Added OpenRouter API key → AI Chatbot active
- [ ] Submitted sitemap to Google Search Console
- [ ] Created Google Business Profile
- [ ] Waiting for verification postcard (5-10 days)
- [ ] Send me your company logo ✅ Done!

Need help with any step? Just ask me!
