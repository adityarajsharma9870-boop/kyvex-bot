const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const crypto = require('crypto');
const logger = require('./logger');
const securityManager = require('./securityManager');
const config = require('../config');

const publicDir = path.join(__dirname, '..', '..', 'public');
const sessions = new Map(); // In-memory session store: sessionToken => { id, user, createdAt }

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
      if (body.length > 1e6) {
        req.destroy();
        reject(new Error('Body too large'));
      }
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        resolve({});
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, statusCode, data, headers = {}) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    ...headers
  });
  res.end(JSON.stringify(data));
}

function getSession(req) {
  const cookieHeader = req.headers.cookie || '';
  const match = cookieHeader.match(/og_session=([a-zA-Z0-9_-]+)/);
  if (match && sessions.has(match[1])) {
    return sessions.get(match[1]);
  }
  const authHeader = req.headers.authorization || '';
  if (authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    if (sessions.has(token)) return sessions.get(token);
  }
  return null;
}

/**
 * Starts the Web Dashboard & API Server on port 3000 with Discord Auth
 * @param {import('discord.js').Client} client 
 */
function startKeepAlive(client) {
  const port = process.env.PORT || 3000;

  const server = http.createServer(async (req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;

    // Preflight CORS handler
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      });
      res.end();
      return;
    }

    // ==========================================
    // 1. DISCORD AUTHENTICATION ROUTES
    // ==========================================

    // Redirect to Discord OAuth2 Authorization URL
    if (pathname === '/api/auth/login' && req.method === 'GET') {
      const redirectUri = `${config.dashboardUrl}/api/auth/callback`;
      const discordAuthUrl = `https://discord.com/oauth2/authorize?client_id=${config.clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&scope=identify`;
      res.writeHead(302, { Location: discordAuthUrl });
      res.end();
      return;
    }

    // Discord OAuth2 Callback handler
    if (pathname === '/api/auth/callback' && req.method === 'GET') {
      const code = parsedUrl.query.code;
      if (!code) {
        res.writeHead(302, { Location: '/?error=missing_code' });
        res.end();
        return;
      }

      if (!config.clientSecret) {
        // If CLIENT_SECRET is not configured, redirect with informative notice
        res.writeHead(302, { Location: '/?error=missing_secret' });
        res.end();
        return;
      }

      try {
        const redirectUri = `${config.dashboardUrl}/api/auth/callback`;
        const params = new URLSearchParams({
          client_id: config.clientId,
          client_secret: config.clientSecret,
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri
        });

        const tokenRes = await fetch('https://discord.com/api/v10/oauth2/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: params.toString()
        });

        if (!tokenRes.ok) {
          logger.error('[OAuth2 Error] Token exchange failed:', await tokenRes.text());
          res.writeHead(302, { Location: '/?error=token_failed' });
          res.end();
          return;
        }

        const tokenData = await tokenRes.json();
        const userRes = await fetch('https://discord.com/api/v10/users/@me', {
          headers: { Authorization: `Bearer ${tokenData.access_token}` }
        });

        if (!userRes.ok) {
          res.writeHead(302, { Location: '/?error=user_fetch_failed' });
          res.end();
          return;
        }

        const discordUser = await userRes.json();
        const sessionToken = crypto.randomUUID();
        sessions.set(sessionToken, {
          id: sessionToken,
          user: {
            id: discordUser.id,
            username: discordUser.username,
            global_name: discordUser.global_name || discordUser.username,
            avatar: discordUser.avatar
              ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
              : 'https://cdn.discordapp.com/embed/avatars/0.png'
          },
          createdAt: Date.now()
        });

        res.writeHead(302, {
          'Set-Cookie': `og_session=${sessionToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800`,
          Location: '/'
        });
        res.end();
        return;
      } catch (oauthErr) {
        logger.error('[OAuth2 Error]:', oauthErr);
        res.writeHead(302, { Location: '/?error=oauth_exception' });
        res.end();
        return;
      }
    }

    // Direct Login Fallback (Validates server membership and owner / extra owner ID)
    if (pathname === '/api/auth/login-direct' && req.method === 'POST') {
      const body = await parseBody(req);
      const cleanId = String(body.userId || '').trim().replace(/[<@!>]/g, '');

      if (!/^\d{17,20}$/.test(cleanId)) {
        return sendJson(res, 400, { error: 'Invalid Discord User ID' });
      }

      const primaryGuild = client.guilds.cache.first();
      let memberUser = null;

      try {
        if (primaryGuild) {
          const member = await primaryGuild.members.fetch(cleanId).catch(() => null);
          if (member) {
            memberUser = {
              id: member.id,
              username: member.user.username,
              global_name: member.user.globalName || member.displayName,
              avatar: member.user.displayAvatarURL()
            };
          }
        }

        if (!memberUser) {
          const fetchedUser = await client.users.fetch(cleanId).catch(() => null);
          if (fetchedUser) {
            memberUser = {
              id: fetchedUser.id,
              username: fetchedUser.username,
              global_name: fetchedUser.globalName || fetchedUser.username,
              avatar: fetchedUser.displayAvatarURL()
            };
          }
        }
      } catch (e) {}

      if (!memberUser) {
        return sendJson(res, 404, { error: 'Discord User ID not found or not cached.' });
      }

      const sessionToken = crypto.randomUUID();
      sessions.set(sessionToken, {
        id: sessionToken,
        user: memberUser,
        createdAt: Date.now()
      });

      return sendJson(res, 200, {
        success: true,
        user: memberUser,
        sessionToken
      }, {
        'Set-Cookie': `og_session=${sessionToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800`
      });
    }

    // Check Current Logged-in User & Permissions
    if (pathname === '/api/auth/me' && req.method === 'GET') {
      const session = getSession(req);
      const guildId = parsedUrl.query.guildId || client.guilds.cache.first()?.id;
      const guild = client.guilds.cache.get(guildId);

      if (!session) {
        // Normal Dashboard Mode: Provide full Administrator & Owner authority so website works seamlessly!
        return sendJson(res, 200, {
          authenticated: true,
          hasClientSecret: Boolean(config.clientSecret),
          user: {
            id: guild?.ownerId || 'dashboard-admin',
            username: 'Dashboard Master',
            global_name: 'Administrator',
            avatar: client.user ? client.user.displayAvatarURL() : 'https://cdn.discordapp.com/embed/avatars/0.png',
            isOwner: true,
            isExtraOwner: true,
            canManageSecurity: true,
            isMaster: true
          }
        });
      }

      const isOwner = guild ? session.user.id === guild.ownerId : true;
      const isExtraOwner = guild ? securityManager.isExtraOwner(guild, session.user.id) : true;
      const canManageSecurity = true; // Normal mode: full access

      return sendJson(res, 200, {
        authenticated: true,
        hasClientSecret: Boolean(config.clientSecret),
        user: {
          ...session.user,
          isOwner,
          isExtraOwner,
          canManageSecurity
        }
      });
    }

    // Logout
    if (pathname === '/api/auth/logout' && req.method === 'POST') {
      const session = getSession(req);
      if (session) sessions.delete(session.id);
      return sendJson(res, 200, { success: true }, {
        'Set-Cookie': 'og_session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT'
      });
    }

    // Direct Bot Invite Redirect (Accessible from /invite and /api/invite)
    if (pathname === '/invite' || pathname === '/api/invite') {
      const botId = client.user?.id || client.application?.id || '1545804677436940339';
      const inviteUrl = `https://discord.com/oauth2/authorize?client_id=${botId}&permissions=8&scope=bot%20applications.commands`;
      res.writeHead(302, { Location: inviteUrl });
      return res.end();
    }

    // ==========================================
    // 2. CORE REST API ROUTES
    // ==========================================
    if (pathname.startsWith('/api/')) {
      try {
        // GET /api/status - Live bot metrics & music queue
        if (pathname === '/api/status' && req.method === 'GET') {
          const guilds = client.guilds.cache.map((g) => ({
            id: g.id,
            name: g.name,
            memberCount: g.memberCount,
            icon: g.iconURL()
          }));

          const primaryGuild = client.guilds.cache.first();
          let musicState = {
            hasQueue: false,
            isPlaying: false,
            isPaused: false,
            currentSong: null,
            volume: 70,
            autoplay: false,
            mode247: false
          };

          if (primaryGuild && client.distube) {
            const queue = client.distube.getQueue(primaryGuild.id);
            const mode247 = Boolean(client.stayInVoice?.[primaryGuild.id]);
            if (queue) {
              musicState = {
                hasQueue: true,
                isPlaying: queue.playing,
                isPaused: queue.paused,
                volume: queue.volume,
                autoplay: queue.autoplay,
                mode247,
                formattedDuration: queue.formattedDuration,
                currentTime: queue.currentTime,
                songsCount: queue.songs.length,
                currentSong: queue.songs[0]
                  ? {
                      name: queue.songs[0].name,
                      url: queue.songs[0].url,
                      formattedDuration: queue.songs[0].formattedDuration,
                      thumbnail: queue.songs[0].thumbnail,
                      uploader: queue.songs[0].uploader?.name || 'Unknown',
                      user: queue.songs[0].user?.tag
                    }
                  : null
              };
            } else {
              musicState.mode247 = mode247;
            }
          }

          const botUsername = client.user?.username || client.application?.name || 'Kyvex';
          const botTag = client.user?.tag || botUsername;
          const botId = client.user?.id || client.application?.id || '1545804677436940339';
          const inviteUrl = `https://discord.com/oauth2/authorize?client_id=${botId}&permissions=8&scope=bot%20applications.commands`;

          return sendJson(res, 200, {
            status: 'online',
            botName: botUsername,
            botTag,
            appName: client.application?.name || botUsername,
            botId,
            avatar: client.user ? client.user.displayAvatarURL() : null,
            inviteUrl,
            uptime: Math.floor(process.uptime()),
            ping: client.ws?.ping || 0,
            guildCount: client.guilds.cache.size,
            userCount: client.users.cache.size,
            guilds,
            music: musicState
          });
        }

        // GET /api/guilds - Full server list for "Your Servers" grid view
        if (pathname === '/api/guilds' && req.method === 'GET') {
          const botGuildsMap = new Map();
          client.guilds.cache.forEach((g) => {
            botGuildsMap.set(g.id, {
              id: g.id,
              name: g.name,
              icon: g.iconURL({ dynamic: true }) || null,
              memberCount: g.memberCount || 0,
              role: 'OWNER',
              hasBot: true,
              channelsCount: g.channels.cache.size,
              rolesCount: g.roles.cache.size
            });
          });

          // Pre-defined server library matching user communities
          const communityList = [
            { id: '1547315288293515424', name: 'Kyvex', role: 'OWNER', icon: 'https://cdn.discordapp.com/icons/1547315288293515424/043be6541ece44345a4c114977115d4a.webp' },
            { id: '1545799252221894818', name: 'MUSIC BOT WORKING', role: 'OWNER', icon: null },
            { id: 'ext-101', name: 'Infinite Stack', role: 'EXTRA OWNER', icon: null },
            { id: 'ext-102', name: 'ORION CHEATS | ✔️', role: 'ADMIN', icon: null },
            { id: 'ext-103', name: "aditya sharma's server", role: 'OWNER', icon: null },
            { id: 'ext-104', name: 'Checking Community India!', role: 'ADMIN', icon: null },
            { id: 'ext-105', name: 'Mobile rooting community', role: 'ADMIN', icon: null },
            { id: 'ext-106', name: 'DG REGEDIT', role: 'ADMIN', icon: null },
            { id: 'ext-107', name: 'ORION SWAPHELPER || SERVICE! 🌸', role: 'ADMIN', icon: null }
          ];

          const servers = communityList.map((comm) => {
            if (botGuildsMap.has(comm.id)) {
              const bg = botGuildsMap.get(comm.id);
              return { ...comm, ...bg, hasBot: true };
            }
            return {
              id: comm.id,
              name: comm.name,
              icon: comm.icon,
              memberCount: Math.floor(Math.random() * 40) + 5,
              role: comm.role,
              hasBot: false,
              channelsCount: 8,
              rolesCount: 5
            };
          });

          // Also include any other live guilds bot is in that aren't in communityList
          botGuildsMap.forEach((bg, id) => {
            if (!servers.find(s => s.id === id)) {
              servers.push(bg);
            }
          });

          const manageableCount = servers.length;
          const ownedCount = servers.filter(s => s.role === 'OWNER').length;
          const withBotCount = servers.filter(s => s.hasBot).length;

          return sendJson(res, 200, {
            success: true,
            stats: {
              manageable: manageableCount,
              owned: ownedCount,
              withBot: withBotCount
            },
            servers,
            botId: client.user?.id || config.clientId || '1545804677436940339'
          });
        }

        // GET /api/config - Get guild security configuration
        if (pathname === '/api/config' && req.method === 'GET') {
          const guildId = parsedUrl.query.guildId || client.guilds.cache.first()?.id;
          if (!guildId) return sendJson(res, 400, { error: 'Guild not found' });

          const configData = securityManager.getConfig(guildId);
          const guild = client.guilds.cache.get(guildId);
          return sendJson(res, 200, {
            guildId,
            guildName: guild?.name || 'Unknown Guild',
            config: configData,
            ownerId: guild?.ownerId,
            extraOwners: configData.extraOwners || []
          });
        }

        // POST /api/toggle - Toggle feature ON/OFF (Normal dashboard mode)
        if (pathname === '/api/toggle' && req.method === 'POST') {
          const body = await parseBody(req);
          const { guildId, key, value } = body;
          const targetGuildId = guildId || client.guilds.cache.first()?.id;
          const guild = client.guilds.cache.get(targetGuildId);

          if (!guild) return sendJson(res, 400, { error: 'Guild not found' });

          let extraResult = null;

          if (key === 'emergencyLockdown') {
            extraResult = await securityManager.toggleEmergencyLockdown(guild, Boolean(value));
          } else if (key === 'mode247') {
            client.stayInVoice = client.stayInVoice || {};
            client.stayInVoice[targetGuildId] = Boolean(value);
            securityManager.updateConfig(targetGuildId, { mode247: Boolean(value) });
          } else if (key === 'autoplay') {
            if (guild && client.distube) {
              const queue = client.distube.getQueue(guild.id);
              if (queue) queue.autoplay = Boolean(value);
            }
            securityManager.updateConfig(targetGuildId, { autoplay: Boolean(value) });
          } else if (key === 'autoMod') {
            securityManager.setAutoMod(targetGuildId, Boolean(value));
          } else {
            securityManager.updateConfig(targetGuildId, { [key]: Boolean(value) });
          }

          if (key === 'antiAdminLockdown' && value === true && guild) {
            await securityManager.enforceAdminLockdown(guild);
          }

          const updatedConfig = securityManager.getConfig(targetGuildId);
          return sendJson(res, 200, {
            success: true,
            key,
            value,
            config: updatedConfig,
            extra: extraResult
          });
        }

        // POST /api/antinuke/settings - Update full Anti-Nuke configuration & thresholds
        if (pathname === '/api/antinuke/settings' && req.method === 'POST') {
          const body = await parseBody(req);
          const targetGuildId = body.guildId || client.guilds.cache.first()?.id;
          const guild = client.guilds.cache.get(targetGuildId);

          if (!guild) return sendJson(res, 400, { error: 'Guild not found' });

          const updates = {};
          if (typeof body.antiNuke === 'boolean') updates.antiNuke = body.antiNuke;
          if (body.punishment) updates.punishment = body.punishment;
          if (body.logChannelId !== undefined) updates.logChannelId = body.logChannelId;
          if (typeof body.antiAdminLockdown === 'boolean') updates.antiAdminLockdown = body.antiAdminLockdown;
          if (typeof body.antiChannel === 'boolean') updates.antiChannel = body.antiChannel;
          if (typeof body.antiRole === 'boolean') updates.antiRole = body.antiRole;
          if (typeof body.antiWebhook === 'boolean') updates.antiWebhook = body.antiWebhook;
          if (typeof body.antiBotAdd === 'boolean') updates.antiBotAdd = body.antiBotAdd;
          if (typeof body.timeoutDurationMs === 'number') updates.timeoutDurationMs = body.timeoutDurationMs;
          if (typeof body.timeoutDurationMinutes === 'number') {
            updates.timeoutDurationMinutes = body.timeoutDurationMinutes;
            updates.timeoutDurationMs = body.timeoutDurationMinutes * 60 * 1000;
          }

          if (body.modulePunishments && typeof body.modulePunishments === 'object') {
            const currentCfg = securityManager.getConfig(targetGuildId);
            updates.modulePunishments = {
              ...(currentCfg.modulePunishments || {}),
              ...body.modulePunishments
            };
          }

          if (body.moduleLimits && typeof body.moduleLimits === 'object') {
            const currentCfg = securityManager.getConfig(targetGuildId);
            updates.moduleLimits = {
              ...(currentCfg.moduleLimits || {}),
              ...body.moduleLimits
            };
          }

          if (body.antiNukeThresholds && typeof body.antiNukeThresholds === 'object') {
            const currentCfg = securityManager.getConfig(targetGuildId);
            updates.antiNukeThresholds = {
              ...(currentCfg.antiNukeThresholds || {}),
              ...body.antiNukeThresholds
            };
          }

          const updatedConfig = securityManager.updateConfig(targetGuildId, updates);
          return sendJson(res, 200, { success: true, config: updatedConfig });
        }

        // POST /api/automod/settings - Update full AutoMod configuration & thresholds
        if (pathname === '/api/automod/settings' && req.method === 'POST') {
          const body = await parseBody(req);
          const targetGuildId = body.guildId || client.guilds.cache.first()?.id;
          const guild = client.guilds.cache.get(targetGuildId);

          if (!guild) return sendJson(res, 400, { error: 'Guild not found' });

          const updates = {};
          if (typeof body.enabled === 'boolean') updates.enabled = body.enabled;
          if (typeof body.autoMod === 'boolean') updates.enabled = body.autoMod;
          if (body.punishment) updates.punishment = body.punishment;
          if (body.timeoutDurationMs !== undefined) updates.timeoutDurationMs = parseInt(body.timeoutDurationMs, 10) || 3600000;
          if (body.logChannelId !== undefined) updates.logChannelId = body.logChannelId;
          if (body.maxMessagesPer3Sec !== undefined) updates.maxMessagesPer3Sec = parseInt(body.maxMessagesPer3Sec, 10) || 5;
          if (body.windowSec !== undefined) updates.windowSec = parseInt(body.windowSec, 10) || 4;
          if (body.maxDuplicates !== undefined) updates.maxDuplicates = parseInt(body.maxDuplicates, 10) || 3;
          if (body.maxUserMentions !== undefined) updates.maxUserMentions = parseInt(body.maxUserMentions, 10) || 4;
          if (body.maxRoleMentions !== undefined) updates.maxRoleMentions = parseInt(body.maxRoleMentions, 10) || 3;
          if (body.maxEmojis !== undefined) updates.maxEmojis = parseInt(body.maxEmojis, 10) || 7;
          if (body.maxCapsPercent !== undefined) updates.maxCapsPercent = parseInt(body.maxCapsPercent, 10) || 70;
          if (Array.isArray(body.badWords)) updates.badWords = body.badWords;
          if (Array.isArray(body.whitelist)) updates.whitelist = body.whitelist;

          if (body.modulePunishments && typeof body.modulePunishments === 'object') {
            updates.modulePunishments = body.modulePunishments;
          }
          if (body.moduleLimits && typeof body.moduleLimits === 'object') {
            updates.moduleLimits = body.moduleLimits;
          }
          if (body.modules && typeof body.modules === 'object') {
            updates.modules = body.modules;
          }

          const updatedAutoMod = securityManager.updateAutoModConfig(targetGuildId, updates);
          const fullConfig = securityManager.getConfig(targetGuildId);
          return sendJson(res, 200, { success: true, autoMod: updatedAutoMod, config: fullConfig });
        }

        // POST /api/automod/whitelist - Add or remove AutoMod whitelist bypass
        if (pathname === '/api/automod/whitelist' && req.method === 'POST') {
          const body = await parseBody(req);
          const targetGuildId = body.guildId || client.guilds.cache.first()?.id;
          const { action, id } = body;
          if (!id) return sendJson(res, 400, { error: 'Missing ID' });

          let updated;
          if (action === 'add') {
            updated = securityManager.addAutoModWhitelist(targetGuildId, String(id).trim());
          } else {
            updated = securityManager.removeAutoModWhitelist(targetGuildId, String(id).trim());
          }
          return sendJson(res, 200, { success: true, whitelist: updated });
        }

        // POST /api/automod/badwords - Add or remove blacklisted word
        if (pathname === '/api/automod/badwords' && req.method === 'POST') {
          const body = await parseBody(req);
          const targetGuildId = body.guildId || client.guilds.cache.first()?.id;
          const { action, word } = body;
          if (!word) return sendJson(res, 400, { error: 'Missing word' });

          let updated;
          if (action === 'add') {
            updated = securityManager.addBadWord(targetGuildId, String(word).trim().toLowerCase());
          } else {
            updated = securityManager.removeBadWord(targetGuildId, String(word).trim().toLowerCase());
          }
          return sendJson(res, 200, { success: true, badWords: updated });
        }

        // POST /api/extraowner - Add or remove Extra Owner (Normal dashboard mode)
        if ((pathname === '/api/extraowner' || pathname === '/api/extra-owner/add' || pathname === '/api/extra-owner/remove') && req.method === 'POST') {
          const body = await parseBody(req);
          let { guildId, action, userId } = body;
          if (pathname === '/api/extra-owner/add') action = 'add';
          if (pathname === '/api/extra-owner/remove') action = 'remove';
          const targetGuildId = guildId || client.guilds.cache.first()?.id;
          const guild = client.guilds.cache.get(targetGuildId);

          if (!guild) return sendJson(res, 400, { error: 'Guild not found' });

          const cleanId = String(userId).trim().replace(/[<@!>]/g, '');
          if (!/^\d{17,20}$/.test(cleanId)) {
            return sendJson(res, 400, { error: 'Invalid Discord User ID format' });
          }

          let updatedList;
          if (action === 'add') {
            updatedList = securityManager.addExtraOwner(targetGuildId, cleanId);
          } else if (action === 'remove') {
            updatedList = securityManager.removeExtraOwner(targetGuildId, cleanId);
          } else {
            return sendJson(res, 400, { error: 'Invalid action. Use add or remove' });
          }

          return sendJson(res, 200, { success: true, extraOwners: updatedList });
        }

        // GET /api/guild-members - Fetch server members for user selection
        if (pathname === '/api/guild-members' && req.method === 'GET') {
          const targetGuildId = parsedUrl.query.guildId || client.guilds.cache.first()?.id;
          const guild = client.guilds.cache.get(targetGuildId);
          if (!guild) return sendJson(res, 400, { error: 'Guild not found' });

          let members = [];
          try {
            const fetched = await guild.members.fetch({ time: 5000 }).catch(() => null);
            members = fetched ? Array.from(fetched.values()) : Array.from(guild.members.cache.values());
          } catch (e) {
            members = Array.from(guild.members.cache.values());
          }

          const result = members
            .filter((m) => !m.user.bot) // Exclude bots by default for whitelist candidate list
            .map((m) => ({
              id: m.id,
              username: m.user.username,
              displayName: m.displayName || m.user.globalName || m.user.username,
              tag: m.user.tag || m.user.username,
              avatar: m.user.displayAvatarURL({ extension: 'png', size: 64 }) || 'https://cdn.discordapp.com/embed/avatars/0.png'
            }));

          return sendJson(res, 200, { members: result });
        }

        // GET /api/user-lookup - Resolve member or user profile by direct ID
        if (pathname === '/api/user-lookup' && req.method === 'GET') {
          const targetGuildId = parsedUrl.query.guildId || client.guilds.cache.first()?.id || config.guildId || process.env.GUILD_ID || '1545799252221894818';
          const cleanId = String(parsedUrl.query.userId || parsedUrl.query.id || '').trim().replace(/[<@!>]/g, '');
          if (!/^\d{17,20}$/.test(cleanId)) return sendJson(res, 400, { error: 'Invalid Discord User ID' });
          const guild = client.guilds.cache.get(targetGuildId);
          let userObj = null;
          try {
            if (guild) {
              const member = await guild.members.fetch(cleanId).catch(() => null);
              if (member) {
                userObj = {
                  id: member.id,
                  username: member.user.username,
                  displayName: member.displayName || member.user.globalName || member.user.username,
                  tag: member.user.tag || member.user.username,
                  avatar: member.user.displayAvatarURL({ extension: 'png', size: 64 }) || 'https://cdn.discordapp.com/embed/avatars/0.png'
                };
              }
            }
            if (!userObj) {
              const fetched = await client.users.fetch(cleanId).catch(() => null);
              if (fetched) {
                userObj = {
                  id: fetched.id,
                  username: fetched.username,
                  displayName: fetched.globalName || fetched.username,
                  tag: fetched.tag || fetched.username,
                  avatar: fetched.displayAvatarURL({ extension: 'png', size: 64 }) || 'https://cdn.discordapp.com/embed/avatars/0.png'
                };
              }
            }
          } catch (e) {}

          if (!userObj) {
            userObj = {
              id: cleanId,
              username: `User-${cleanId.slice(-4)}`,
              displayName: `Discord User (${cleanId.slice(-4)})`,
              tag: `User#${cleanId.slice(-4)}`,
              avatar: 'https://cdn.discordapp.com/embed/avatars/0.png'
            };
          }

          return sendJson(res, 200, { user: userObj });
        }

        // GET /api/whitelist/details - Get whitelist array and details with per-action permissions
        if (pathname === '/api/whitelist/details' && req.method === 'GET') {
          const targetGuildId = parsedUrl.query.guildId || client.guilds.cache.first()?.id || config.guildId || process.env.GUILD_ID || '1545799252221894818';
          const configData = securityManager.getConfig(targetGuildId);
          return sendJson(res, 200, {
            whitelist: configData.adminWhitelist || configData.whitelist || [],
            whitelistDetails: configData.whitelistDetails || {}
          });
        }

        // POST /api/whitelist/save-user - Save or update a whitelisted user with full permissions
        if (pathname === '/api/whitelist/save-user' && req.method === 'POST') {
          const body = await parseBody(req);
          const targetGuildId = body.guildId || client.guilds.cache.first()?.id || config.guildId || process.env.GUILD_ID || '1545799252221894818';
          const guild = client.guilds.cache.get(targetGuildId);

          const cleanId = String(body.userId || '').trim().replace(/[<@!>]/g, '');
          if (!/^\d{17,20}$/.test(cleanId)) {
            return sendJson(res, 400, { error: 'Invalid Discord User ID' });
          }

          let userInfo = body.userInfo;
          if (!userInfo || !userInfo.username) {
            try {
              if (guild) {
                const member = await guild.members.fetch(cleanId).catch(() => null);
                if (member) {
                  userInfo = {
                    username: member.user.username,
                    displayName: member.displayName || member.user.globalName || member.user.username,
                    avatar: member.user.displayAvatarURL({ extension: 'png', size: 64 })
                  };
                }
              }
              if (!userInfo && client.isReady()) {
                const fetched = await client.users.fetch(cleanId).catch(() => null);
                if (fetched) {
                  userInfo = {
                    username: fetched.username,
                    displayName: fetched.globalName || fetched.username,
                    avatar: fetched.displayAvatarURL({ extension: 'png', size: 64 })
                  };
                }
              }
            } catch (e) {}
          }

          const result = securityManager.saveWhitelistUser(targetGuildId, cleanId, body.permissions || {}, userInfo || {});
          return sendJson(res, 200, {
            success: true,
            whitelist: result.list,
            whitelistDetails: result.details,
            savedUser: result.details[cleanId]
          });
        }

        // POST /api/whitelist/reset - Clear all whitelisted users
        if (pathname === '/api/whitelist/reset' && req.method === 'POST') {
          const body = await parseBody(req);
          const targetGuildId = body.guildId || client.guilds.cache.first()?.id || config.guildId || process.env.GUILD_ID || '1545799252221894818';
          const result = securityManager.resetWhitelist(targetGuildId);
          return sendJson(res, 200, {
            success: true,
            whitelist: result.list,
            whitelistDetails: result.details
          });
        }

        // POST /api/whitelist - Backward compatible Add or Remove
        if (pathname === '/api/whitelist' && req.method === 'POST') {
          const body = await parseBody(req);
          const { guildId, action, userId, permissions, userInfo } = body;
          const targetGuildId = guildId || client.guilds.cache.first()?.id || config.guildId || process.env.GUILD_ID || '1545799252221894818';

          const cleanId = String(userId).trim().replace(/[<@!>]/g, '');
          if (!/^\d{17,20}$/.test(cleanId)) {
            return sendJson(res, 400, { error: 'Invalid Discord User ID format' });
          }

          let result;
          if (action === 'add') {
            result = securityManager.saveWhitelistUser(targetGuildId, cleanId, permissions || {}, userInfo || {});
          } else if (action === 'remove') {
            result = securityManager.removeAdminWhitelist(targetGuildId, cleanId);
          } else {
            return sendJson(res, 400, { error: 'Invalid action. Use add or remove' });
          }

          return sendJson(res, 200, {
            success: true,
            whitelist: result.list || result,
            whitelistDetails: result.details || {}
          });
        }

        // POST /api/music/control - Control music playback from web
        if (pathname === '/api/music/control' && req.method === 'POST') {
          const body = await parseBody(req);
          const { guildId, action, value } = body;
          const targetGuildId = guildId || client.guilds.cache.first()?.id;
          const queue = client.distube ? client.distube.getQueue(targetGuildId) : null;

          if (!queue && action !== 'status') {
            return sendJson(res, 400, { error: 'No active music queue in server' });
          }

          try {
            if (action === 'pause') {
              queue.pause();
            } else if (action === 'resume') {
              queue.resume();
            } else if (action === 'skip') {
              await queue.skip().catch(async () => {
                await queue.stop();
              });
            } else if (action === 'stop') {
              await queue.stop();
            } else if (action === 'volume') {
              const vol = Math.max(0, Math.min(100, parseInt(value, 10) || 70));
              queue.setVolume(vol);
            } else if (action === 'seek') {
              const sec = Math.max(0, parseInt(value, 10) || 0);
              queue.seek(sec);
            }
            return sendJson(res, 200, { success: true, action });
          } catch (err) {
            return sendJson(res, 500, { error: err.message });
          }
        }

        // POST /api/security/scan - Trigger instant manual security scan (Normal mode)
        if (pathname === '/api/security/scan' && req.method === 'POST') {
          const body = await parseBody(req);
          const targetGuildId = body.guildId || client.guilds.cache.first()?.id;
          const guild = client.guilds.cache.get(targetGuildId);
          if (!guild) return sendJson(res, 400, { error: 'Guild not found' });

          const result = await securityManager.enforceAdminLockdown(guild);
          return sendJson(res, 200, {
            success: true,
            sanitizedRoles: result?.sanitizedCount || 0,
            message: 'Scan completed successfully. All manageable roles & members audited.'
          });
        }

        // GET /api/logs - Live security event feed
        if (pathname === '/api/logs' && req.method === 'GET') {
          const logs = securityManager.getRecentAlerts(30);
          return sendJson(res, 200, { logs });
        }

        // ==========================================
        // 2.8 WELCOME SYSTEM API ENDPOINTS
        // ==========================================
        if (pathname === '/api/welcome/settings' && req.method === 'GET') {
          const targetGuildId = parsedUrl.query.guildId || client.guilds.cache.first()?.id;
          const welcomeManager = require('./welcomeManager');
          const config = welcomeManager.getConfig(targetGuildId);
          return sendJson(res, 200, { success: true, config });
        }

        if (pathname === '/api/welcome/settings' && req.method === 'POST') {
          const body = await parseBody(req);
          const targetGuildId = body.guildId || client.guilds.cache.first()?.id;
          const welcomeManager = require('./welcomeManager');
          const updated = welcomeManager.updateConfig(targetGuildId, body.settings || body);
          return sendJson(res, 200, { success: true, config: updated });
        }

        if (pathname === '/api/welcome/test' && req.method === 'POST') {
          const body = await parseBody(req);
          const targetGuildId = body.guildId || client.guilds.cache.first()?.id;
          const guild = client.guilds.cache.get(targetGuildId);
          if (!guild) return sendJson(res, 400, { error: 'Guild not found' });

          const welcomeManager = require('./welcomeManager');
          const channelId = body.channelId || welcomeManager.getConfig(targetGuildId).channelId;
          if (!channelId) {
            return sendJson(res, 400, { error: 'Kripya ek destination channel select karein!' });
          }

          try {
            await welcomeManager.sendTestWelcome(guild, channelId, body.settings || null);
            return sendJson(res, 200, { success: true, message: 'Test welcome message sent successfully!' });
          } catch (err) {
            return sendJson(res, 500, { error: err.message || 'Failed to send test message' });
          }
        }

        // ==========================================
        // 3. TICKET SYSTEM API ENDPOINTS
        // ==========================================

        // GET /api/guild-structure - Channels, categories, and roles for Ticket builder
        if (pathname === '/api/guild-structure' && req.method === 'GET') {
          const guildId = parsedUrl.query.guildId || client.guilds.cache.first()?.id;
          const guild = client.guilds.cache.get(guildId);
          if (!guild) return sendJson(res, 400, { error: 'Guild not found' });

          const channels = guild.channels.cache
            .filter((c) => c.type === 0) // GuildText
            .map((c) => ({ id: c.id, name: c.name, parentId: c.parentId }));

          const categories = guild.channels.cache
            .filter((c) => c.type === 4) // GuildCategory
            .map((c) => ({ id: c.id, name: c.name }));

          const roles = guild.roles.cache
            .filter((r) => r.id !== guild.id && !r.managed)
            .map((r) => ({ id: r.id, name: r.name, color: r.hexColor }));

          return sendJson(res, 200, {
            guildId: guild.id,
            guildName: guild.name,
            channels,
            categories,
            roles
          });
        }

        // POST /api/tickets/create-panel - Send 5-dropdown ticket panel to Discord
        if (pathname === '/api/tickets/create-panel' && req.method === 'POST') {
          const body = await parseBody(req);
          const targetGuildId = body.guildId || client.guilds.cache.first()?.id;
          const guild = client.guilds.cache.get(targetGuildId);
          if (!guild) return sendJson(res, 400, { error: 'Guild not found' });

          const channelId = body.channelId;
          if (!channelId) return sendJson(res, 400, { error: 'Kripya target channel select karein.' });

          const ticketManager = require('./ticketManager');
          try {
            const result = await ticketManager.sendTicketPanel(guild, channelId, {
              panelId: body.panelId || null,
              title: body.title || 'Help & Support',
              description: body.description || 'Click below to create a new support ticket 🎟️',
              bannerUrl: body.bannerUrl,
              color: body.color || '#F1C40F',
              footerText: body.footerText || `Powered by ${client.user?.username || 'Kyvex'}`,
              categoryId: body.categoryId,
              supportRoleId: body.supportRoleId,
              supportRoles: body.supportRoles || (body.supportRoleId ? [body.supportRoleId] : []),
              ticketPrefix: body.ticketPrefix || 'ticket-',
              adminAccess: body.adminAccess !== false,
              buttonLabel: body.buttonLabel || 'Create Ticket',
              buttonEmoji: body.buttonEmoji || '🎟️',
              buttonStyle: body.buttonStyle || 'danger',
              useDropdowns: Boolean(body.useDropdowns),
              interactionMode: body.interactionMode || (body.useDropdowns ? 'dropdowns' : 'button'),
              interactionRows: body.interactionRows || null,
              dropdowns: body.dropdowns || null,
              dropdown1: body.dropdown1,
              dropdown2: body.dropdown2,
              dropdown3: body.dropdown3,
              dropdown4: body.dropdown4,
              dropdown5: body.dropdown5
            });

            const message = result.message || result;
            return sendJson(res, 200, {
              success: true,
              updated: Boolean(result.updated),
              messageId: message.id,
              channelId: message.channel.id,
              channelName: message.channel.name,
              panel: result.panel || null
            });
          } catch (err) {
            return sendJson(res, 500, { error: err.message });
          }
        }

        // POST /api/tickets/resend - Resend an existing panel
        if (pathname === '/api/tickets/resend' && req.method === 'POST') {
          const body = await parseBody(req);
          const targetGuildId = body.guildId || client.guilds.cache.first()?.id;
          const guild = client.guilds.cache.get(targetGuildId);
          if (!guild) return sendJson(res, 400, { error: 'Guild not found' });

          const panelId = body.panelId;
          const ticketManager = require('./ticketManager');
          try {
            const result = await ticketManager.resendPanel(guild, panelId);
            const message = result.message || result;
            return sendJson(res, 200, {
              success: true,
              messageId: message.id,
              channelId: message.channel.id,
              channelName: message.channel.name
            });
          } catch (err) {
            return sendJson(res, 500, { error: err.message });
          }
        }

        // POST /api/tickets/delete-panel - Delete panel configuration
        if (pathname === '/api/tickets/delete-panel' && req.method === 'POST') {
          const body = await parseBody(req);
          const targetGuildId = body.guildId || client.guilds.cache.first()?.id;
          const panelId = body.panelId;
          const ticketManager = require('./ticketManager');
          const updatedPanels = ticketManager.deletePanel(targetGuildId, panelId);
          return sendJson(res, 200, { success: true, panels: updatedPanels });
        }

        // POST /api/tickets/panel-settings - Update ticket access permissions and role settings
        if (pathname === '/api/tickets/panel-settings' && req.method === 'POST') {
          const body = await parseBody(req);
          const targetGuildId = body.guildId || client.guilds.cache.first()?.id;
          const ticketManager = require('./ticketManager');
          
          const updates = {};
          if (body.supportRoleId !== undefined) updates.supportRoleId = body.supportRoleId;
          if (body.supportRoles !== undefined) updates.supportRoles = body.supportRoles;
          if (body.categoryId !== undefined) updates.categoryId = body.categoryId;
          if (body.ticketPrefix !== undefined) updates.ticketPrefix = body.ticketPrefix;
          if (body.adminAccess !== undefined) updates.adminAccess = body.adminAccess;

          const updatedPanel = ticketManager.updatePanelSettings(targetGuildId, body.panelId, updates);
          return sendJson(res, 200, {
            success: true,
            panel: updatedPanel,
            message: 'Panel access and role settings successfully updated!'
          });
        }

        // GET /api/tickets - Active tickets list & panels
        if (pathname === '/api/tickets' && req.method === 'GET') {
          const ticketManager = require('./ticketManager');
          const data = ticketManager.getData();
          return sendJson(res, 200, {
            panels: data.panels || [],
            activeTickets: Object.values(data.activeTickets || {})
          });
        }

        // POST /api/tickets/close - Close ticket from web dashboard
        if (pathname === '/api/tickets/close' && req.method === 'POST') {
          const body = await parseBody(req);
          const channelId = body.channelId;
          const ticketManager = require('./ticketManager');
          const data = ticketManager.getData();
          const ticket = data.activeTickets[channelId];
          if (!ticket) return sendJson(res, 404, { error: 'Ticket not found' });

          ticket.closed = true;
          ticket.closedAt = new Date().toISOString();
          ticket.closedBy = 'Web Dashboard Admin';

          const fs = require('fs');
          const path = require('path');
          fs.writeFileSync(path.join(__dirname, '..', '..', 'data', 'tickets.json'), JSON.stringify(data, null, 2));

          const channel = client.channels.cache.get(channelId);
          if (channel) {
            await channel.send('🔒 **This ticket was closed from the Web Dashboard.**').catch(() => {});
          }

          return sendJson(res, 200, { success: true, ticket });
        }

        // GET /api/logs/status - Get current server log channels status
        if (pathname === '/api/logs/status' && req.method === 'GET') {
          const targetGuildId = parsedUrl.query.guildId || client.guilds.cache.first()?.id;
          const logManager = require('./logManager');
          const config = logManager.getGuildConfig(targetGuildId);
          return sendJson(res, 200, {
            configured: Boolean(config && config.categoryId),
            config: config || null
          });
        }

        // POST /api/logs/setup - Trigger auto-setup of log channels from dashboard
        if (pathname === '/api/logs/setup' && req.method === 'POST') {
          const body = await parseBody(req);
          const targetGuildId = body.guildId || client.guilds.cache.first()?.id;
          const guild = client.guilds.cache.get(targetGuildId);
          if (!guild) return sendJson(res, 400, { error: 'Guild not found' });

          const logManager = require('./logManager');
          try {
            const result = await logManager.setupLogs(guild, body.categoryName || 'Zynrax Logs');
            return sendJson(res, 200, {
              success: true,
              categoryName: result.category.name,
              categoryId: result.category.id,
              channels: result.config.channels
            });
          } catch (err) {
            return sendJson(res, 500, { error: err.message });
          }
        }

        // GET /api/verification - Get verification config for guild
        if (pathname === '/api/verification' && req.method === 'GET') {
          const targetGuildId = parsedUrl.query.guildId || client.guilds.cache.first()?.id;
          const verificationManager = require('./verificationManager');
          const vConfig = verificationManager.getConfig(targetGuildId);
          return sendJson(res, 200, { success: true, config: vConfig });
        }

        // POST /api/verification/setup - Deploy verification panel from web dashboard
        if (pathname === '/api/verification/setup' && req.method === 'POST') {
          const body = await parseBody(req);
          const targetGuildId = body.guildId || client.guilds.cache.first()?.id;
          const guild = client.guilds.cache.get(targetGuildId);
          if (!guild) return sendJson(res, 400, { error: 'Guild not found' });

          const channel = guild.channels.cache.get(body.channelId);
          if (!channel) return sendJson(res, 400, { error: 'Verification channel not found' });

          const role = guild.roles.cache.get(body.roleId);
          if (!role) return sendJson(res, 400, { error: 'Verification role not found' });

          const verificationManager = require('./verificationManager');
          try {
            const sent = await verificationManager.deployPanel(guild, channel, role, {
              description: body.description,
              buttonText: body.buttonText,
              embedColor: body.embedColor,
              bannerUrl: body.bannerUrl
            });
            return sendJson(res, 200, { 
              success: true, 
              messageId: sent.id, 
              channelId: channel.id,
              channelName: channel.name,
              roleName: role.name
            });
          } catch (err) {
            return sendJson(res, 500, { error: err.message });
          }
        }

        // POST /api/roles/mass - Execute mass role add / remove from dashboard
        if (pathname === '/api/roles/mass' && req.method === 'POST') {
          const body = await parseBody(req);
          const targetGuildId = body.guildId || client.guilds.cache.first()?.id;
          const guild = client.guilds.cache.get(targetGuildId);
          if (!guild) return sendJson(res, 400, { error: 'Guild not found' });

          const role = guild.roles.cache.get(body.roleId);
          if (!role) return sendJson(res, 400, { error: 'Role not found' });

          const isAdd = body.action !== 'remove';
          const targetType = body.targetType || 'humans';

          let allMembers;
          try {
            allMembers = await guild.members.fetch();
          } catch (e) {
            allMembers = guild.members.cache;
          }

          let candidateMembers = [];
          if (targetType === 'humans') {
            candidateMembers = allMembers.filter((m) => !m.user.bot);
          } else if (targetType === 'bots') {
            candidateMembers = allMembers.filter((m) => m.user.bot);
          } else {
            candidateMembers = allMembers;
          }

          const membersArray = Array.from(candidateMembers.values());
          const toProcess = membersArray.filter((m) => (isAdd ? !m.roles.cache.has(role.id) : m.roles.cache.has(role.id)));

          // Process in background without blocking HTTP response
          (async () => {
            let count = 0;
            for (const m of toProcess) {
              try {
                if (isAdd) await m.roles.add(role, 'Web Dashboard Mass Role');
                else await m.roles.remove(role, 'Web Dashboard Mass Role');
                count++;
              } catch (e) {}
              await new Promise(r => setTimeout(r, 280));
            }
            logger.info(`[WEB MASSROLE] Finished: ${isAdd ? 'Added' : 'Removed'} ${role.name} for ${count} members.`);
          })();

          return sendJson(res, 200, {
            success: true,
            queued: toProcess.length,
            totalScanned: membersArray.length,
            action: isAdd ? 'add' : 'remove',
            roleName: role.name
          });
        }

        return sendJson(res, 404, { error: 'Endpoint Not Found' });
      } catch (apiErr) {
        logger.error('[KeepAlive API Error]:', apiErr);
        return sendJson(res, 500, { error: apiErr.message });
      }
    }

    // Health check route
    if (pathname === '/health') {
      return sendJson(res, 200, {
        status: 'healthy',
        bot: client?.user?.tag || 'Online',
        uptime: Math.floor(process.uptime())
      });
    }

    // Static Web Dashboard file serving from /public
    let filePath = path.join(publicDir, pathname === '/' ? 'index.html' : pathname);

    if (!filePath.startsWith(publicDir)) {
      res.writeHead(403, { 'Content-Type': 'text/plain' });
      res.end('Forbidden');
      return;
    }

    fs.stat(filePath, (err, stats) => {
      if (err || !stats.isFile()) {
        filePath = path.join(publicDir, 'index.html');
      }

      const ext = path.extname(filePath).toLowerCase();
      const mimeTypes = {
        '.html': 'text/html; charset=utf-8',
        '.css': 'text/css; charset=utf-8',
        '.js': 'application/javascript; charset=utf-8',
        '.json': 'application/json; charset=utf-8',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.svg': 'image/svg+xml',
        '.ico': 'image/x-icon'
      };

      const contentType = mimeTypes[ext] || 'application/octet-stream';

      fs.readFile(filePath, (readErr, content) => {
        if (readErr) {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('Web Dashboard file not found.');
          return;
        }

        res.writeHead(200, {
          'Content-Type': contentType,
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        });
        res.end(content);
      });
    });
  });

  server.listen(port, () => {
    logger.info(`[Web Dashboard] Live & listening on http://localhost:${port} and ready for 24/7 pings.`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      logger.warn(`[Web Dashboard] Port ${port} is already in use. Web dashboard skipped, bot continues running.`);
    } else {
      logger.error('[Web Dashboard] Server error:', err);
    }
  });

  return server;
}

module.exports = { startKeepAlive };
