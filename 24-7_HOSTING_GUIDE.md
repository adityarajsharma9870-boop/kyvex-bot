# 🌐 Bot Ko 24/7 Hamesha Online Kaise Rakhein (PC Off Hone Ke Baad Bhi)

---

## ❓ Pehle Samajhiye: PC Off Karne Par Bot Offline Kyu Hota Hai?

Jab aap apne computer par bot chalate hain (`npm start`), to bot aapke **PC ke CPU, RAM aur Internet** par chal raha hota hai. 
Jaise hi aap:
- Command prompt / Terminal close karte hain
- Ya apna **PC Shut Down / Sleep** karte hain

Aapke computer ka internet aur processor band ho jata hai, jiski wajah se bot **offline** chala jata hai.

> 💡 **Solution:** Bot ko hamesha 24/7 online rakhne ke liye humein isse ek **Free Cloud Server / Online Hosting** par dalna padega. Cloud server 24 ghante internet se connect rehta hai, chahe aapka PC off ho ya on!

---

## 🛑 Step 0: PC Ka Load Khatam Karein (Local Bot Ko Band Karein)

Aapke computer par bot background me chal raha tha aur Windows Startup me laga tha, jisse PC par CPU/RAM load pad raha tha.
1. Apne folder me jakar **`stop-local-bot.bat`** par double-click karein.
2. Yeh aapke PC se bot ka load poori tarah band kar dega aur Windows Startup shortcut ko delete kar dega.
3. Ab aapka PC 100% free ho gaya!

---

## 🚀 Option 1: Discloud (1-Click Upload — Sabse Aasan, 100% Free & Recommended)

**Discloud** Discord bots ke liye best free cloud hosting hai. Yeh 24/7 chalta hai bina aapke PC ki zaroorat ke!

Humne aapke liye **`Kyvex-Publish-24-7.zip`** already latest fixed code ke saath generate kar di hai!

### Step-by-Step Guide:
1. **[discloud.com](https://discloud.com)** website open karein aur **Login with Discord** karein.
2. Discloud Dashboard me **"Add App"** ya **"Upload"** button par click karein.
3. Apne `DISCORD BOT` folder se **`Kyvex-Publish-24-7.zip`** file ko select karke upload kar dein (Aapko koi file compress karne ki zaroorat nahi hai, zip already ready hai).
4. **Commit / Upload** par click karein aur bot **Start** ho jayega!
5. ✅ **Mubarak ho!** Ab aapka bot 24 ghante online rahega chahe aapka PC band ho, sleep ho ya internet disconnect ho.

---

## ⚡ Option 2: Bot-Hosting.net (Free Discord Bot Hosting Panel)

Agar aapko ek control panel (Pterodactyl) pasand hai jahan live console aur files edit kar sakein:

1. **[bot-hosting.net](https://bot-hosting.net)** par jayein aur Discord se Login karein.
2. **Create Server** par click karein:
   - Server Type: **Node.js**
   - Plan: **Free**
3. Server banne ke baad **Manage Server / File Manager** me jayein.
4. Apni project files (`src`, `package.json`, `.env`) upload karein.
5. **Console** tab me jakar **Start** dabayein.
6. Yeh automatically dependencies install karega aur bot ko 24/7 online rakhega.

---

## ☁️ Option 3: Render.com + UptimeRobot (Free Cloud Web Service)

Humne aapke bot me **Keep-Alive Web Server** (`src/utils/keepAlive.js`) add kar diya hai, jisse Render par bot bina kisi error ke chalta hai.

1. Apne bot code ko **GitHub** par private repository me upload karein (`.env` ko chhodkar).
2. **[render.com](https://render.com)** par free account banayein.
3. **New +** ➔ **Web Service** select karein aur apna GitHub repo connect karein.
4. Settings:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
5. **Environment Variables** section me apne `.env` ke values dalein:
   - `BOT_TOKEN` = *aapka token*
   - `CLIENT_ID` = *aapka client id*
6. **Deploy** par click karein. Render aapko ek link dega (jaise `https://my-bot.onrender.com`).
7. Bot ko sleep hone se bachane ke liye **[uptimerobot.com](https://uptimerobot.com)** par jayein:
   - Free account banayein.
   - **Add New Monitor** ➔ HTTP(s) ➔ Render ka URL daal dein ➔ Interval: **5 minutes**.
8. ✅ Ab Render bot ko kabhi sleep nahi hone dega aur bot 24/7 online rahega!

---

## 💻 Option 4: Agar Ghar Par Purana Laptop / Mobile (Termux) Hai:

Agar aap koi external site use nahi karna chahte:
1. **Purana Laptop:** Kisi purane laptop par bot daal kar screen off karke power plug me laga kar chhod dein.
2. **Android Phone (Termux):** Android phone me Termux app me Node.js install karke bot 24/7 chala sakte hain.

---

## 🎵 Voice Channel Me 24/7 Kaise Rakkhein?
Jab bot online ho jaye, apne Discord server ke music voice channel me jayein aur command run karein:
```
/247
```
Isse bot voice channel me hamesha connect rahega chahe gaana baj raha ho ya na baj raha ho!
