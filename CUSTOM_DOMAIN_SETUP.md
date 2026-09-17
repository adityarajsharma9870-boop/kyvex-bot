# 🌐 How to Host Kyvex on Custom Domain (Kyvex.com) via Render.com

---

## 📋 Pre-requisites & Ready Files
All files in this folder are already committed to git on branch `main`.
* `.gitignore` is configured to protect your Discord bot token.
* `render.yaml` Blueprint is included for automatic configuration.

---

## 🚀 Step 1: Create a GitHub Repository & Push

1. Open [github.com/new](https://github.com/new) and create a repository named **`kyvex`** (can be Private or Public).
2. Copy your repository link (e.g., `https://github.com/YOUR_USERNAME/kyvex.git`).
3. In VS Code terminal or PowerShell run:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/kyvex.git
   git push -u origin main
   ```

---

## ☁️ Step 2: Deploy on Render.com (100% Free)

1. Go to **[render.com](https://render.com)** and sign in with GitHub.
2. Click **New +** (top right) -> **Web Service**.
3. Connect your **`kyvex`** repository.
4. Settings:
   * **Name**: `kyvex-web`
   * **Region**: Singapore or Frankfurt (or nearest to you)
   * **Branch**: `main`
   * **Runtime**: `Node`
   * **Build Command**: `npm install`
   * **Start Command**: `npm start`
   * **Instance Type**: `Free`
5. Scroll down to **Environment Variables** and add these:
   | Key | Value |
   |---|---|
   | `BOT_TOKEN` | `MTU0NTgwNDY3NzQzNjk0MDMzOQ.GwM1JH.ha-D3xPDTiKlEkR-hFopLjj9r9PlDZJrpDGwhk` |
   | `CLIENT_ID` | `1545804677436940339` |
   | `DASHBOARD_URL` | `https://kyvex.com` |
   | `DEFAULT_VOLUME` | `70` |
6. Click **Deploy Web Service**.
   * Render will build and launch your bot + web dashboard in ~1 minute!
   * You will get a temporary URL like: `https://kyvex-web.onrender.com`

---

## 🔒 Step 3: Connect Custom Domain (Kyvex.com)

1. In your Render Dashboard, go to your service -> **Settings**.
2. Scroll to the **Custom Domains** section.
3. Click **Add Custom Domain** and add:
   * `kyvex.com`
   * `www.kyvex.com`
4. Render will tell you the DNS records needed.

---

## 🌍 Step 4: Add DNS Records in Hostinger (or your DNS Provider)

Go to your **Hostinger Control Panel** -> **Domains** -> **kyvex.com** -> **DNS / Nameservers**:

Add or edit the following records:

| Type | Name | Content / Points to | TTL |
|---|---|---|---|
| **A** | `@` | `216.24.57.1` *(Render Root IP)* | 300 / Auto |
| **CNAME** | `www` | `kyvex-web.onrender.com` *(Your Render URL)* | 300 / Auto |

> [!NOTE]
> DNS propagation typically takes 2 to 15 minutes. Once detected, Render will automatically issue a **Free SSL Certificate (HTTPS)** with green lock 🔒.
> Your website will be permanently live 24/7 at **https://kyvex.com**!
