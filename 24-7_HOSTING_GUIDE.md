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

## 🚀 Option 1: Discloud (Sabse Aasan & Recommended — 100% Free)

**Discloud** khaaskar Discord bots ko host karne ke liye banaya gaya hai. Yeh sabse simple aur fast tareeqa hai.

### Step-by-Step Guide:
1. **[discloud.com](https://discloud.com)** website open karein aur apne **Discord Account** se login karein.
2. Humne aapke project me already `discloud.config` file ready kar di hai!
3. Apne computer me `DISCORD BOT` folder me jayein:
   - `node_modules` folder ko **select mat karein** (yeh upload nahi karna).
   - Baaki sabhi files aur folders ko select karein:
     - `src` folder
     - `package.json`
     - `package-lock.json`
     - `discloud.config`
     - `.env`
   - Right click ➔ **Compress to ZIP file** (jaise `bot.zip`).
4. Discloud Dashboard me jayein aur **Add App / Upload** par click karein.
5. Apna `bot.zip` upload karein aur **Start** par click karein.
6. ✅ **Ho gaya!** Ab aapka bot 24/7 online rahega, chahe aap apna PC poori tarah band kar dein.

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
