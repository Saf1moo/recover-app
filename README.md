# 🌿 Recover App — Deployment Guide

## Which platform should I use?

| | Netlify | Cloudflare Pages |
|---|---|---|
| **Ease of deploy** | ⭐⭐⭐⭐⭐ Drag & drop | ⭐⭐⭐⭐ Git-based |
| **Speed** | Fast | ⚡ Faster (400+ edge locations) |
| **Free bandwidth** | 100GB/month | Unlimited |
| **Free sites** | 1 per team | Unlimited |
| **Custom domain** | ✅ Free | ✅ Free |
| **Verdict** | Best for quick deploy | Best long-term |

**Recommendation:** Use **Netlify** to get it live in 2 minutes right now. Switch to **Cloudflare** later if you want.

---

## 🚀 Option A — Netlify (easiest, 2 minutes)

### Step 1: Install dependencies & build

Open a terminal in this folder and run:

```bash
npm install
npm run build
```

This creates a `dist/` folder.

### Step 2: Deploy

1. Go to **[app.netlify.com/drop](https://app.netlify.com/drop)**
2. Drag the `dist/` folder into the browser window
3. Done — you get a live URL instantly (e.g. `https://recover-abc123.netlify.app`)

### Step 3 (optional): Custom domain

1. In Netlify → Site settings → Domain management → Add custom domain
2. Follow the DNS instructions

---

## ☁️ Option B — Cloudflare Pages (best performance)

### Step 1: Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
# Create a repo on github.com, then:
git remote add origin https://github.com/YOUR_USERNAME/recover-app.git
git push -u origin main
```

### Step 2: Deploy on Cloudflare

1. Go to **[pages.cloudflare.com](https://pages.cloudflare.com)**
2. Click "Create a project" → "Connect to Git"
3. Select your repo
4. Set:
   - **Framework preset:** Vite
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
5. Click "Save and Deploy"

Future pushes to `main` auto-deploy.

---

## 📱 Install as a phone app (PWA)

Once deployed, open the URL on your phone:

**iPhone (Safari):**
1. Tap the Share button (box with arrow)
2. Tap "Add to Home Screen"
3. Tap "Add"
→ App appears on your home screen, opens full-screen

**Android (Chrome):**
1. Tap the three-dot menu
2. Tap "Add to Home screen" or "Install app"
3. Tap "Add"
→ App appears on your home screen

---

## 🖼 Replace the app icons

The current icons are placeholder green squares. To make a real icon:

1. Create a 512×512 PNG image of your choice (you can use [favicon.io](https://favicon.io) or Canva)
2. Replace `public/icon-192.png` and `public/icon-512.png`
3. Rebuild and redeploy

---

## 🔒 Privacy note

All data is stored in your browser's `localStorage`. Nothing is sent to any server. Each device has its own data. To sync between devices, you'd need to add a backend (ask Claude to help with that).

---

## 🛠 Development (running locally)

```bash
npm install
npm run dev
```

Opens at `http://localhost:5173`
