require('dotenv').config();
require('@snazzah/davey'); // Ensure Discord DAVE voice encryption protocol is loaded

const { Client, GatewayIntentBits, Collection } = require('discord.js');
const { DisTube } = require('distube');
const { SpotifyPlugin } = require('@distube/spotify');
const { SoundCloudPlugin } = require('@distube/soundcloud');
const { DirectLinkPlugin } = require('@distube/direct-link');
const { KyvexYtDlpPlugin } = require('./plugins/kyvexYtDlp');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

const config = require('./config');
const logger = require('./utils/logger');
const { startKeepAlive } = require('./utils/keepAlive');

// Check Bot Token before initializing
if (!config.token || config.token.trim() === '' || config.token === 'your_discord_bot_token_here') {
  console.log(`\n${chalk.hex('#F1C40F').bold('==============================================')}`);
  console.log(`${chalk.red.bold('[SETUP REQUIRED] Discord Bot Token Missing!')}`);
  console.log(`${chalk.hex('#F1C40F').bold('==============================================')}`);
  console.log(chalk.yellow('Please open your .env file and set your BOT_TOKEN and CLIENT_ID:'));
  console.log(chalk.cyan('  1. Open c:\\Users\\Aditya Raj\\Desktop\\DISCORD BOT\\.env'));
  console.log(chalk.cyan('  2. Paste your BOT_TOKEN=... and CLIENT_ID=...'));
  console.log(chalk.cyan('  3. Run: npm run deploy (to register slash commands)'));
  console.log(chalk.cyan('  4. Run: npm start (to launch the bot)\n'));
  process.exit(0);
}

// 1. Initialize Discord Client with Security and Voice Intents
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.GuildWebhooks,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildEmojisAndStickers,
    GatewayIntentBits.GuildInvites,
    GatewayIntentBits.GuildIntegrations
  ]
});

client.commands = new Collection();
client.stayInVoice = {}; // Tracks 24/7 mode per guild

// Start lightweight keep-alive web server for 24/7 cloud hosting & uptime pings
startKeepAlive(client);

// 2. Initialize DisTube with Multi-Source Plugins and FFmpeg
const ffmpegPath = require('ffmpeg-static');

client.distube = new DisTube(client, {
  ffmpeg: {
    path: ffmpegPath
  },
  emitNewSongOnly: false,
  emitAddSongWhenCreatingQueue: false,
  emitAddListWhenCreatingQueue: false,
  plugins: [
    new SpotifyPlugin(),
    new SoundCloudPlugin(),
    new DirectLinkPlugin(),
    new KyvexYtDlpPlugin({ update: false })
  ]
});

// 3. Load Commands
const commandsPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(commandsPath);

for (const folder of commandFolders) {
  const folderPath = path.join(commandsPath, folder);
  if (!fs.statSync(folderPath).isDirectory()) continue;

  const commandFiles = fs.readdirSync(folderPath).filter((file) => file.endsWith('.js'));
  for (const file of commandFiles) {
    const filePath = path.join(folderPath, file);
    const command = require(filePath);
    if ('data' in command && 'execute' in command) {
      client.commands.set(command.data.name, command);
    }
  }
}
logger.info(`Loaded ${client.commands.size} slash commands.`);

// 4. Load Client Events
const clientEventsPath = path.join(__dirname, 'events', 'client');
if (fs.existsSync(clientEventsPath)) {
  const clientEventFiles = fs.readdirSync(clientEventsPath).filter((f) => f.endsWith('.js'));
  for (const file of clientEventFiles) {
    const event = require(path.join(clientEventsPath, file));
    if (event.once) {
      client.once(event.name, (...args) => event.execute(...args, client));
    } else {
      client.on(event.name, (...args) => event.execute(...args, client));
    }
  }
  logger.info(`Loaded ${clientEventFiles.length} Discord client events.`);
}

// 5. Load Security & Anti-Nuke Events
const securityEventsPath = path.join(__dirname, 'events', 'security');
if (fs.existsSync(securityEventsPath)) {
  const securityEventFiles = fs.readdirSync(securityEventsPath).filter((f) => f.endsWith('.js'));
  let totalSecurityEvents = 0;
  for (const file of securityEventFiles) {
    const eventModule = require(path.join(securityEventsPath, file));
    if (Array.isArray(eventModule)) {
      for (const event of eventModule) {
        if (event.name && typeof event.execute === 'function') {
          client.on(event.name, (...args) => event.execute(...args, client));
          totalSecurityEvents++;
        }
      }
    } else if (eventModule.name && typeof eventModule.execute === 'function') {
      client.on(eventModule.name, (...args) => eventModule.execute(...args, client));
      totalSecurityEvents++;
    }
  }
  logger.info(`Loaded ${totalSecurityEvents} Anti-Nuke, Anti-Raid & Auto-Mod security events.`);
}

// 6. Load DisTube Events
const distubeEventsPath = path.join(__dirname, 'events', 'distube');
if (fs.existsSync(distubeEventsPath)) {
  const distubeEventFiles = fs.readdirSync(distubeEventsPath).filter((f) => f.endsWith('.js'));
  for (const file of distubeEventFiles) {
    const event = require(path.join(distubeEventsPath, file));
    client.distube.on(event.name, (...args) => event.execute(...args));
  }
  logger.info(`Loaded ${distubeEventFiles.length} DisTube audio events.`);
}

// 7. Load Server Logging Events (Member, Message, Voice, Server, Channel, Role, Mod)
const loggingEventsPath = path.join(__dirname, 'events', 'logging');
if (fs.existsSync(loggingEventsPath)) {
  const loggingEventFiles = fs.readdirSync(loggingEventsPath).filter((f) => f.endsWith('.js'));
  let totalLoggingEvents = 0;
  for (const file of loggingEventFiles) {
    const eventModule = require(path.join(loggingEventsPath, file));
    if (Array.isArray(eventModule)) {
      for (const event of eventModule) {
        if (event.name && typeof event.execute === 'function') {
          client.on(event.name, (...args) => event.execute(...args, client));
          totalLoggingEvents++;
        }
      }
    } else if (eventModule.name && typeof eventModule.execute === 'function') {
      client.on(eventModule.name, (...args) => eventModule.execute(...args, client));
      totalLoggingEvents++;
    }
  }
  logger.info(`Loaded ${totalLoggingEvents} Server Logging events across ${loggingEventFiles.length} modules.`);
}

// 6. Global Error Prevention
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise);
  console.error(reason);
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
});

// 7. Login to Discord with auto-retry
async function connectToDiscord() {
  try {
    await client.login(config.token);
  } catch (err) {
    logger.error(`Discord login attempt failed (${err.message}). Retrying in 5 seconds...`);
    setTimeout(connectToDiscord, 5000);
  }
}
connectToDiscord();
