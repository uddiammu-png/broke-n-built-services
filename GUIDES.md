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

## ✅ Quick Checklist

- [ ] Got Gmail App Password? → Create `.env` file
- [ ] Got OpenAI API key? → Add to `.env`
- [ ] Push to GitHub → Connect to Render → Site goes live
- [ ] Submit sitemap to Google Search Console
- [ ] Send me your company logo

Need help with any step? Just ask me!
