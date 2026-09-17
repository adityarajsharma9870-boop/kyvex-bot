# ⚡ Astrial Discord Music Bot 🎵

> High-Quality, Khatarnak Discord Music Bot inspired by **Astrial**!  
> Powered by **Discord.js v14**, **DisTube v5**, **DAVE Voice Encryption (2026 E2EE Protocol)**, and a sleek **Dark Gold Controller UI**.

---

## 🌟 Features

- 🎛️ **Signature Astrial Music Controller**:
  - Live ASCII/Emoji Progress Bar (`🔘▬▬▬▬▬▬▬▬▬▬▬▬` `01:42 / 03:50`)
  - Interactive Action Buttons: Play/Pause, Skip, Stop, Loop Mode, Shuffle, Volume -10%, Volume +10%, Queue, Autoplay.
  - Dropdown Select Menu for **Real-Time Audio Filters** (Bassboost Low/High, 8D / 3D Surround, Nightcore, Vaporwave, Karaoke, Echo).
- 🎧 **Multi-Platform Audio Playback**:
  - **YouTube**: Search by song name or direct link / playlist.
  - **Spotify**: Play Spotify tracks, albums, and playlists.
  - **SoundCloud**: Stream songs and artist sets.
  - **Direct Links**: MP3, AAC, FLAC, WAV, and online radio streams.
- 🌐 **2026 Voice Encryption Ready**:
  - Pre-configured with `@snazzah/davey` and bundled `ffmpeg-static` to support Discord's mandatory DAVE E2EE audio encryption.
- 📻 **Smart Autoplay**:
  - Automatically searches and queues related tracks when the playlist ends.
- 🔁 **24/7 Mode (`/247`)**:
  - Keeps the bot connected in your voice channel 24/7.
- 📜 **Paginated Queue**:
  - `/queue` with page navigation buttons (Previous / Next).

---

## 🛠️ Step-by-Step Setup Guide (Step-by-Step Kaise Setup Karein)

### Step 1: Discord Developer Portal Setup
1. Open the [Discord Developer Portal](https://discord.com/developers/applications) in your browser.
2. Click **New Application** (top right) and name it **Astrial** (or your desired name).
3. Under **General Information**, copy the **APPLICATION ID** (this is your `CLIENT_ID`).
4. In the left menu, click **Bot**:
   - Click **Reset Token** (or **Add Bot**) and copy your **Token** (this is your `BOT_TOKEN`).
   - Scroll down to **Privileged Gateway Intents** and **TURN ON**:
     - ✅ **Presence Intent**
     - ✅ **Server Members Intent**
     - ✅ **Message Content Intent**
   - Click **Save Changes**.

### Step 2: Invite the Bot to your Discord Server
1. In the left menu, click **OAuth2** ➔ **URL Generator**.
2. Under **SCOPES**, check:
   - ✅ `bot`
   - ✅ `applications.commands`
3. Under **BOT PERMISSIONS**, check:
   - ✅ **Administrator** (recommended for easiest setup) OR:
     - *Send Messages, Embed Links, Attach Files, Read Message History, Use External Emojis, Connect, Speak, Use Voice Activity*.
4. Copy the generated **OAuth2 URL** at the bottom, paste it into your browser, and invite the bot to your server!

### Step 3: Configure `.env` File
Open the `.env` file in this folder:
```env
BOT_TOKEN=your_bot_token_here
CLIENT_ID=your_client_id_here
GUILD_ID=your_test_server_id_here (optional, for instant slash command registration)

DEFAULT_VOLUME=70
BOT_EMBED_COLOR=#F1C40F
BOT_FOOTER_TEXT="Astrial • High Quality Music"
```
*(Replace `your_bot_token_here` and `your_client_id_here` with the values copied from Step 1)*.

---

## 🚀 How to Run the Bot (Bot Kaise Chalayein)

Open Terminal in this folder (`c:\Users\Aditya Raj\Desktop\DISCORD BOT`):

### 1. Register Slash Commands:
```bash
npm run deploy
```
*(Ye saare `/play`, `/pause`, `/queue` commands Discord par register kar dega)*

### 2. Start the Bot:
```bash
npm start
```
Bot will start and show:
```
==============================================
           ASTRIAL MUSIC BOT ONLINE           
==============================================
✔ Logged in as: Astrial#6218
✔ Voice DAVE E2EE protocol loaded!
✔ Audio Engine: DisTube v5 + FFmpeg Static
==============================================
```

---

## 📋 Slash Commands List

| Command | Description |
| :--- | :--- |
| `/play <query>` | Play any song/playlist from YouTube, Spotify, SoundCloud, or URL |
| `/pause` | Pause music playback |
| `/resume` | Resume paused playback |
| `/skip` | Skip to the next song |
| `/stop` | Stop music, clear queue, and leave voice channel |
| `/queue [page]` | View current queue with interactive page buttons |
| `/nowplaying` | Show currently playing song with live progress bar and buttons |
| `/volume <1-150>` | Adjust playback volume |
| `/loop <off\|song\|queue>` | Set repeat mode |
| `/shuffle` | Shuffle upcoming songs in the queue |
| `/autoplay` | Toggle smart autoplay recommendations |
| `/filter <name>` | Apply sound effects (Bassboost, 8D, Nightcore, Vaporwave, etc.) |
| `/seek <seconds>` | Seek to timestamp in the track |
| `/jump <position>` | Jump directly to a track number in the queue |
| `/remove <position>` | Remove a specific song from queue |
| `/clear` | Clear upcoming songs from queue |
| `/247` | Toggle 24/7 voice channel stay |
| `/help` | Open interactive Astrial help menu |
| `/ping` | Check bot latency and gateway ping |

---

## 🎮 Interactive Music Controller

Jab bhi koi song play hoga, bot ek Astrial golden card send karega with:
- **Button Row 1**: ⏯️ Play/Pause | ⏭️ Skip | ⏹️ Stop | 🔁 Loop | 🔀 Shuffle
- **Button Row 2**: 🔉 Vol -10% | 🔊 Vol +10% | 📜 Queue | 📻 Autoplay
- **Select Menu**: 🎛️ Audio Filters (Bassboost, 8D, Nightcore, Vaporwave, Karaoke, etc.)

Sabhi controls par click karke aap directly bina commands type kiye music control kar sakte hain!

---

## 🛡️ Server Verification Gatekeeper

1-Click Verification System with bundled Cyberpunk 3D "VERIFY NOW" shield banner:
- `/verification setup <channel> <role> [description] [button_text] [banner_url] [color]`: Configure and deploy verification embed with 1-click verify button.
- `/verification send`: Re-deploy the verification panel into the configured channel.
- `/verification status`: Check currently configured verification channel, role, and button status.
- `/verification disable`: Disable server verification gatekeeper.
- `/verify`: Standalone command for members to self-verify.

---

## 👥 Mass Role Automation (Bulk Role Add/Remove)

Assign or remove roles for all server members safely without hitting Discord rate limits:
- `/massrole add <role> [target: humans|all|bots]`: Give a role to all members with live progress bar and auto-pacing (280ms delay).
- `/massrole remove <role> [target: humans|all|bots]`: Strip a role from all members at once.
- `/roleall add <role> [target]`: Quick alias for `/massrole add`.
- `/roleall remove <role> [target]`: Quick alias for `/massrole remove`.

---

## 🌐 Web Dashboard (http://localhost:3000)

- **Verification & Roles Tab**:
  - Live Discord Message Canvas Preview (updates instantly as you type).
  - 1-Click "Send Verification Panel To Channel" deployment.
  - 1-Click Mass Role Tool with member filters (Humans Only / Everyone / Bots Only) and real-time status output.
