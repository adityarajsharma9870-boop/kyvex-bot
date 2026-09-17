const fs = require('fs');
const path = require('path');
const { EmbedBuilder } = require('discord.js');
const logger = require('./logger');

const dataDir = path.join(__dirname, '..', '..', 'data');
const dataFilePath = path.join(dataDir, 'security.json');

// Ensure data directory and file exist
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

if (!fs.existsSync(dataFilePath)) {
  fs.writeFileSync(dataFilePath, JSON.stringify({}, null, 2));
}

function loadData() {
  try {
    const raw = fs.readFileSync(dataFilePath, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    logger.error('Failed to load security.json:', e);
    return {};
  }
}

function saveData(data) {
  try {
    fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2));
  } catch (e) {
    logger.error('Failed to save security.json:', e);
  }
}

const recentAlerts = [];

const TIERS = {
  OWNER: 5,
  ADMIN: 4,
  SECURITY_MANAGER: 3,
  MODERATOR: 2,
  TRUSTED: 1,
  USER: 0
};

const defaultGuildConfig = {
  antiNuke: true,
  antiAdminLockdown: false,
  antiBotInvite: true,
  antiChannel: true,
  antiRole: true,
  antiWebhook: true,
  antiEveryone: true,
  emergencyLockdown: false,
  mode247: false,
  autoplay: false,
  extraOwners: [],
  adminWhitelist: [],
  whitelist: [],
  whitelistDetails: {},
  logChannel: null,
  punishment: 'ban', // 'ban' | 'kick' | 'timeout' | 'quarantine'
  timeoutDurationMinutes: 10, // 10 Minutes default
  timeoutDurationMs: 10 * 60 * 1000,
  modulePunishments: {
    // 1. Member Actions (5)
    antiBan: 'ban',
    antiUnban: 'ban',
    antiKick: 'ban',
    antiPrune: 'ban',
    antiMemberUpdate: 'ban',
    // 2. Channel Management (3)
    antiChannelCreate: 'ban',
    antiChannelDelete: 'ban',
    antiChannelUpdate: 'ban',
    // 3. Role Management (4)
    antiRoleCreate: 'ban',
    antiRoleDelete: 'ban',
    antiRoleUpdate: 'ban',
    antiRolePing: 'ban',
    // 4. Webhook Management (3)
    antiWebhookCreate: 'ban',
    antiWebhookDelete: 'ban',
    antiWebhookUpdate: 'ban',
    // 5. Server Content (3)
    antiEmojiCreate: 'ban',
    antiEmojiDelete: 'ban',
    antiEmojiUpdate: 'ban',
    // 6. Server Settings (4)
    antiGuildUpdate: 'ban',
    antiBotAdd: 'kick',
    antiEveryonePing: 'ban',
    antiIntegration: 'ban',
    antiIntegrationCreate: 'ban',
    antiCommunitySpam: 'ban',
    // Legacy fallbacks
    antiChannel: 'ban',
    antiRole: 'ban',
    antiWebhook: 'ban',
    antiEveryone: 'timeout',
    antiAdminLockdown: 'quarantine',
    antiBanKick: 'ban'
  },
  moduleLimits: {
    antiBan: 1,
    antiUnban: 1,
    antiKick: 1,
    antiPrune: 1,
    antiMemberUpdate: 1,
    antiChannelCreate: 1,
    antiChannelDelete: 1,
    antiChannelUpdate: 1,
    antiRoleCreate: 1,
    antiRoleDelete: 1,
    antiRoleUpdate: 1,
    antiRolePing: 1,
    antiWebhookCreate: 1,
    antiWebhookDelete: 1,
    antiWebhookUpdate: 1,
    antiEmojiCreate: 1,
    antiEmojiDelete: 1,
    antiEmojiUpdate: 1,
    antiGuildUpdate: 1,
    antiBotAdd: 1,
    antiEveryonePing: 1,
    antiIntegration: 1,
    antiIntegrationCreate: 1,
    antiCommunitySpam: 1,
    // Legacy
    antiChannel: 1,
    antiRole: 1,
    antiWebhook: 1,
    antiEveryone: 1,
    antiAdminLockdown: 1,
    antiBanKick: 1
  },

  // 5-Tier Permission Configuration
  securityManagers: { users: [], roles: [] },
  moderators: { users: [], roles: [] },
  trustedUsers: { users: [], roles: [] },

  // Anti-Raid System
  antiRaid: {
    enabled: true,
    joinThreshold: 5, // 5 joins
    joinWindowSec: 10, // within 10 seconds
    action: 'lockdown', // 'lockdown' | 'quarantine'
    restrictNewAccountsDays: 3,
    quarantineDurationMin: 15
  },

  // Anti-Spam System
  antiSpam: {
    enabled: true,
    maxMessagesPer3Sec: 5,
    maxDuplicates: 3,
    maxEmojis: 7,
    maxStickers: 2,
    progressivePunish: true
  },

  // Anti-Mention System
  antiMention: {
    enabled: true,
    blockEveryoneHere: true,
    maxUserMentions: 4,
    maxRoleMentions: 3
  },

  // Anti-Link / Anti-Invite System
  antiLink: {
    enabled: true,
    blockInvites: true,
    blockSuspiciousUrls: true,
    whitelistDomains: ['youtube.com', 'youtu.be', 'spotify.com', 'tenor.com', 'giphy.com', 'discord.com', 'google.com'],
    whitelistChannels: [],
    whitelistRoles: []
  },

  // Anti-Nuke Thresholds (Burst limiter)
  antiNukeThresholds: {
    channelDelete: 2,
    channelCreate: 3,
    roleDelete: 2,
    roleCreate: 3,
    banOrKick: 3,
    webhookDelete: 2,
    windowSec: 15
  },

  // Full Auto-Mod Configuration
  autoMod: {
    enabled: true,
    punishment: 'timeout', // 'timeout' | 'kick' | 'ban' | 'delete' | 'quarantine'
    timeoutDurationMs: 60 * 60 * 1000, // 1 Hour default
    logChannelId: '',
    // Sensitivity / Rate-limit thresholds
    maxMessagesPer3Sec: 5,
    windowSec: 4,
    maxDuplicates: 3,
    maxUserMentions: 4,
    maxRoleMentions: 3,
    maxEmojis: 7,
    maxCapsPercent: 70,
    // Bad words list
    badWords: ['discord.gg/', 'grabify', 'iplogger', 'free nitro', 'steamcommunity.ru'],
    // Whitelist
    whitelist: [],
    // Individual Module Punishments & Limits ("kitna kitna bar kare tab & kick ban timeout")
    modulePunishments: {
      antiSpam: 'timeout',
      antiInvite: 'timeout',
      antiLink: 'delete',
      antiMention: 'timeout',
      antiBadWords: 'timeout',
      antiDuplicate: 'timeout',
      antiCaps: 'delete',
      antiEmoji: 'delete'
    },
    moduleLimits: {
      antiSpam: 3,
      antiInvite: 1,
      antiLink: 2,
      antiMention: 2,
      antiBadWords: 2,
      antiDuplicate: 3,
      antiCaps: 3,
      antiEmoji: 3
    },
    modules: {
      antiSpam: true,
      antiInvite: true,
      antiLink: true,
      antiMention: true,
      antiBadWords: true,
      antiDuplicate: true,
      antiCaps: true,
      antiEmoji: true
    }
  }
};

const securityManager = {
  TIERS,
  raidStates: new Map(),
  actionBursts: new Map(),

  getConfig(guildId) {
    const data = loadData();
    if (!data[guildId]) {
      data[guildId] = { ...defaultGuildConfig };
      saveData(data);
    }
    const raw = data[guildId] || {};
    const cfg = {
      ...defaultGuildConfig,
      ...raw,
      modulePunishments: { ...defaultGuildConfig.modulePunishments, ...(raw.modulePunishments || {}) },
      moduleLimits: { ...defaultGuildConfig.moduleLimits, ...(raw.moduleLimits || {}) },
      securityManagers: { ...defaultGuildConfig.securityManagers, ...(raw.securityManagers || {}) },
      moderators: { ...defaultGuildConfig.moderators, ...(raw.moderators || {}) },
      trustedUsers: { ...defaultGuildConfig.trustedUsers, ...(raw.trustedUsers || {}) },
      antiRaid: { ...defaultGuildConfig.antiRaid, ...(raw.antiRaid || {}) },
      antiSpam: { ...defaultGuildConfig.antiSpam, ...(raw.antiSpam || {}) },
      antiMention: { ...defaultGuildConfig.antiMention, ...(raw.antiMention || {}) },
      antiLink: { ...defaultGuildConfig.antiLink, ...(raw.antiLink || {}) },
      antiNukeThresholds: { ...defaultGuildConfig.antiNukeThresholds, ...(raw.antiNukeThresholds || {}) },
      autoMod: {
        ...defaultGuildConfig.autoMod,
        ...(raw.autoMod || {}),
        modulePunishments: { ...defaultGuildConfig.autoMod.modulePunishments, ...(raw.autoMod?.modulePunishments || {}) },
        moduleLimits: { ...defaultGuildConfig.autoMod.moduleLimits, ...(raw.autoMod?.moduleLimits || {}) },
        modules: { ...defaultGuildConfig.autoMod.modules, ...(raw.autoMod?.modules || {}) }
      }
    };
    if (!Array.isArray(cfg.extraOwners)) cfg.extraOwners = [];
    if (!cfg.whitelistDetails || typeof cfg.whitelistDetails !== 'object') cfg.whitelistDetails = {};
    // Synchronize whitelist and adminWhitelist for 100% compatibility
    const combined = Array.from(new Set([...(cfg.adminWhitelist || []), ...(cfg.whitelist || [])]));
    cfg.adminWhitelist = combined;
    cfg.whitelist = combined;
    return cfg;
  },

  updateConfig(guildId, updates) {
    const data = loadData();
    const current = this.getConfig(guildId);
    data[guildId] = { ...current, ...updates };
    if (updates.whitelist && !updates.adminWhitelist) {
      data[guildId].adminWhitelist = updates.whitelist;
    }
    if (updates.adminWhitelist && !updates.whitelist) {
      data[guildId].whitelist = updates.adminWhitelist;
    }
    saveData(data);
    return data[guildId];
  },

  isExtraOwner(guild, userId) {
    if (!guild || !userId) return false;
    const config = this.getConfig(guild.id);
    return Array.isArray(config.extraOwners) && config.extraOwners.includes(userId);
  },

  isOwnerOrExtraOwner(guild, userId) {
    if (!guild || !userId) return false;
    if (userId === guild.ownerId) return true;
    return this.isExtraOwner(guild, userId);
  },

  addExtraOwner(guildId, userId) {
    const config = this.getConfig(guildId);
    const list = config.extraOwners || [];
    if (!list.includes(userId)) {
      list.push(userId);
      this.updateConfig(guildId, { extraOwners: list });
    }
    return list;
  },

  removeExtraOwner(guildId, userId) {
    const config = this.getConfig(guildId);
    const list = (config.extraOwners || []).filter((id) => id !== userId);
    this.updateConfig(guildId, { extraOwners: list });
    return list;
  },

  isWhitelisted(guild, userId, action = null) {
    if (!guild || !userId) return false;
    // 1. The bot itself is ALWAYS authorized
    if (userId === guild.client?.user?.id) return true;

    // 2. Server Owner is ALWAYS immune from Anti-Nuke punishments
    if (userId === guild.ownerId) return true;

    // 3. Extra owners are ALWAYS immune
    const config = this.getConfig(guild.id);
    const extraOwners = config.extraOwners || [];
    if (extraOwners.includes(userId)) return true;

    // 4. Check guild admin whitelist (explicitly added by owner on dashboard)
    const list = config.adminWhitelist || config.whitelist || [];
    if (!list.includes(userId)) return false;

    // 5. If a specific action was checked, verify if the user has custom bypass permissions
    if (action && config.whitelistDetails && config.whitelistDetails[userId]) {
      const details = config.whitelistDetails[userId];
      if (details.permissions && typeof details.permissions[action] === 'boolean') {
        return details.permissions[action];
      }
    }

    return true;
  },

  isAdminWhitelisted(guild, userId) {
    return this.isWhitelisted(guild, userId);
  },

  addWhitelist(guildId, userId) {
    return this.addAdminWhitelist(guildId, userId);
  },

  addAdminWhitelist(guildId, userId) {
    const config = this.getConfig(guildId);
    const list = config.adminWhitelist || config.whitelist || [];
    if (!list.includes(userId)) {
      list.push(userId);
      this.updateConfig(guildId, { adminWhitelist: list, whitelist: list });
    }
    return list;
  },

  saveWhitelistUser(guildId, userId, permissions, userInfo = {}) {
    const config = this.getConfig(guildId);
    const list = config.adminWhitelist || config.whitelist || [];
    if (!list.includes(userId)) {
      list.push(userId);
    }

    const details = { ...(config.whitelistDetails || {}) };
    details[userId] = {
      id: userId,
      username: userInfo.username || details[userId]?.username || 'User',
      displayName: userInfo.displayName || userInfo.globalName || details[userId]?.displayName || userInfo.username || 'User',
      avatar: userInfo.avatar || details[userId]?.avatar || 'https://cdn.discordapp.com/embed/avatars/0.png',
      permissions: permissions || details[userId]?.permissions || {},
      updatedAt: new Date().toISOString()
    };

    this.updateConfig(guildId, {
      adminWhitelist: list,
      whitelist: list,
      whitelistDetails: details
    });

    return { list, details };
  },

  removeWhitelist(guildId, userId) {
    return this.removeAdminWhitelist(guildId, userId);
  },

  removeAdminWhitelist(guildId, userId) {
    const config = this.getConfig(guildId);
    const list = (config.adminWhitelist || config.whitelist || []).filter((id) => id !== userId);
    const details = { ...(config.whitelistDetails || {}) };
    delete details[userId];
    this.updateConfig(guildId, { adminWhitelist: list, whitelist: list, whitelistDetails: details });
    return { list, details };
  },

  resetWhitelist(guildId) {
    this.updateConfig(guildId, {
      adminWhitelist: [],
      whitelist: [],
      whitelistDetails: {}
    });
    return { list: [], details: {} };
  },

  setAntiNuke(guildId, enabled) {
    return this.updateConfig(guildId, { antiNuke: enabled });
  },

  setAutoMod(guildId, enabled) {
    const current = this.getConfig(guildId);
    return this.updateConfig(guildId, {
      autoMod: {
        ...(current.autoMod || defaultGuildConfig.autoMod),
        enabled
      }
    });
  },

  updateAutoModConfig(guildId, updates) {
    const current = this.getConfig(guildId);
    const existing = current.autoMod || defaultGuildConfig.autoMod;
    const merged = {
      ...existing,
      ...updates,
      modulePunishments: { ...(existing.modulePunishments || {}), ...(updates.modulePunishments || {}) },
      moduleLimits: { ...(existing.moduleLimits || {}), ...(updates.moduleLimits || {}) },
      modules: { ...(existing.modules || {}), ...(updates.modules || {}) }
    };
    this.updateConfig(guildId, { autoMod: merged });
    return merged;
  },

  addAutoModWhitelist(guildId, id) {
    const current = this.getConfig(guildId);
    const am = current.autoMod || defaultGuildConfig.autoMod;
    const list = Array.from(new Set([...(am.whitelist || []), id]));
    this.updateAutoModConfig(guildId, { whitelist: list });
    return list;
  },

  removeAutoModWhitelist(guildId, id) {
    const current = this.getConfig(guildId);
    const am = current.autoMod || defaultGuildConfig.autoMod;
    const list = (am.whitelist || []).filter((item) => item !== id);
    this.updateAutoModConfig(guildId, { whitelist: list });
    return list;
  },

  addBadWord(guildId, word) {
    const current = this.getConfig(guildId);
    const am = current.autoMod || defaultGuildConfig.autoMod;
    const cleanWord = String(word).trim().toLowerCase();
    if (!cleanWord) return am.badWords || [];
    const list = Array.from(new Set([...(am.badWords || []), cleanWord]));
    this.updateAutoModConfig(guildId, { badWords: list });
    return list;
  },

  removeBadWord(guildId, word) {
    const current = this.getConfig(guildId);
    const am = current.autoMod || defaultGuildConfig.autoMod;
    const cleanWord = String(word).trim().toLowerCase();
    const list = (am.badWords || []).filter((w) => w !== cleanWord);
    this.updateAutoModConfig(guildId, { badWords: list });
    return list;
  },

  setLogChannel(guildId, channelId) {
    return this.updateConfig(guildId, { logChannel: channelId });
  },

  async sanitizeRole(role, reason = 'Converted to Safe All-Channel Messaging Role') {
    const { PermissionFlagsBits } = require('discord.js');
    if (!role || !role.guild) return false;

    const botMember = role.guild.members.me;
    if (role.position >= botMember.roles.highest.position) {
      logger.warn(`[SECURITY] Cannot modify role ${role.name} due to hierarchy!`);
      return false;
    }

    try {
      // Strip Administrator and dangerous management permissions, grant full messaging permissions
      const newPermissions = role.permissions
        .remove([
          PermissionFlagsBits.Administrator,
          PermissionFlagsBits.ManageGuild,
          PermissionFlagsBits.ManageRoles,
          PermissionFlagsBits.ManageChannels,
          PermissionFlagsBits.ManageWebhooks,
          PermissionFlagsBits.ManageEvents,
          PermissionFlagsBits.BanMembers,
          PermissionFlagsBits.KickMembers,
          PermissionFlagsBits.ModerateMembers
        ])
        .add([
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.EmbedLinks,
          PermissionFlagsBits.AttachFiles,
          PermissionFlagsBits.AddReactions,
          PermissionFlagsBits.UseExternalEmojis,
          PermissionFlagsBits.UseApplicationCommands,
          PermissionFlagsBits.Connect,
          PermissionFlagsBits.Speak
        ]);

      await role.setPermissions(newPermissions, `[Kyvex SECURITY] ${reason}`);
      logger.info(`[SECURITY] Successfully sanitized role [${role.name}] in [${role.guild.name}]`);
      return true;
    } catch (err) {
      logger.error(`[SECURITY] Failed to sanitize role [${role.name}]:`, err);
      return false;
    }
  },

  async enforceAdminLockdown(guild) {
    if (!guild) return { sanitizedCount: 0 };
    const { PermissionFlagsBits } = require('discord.js');
    const botMember = guild.members.me || (await guild.members.fetchMe().catch(() => null));
    if (!botMember) return { sanitizedCount: 0 };

    const config = this.getConfig(guild.id);
    if (!config.antiNuke || config.antiAdminLockdown === false) {
      return { sanitizedCount: 0, status: 'disabled' };
    }

    logger.info(`[SECURITY SCAN] Running Admin Lockdown scan on guild: [${guild.name}]`);

    // 1. Scan and sanitize roles below the bot's highest role that have Administrator or dangerous management permissions
    const roles = await guild.roles.fetch().catch(() => guild.roles.cache);
    let sanitizedCount = 0;

    for (const role of roles.values()) {
      // Ignore managed/integration roles (like bot's own managed role), @everyone, or roles above/equal to bot
      if (role.managed || role.id === guild.id || role.position >= botMember.roles.highest.position) {
        continue;
      }

      const hasAdmin = role.permissions.has(PermissionFlagsBits.Administrator);
      const hasDangerous =
        role.permissions.has(PermissionFlagsBits.ManageGuild) ||
        role.permissions.has(PermissionFlagsBits.ManageRoles) ||
        role.permissions.has(PermissionFlagsBits.ManageChannels) ||
        role.permissions.has(PermissionFlagsBits.BanMembers) ||
        role.permissions.has(PermissionFlagsBits.KickMembers);

      if (hasAdmin || hasDangerous) {
        logger.warn(`[SECURITY SCAN] Found dangerous/admin role [${role.name}] (${role.id}). Sanitizing...`);
        const ok = await this.sanitizeRole(
          role,
          'Lockdown: Stripped destructive admin permissions while keeping chat access'
        );
        if (ok) sanitizedCount++;
      }
    }

    if (sanitizedCount > 0) {
      logger.info(`[SECURITY SCAN] Sanitized ${sanitizedCount} dangerous/admin roles in [${guild.name}].`);
    } else {
      logger.info(`[SECURITY SCAN] All manageable roles in [${guild.name}] are secure.`);
    }

    // 2. Scan members to ensure no unwhitelisted member has un-sanitized Administrator power
    try {
      const members = await guild.members.fetch().catch(() => guild.members.cache);
      for (const member of members.values()) {
        if (member.user.bot) continue;
        if (member.id === guild.ownerId) continue;
        if (this.isWhitelisted(guild, member.id)) continue;

        const hasAdminOrManage =
          member.permissions.has(PermissionFlagsBits.Administrator) ||
          member.permissions.has(PermissionFlagsBits.ManageGuild);

        if (hasAdminOrManage) {
          logger.warn(`[SECURITY SCAN] Unwhitelisted user ${member.user.tag} holds Administrator/ManageServer! Checking roles...`);
          const adminRoles = member.roles.cache.filter(
            (r) =>
              r.position < botMember.roles.highest.position &&
              (r.permissions.has(PermissionFlagsBits.Administrator) ||
                r.permissions.has(PermissionFlagsBits.ManageGuild))
          );
          if (adminRoles.size > 0) {
            await member.roles.remove(adminRoles, '[Kyvex] Stripped unwhitelisted admin/manage-server role');
            logger.warn(`[SECURITY SCAN] Stripped roles [${adminRoles.map((r) => r.name).join(', ')}] from ${member.user.tag}`);
          }
        }
      }
    } catch (e) {
      logger.error('[SECURITY SCAN] Member scan error:', e);
    }
  },

  async punish(guild, executorId, reason, actionOverride = null) {
    if (!guild || !executorId) return false;
    if (executorId === guild.ownerId || executorId === guild.client.user.id || this.isWhitelisted(guild, executorId)) return false;

    try {
      const member = await guild.members.fetch(executorId).catch(() => null);
      if (!member) {
        // If member is not in guild or already left, still attempt ban if action is ban
        const config = this.getConfig(guild.id);
        const action = actionOverride || config.punishment || 'ban';
        if (action === 'ban') {
          await guild.members.ban(executorId, { reason: `[Kyvex ANTI-NUKE] ${reason}` }).catch(() => {});
          return 'banned';
        }
        return false;
      }

      const botMember = guild.members.me || (await guild.members.fetchMe().catch(() => null));
      const config = this.getConfig(guild.id);
      const action = actionOverride || config.punishment || 'ban';

      // 1. Proactively strip all dangerous/administrative roles below bot hierarchy
      const { PermissionFlagsBits } = require('discord.js');
      if (botMember) {
        const dangerousRoles = member.roles.cache.filter(
          (role) =>
            role.position < botMember.roles.highest.position &&
            (role.permissions.has(PermissionFlagsBits.Administrator) ||
              role.permissions.has(PermissionFlagsBits.ManageGuild) ||
              role.permissions.has(PermissionFlagsBits.ManageRoles) ||
              role.permissions.has(PermissionFlagsBits.ManageChannels) ||
              role.permissions.has(PermissionFlagsBits.BanMembers) ||
              role.permissions.has(PermissionFlagsBits.KickMembers))
        );

        if (dangerousRoles.size > 0) {
          await member.roles.remove(dangerousRoles, `[Kyvex ANTI-ADMIN] ${reason}`).catch(() => {});
          logger.warn(`[ANTI-ADMIN] Stripped ${dangerousRoles.size} admin/manage roles from ${member.user.tag}`);
        }
      }

      // 2. Execute selected punishment with direct try/catch fallbacks
      if (action === 'ban') {
        try {
          await guild.members.ban(executorId, { reason: `[Kyvex ANTI-NUKE] ${reason}`, deleteMessageSeconds: 604800 });
          logger.warn(`[ANTI-NUKE] BANNED offender: ${member.user.tag} (${executorId}) for: ${reason}`);
          return 'banned';
        } catch (err) {
          logger.warn(`[ANTI-NUKE] Direct ban failed (${err.message}). Trying member.ban...`);
          try {
            await member.ban({ reason: `[Kyvex ANTI-NUKE] ${reason}` });
            return 'banned';
          } catch (e2) {
            logger.warn(`[ANTI-NUKE] Member ban failed (${e2.message}). Falling back to quarantine...`);
          }
        }
      } else if (action === 'kick') {
        try {
          await member.kick(`[Kyvex ANTI-NUKE] ${reason}`);
          logger.warn(`[ANTI-NUKE] KICKED offender: ${member.user.tag} (${executorId}) for: ${reason}`);
          return 'kicked';
        } catch (err) {
          logger.warn(`[ANTI-NUKE] Kick failed (${err.message}). Falling back to quarantine...`);
        }
      } else if (action === 'timeout') {
        try {
          const timeoutMs = config.timeoutDurationMs || ((config.timeoutDurationMinutes || 10) * 60 * 1000);
          await member.timeout(timeoutMs, `[Kyvex ANTI-NUKE] ${reason}`);
          const durationMins = Math.round(timeoutMs / 60000);
          logger.warn(`[ANTI-NUKE] TIMED OUT offender: ${member.user.tag} (${executorId}) for ${durationMins}m for: ${reason}`);
          return 'timed_out';
        } catch (err) {
          logger.warn(`[ANTI-NUKE] Timeout failed (${err.message}). Falling back to quarantine...`);
        }
      }

      // 3. Fallback Quarantine: Strip all manageable roles so user has zero permissions
      if (botMember) {
        const manageableRoles = member.roles.cache.filter((r) => r.position < botMember.roles.highest.position && r.id !== guild.id);
        if (manageableRoles.size > 0) {
          await member.roles.remove(manageableRoles, `[Kyvex ANTI-NUKE QUARANTINE] ${reason}`).catch(() => {});
        }
      }
      logger.warn(`[ANTI-NUKE] QUARANTINED offender: ${member.user.tag} (${executorId}) for: ${reason}`);
      return 'quarantined';
    } catch (error) {
      logger.error(`[ANTI-NUKE] Failed to punish ${executorId}:`, error);
      return false;
    }
  },

  async revertGuildSettings(guild, changes) {
    if (!changes || !Array.isArray(changes) || changes.length === 0) return;
    try {
      const revertData = {};
      for (const change of changes) {
        if (change.key === 'name' && change.old) revertData.name = change.old;
        if (change.key === 'description') revertData.description = change.old || null;
        if (change.key === 'verification_level' && typeof change.old === 'number') revertData.verificationLevel = change.old;
        if (change.key === 'default_message_notifications' && typeof change.old === 'number') revertData.defaultMessageNotifications = change.old;
        if (change.key === 'explicit_content_filter' && typeof change.old === 'number') revertData.explicitContentFilter = change.old;
        if (change.key === 'afk_timeout' && typeof change.old === 'number') revertData.afkTimeout = change.old;
        if (change.key === 'afk_channel_id') revertData.afkChannel = change.old || null;
        if (change.key === 'system_channel_id') revertData.systemChannel = change.old || null;
      }

      if (Object.keys(revertData).length > 0) {
        await guild.edit(revertData, '[Kyvex ANTI-NUKE] Reverted unauthorized server settings change');
        logger.info(`[SECURITY] Successfully restored server settings in [${guild.name}]`);
        return true;
      }
    } catch (err) {
      logger.error(`[SECURITY] Failed to revert guild settings in [${guild.name}]:`, err);
    }
    return false;
  },

  async getOrCreateLogChannel(guild) {
    const config = this.getConfig(guild.id);

    // 1. Check if configured logChannel exists
    if (config.logChannel) {
      const existing = guild.channels.cache.get(config.logChannel);
      if (existing) return existing;
    }

    // 2. Check if a channel named '🛡️・kyvex-logs' or 'kyvex-logs' already exists
    const found = guild.channels.cache.find(
      (c) => c.name === '🛡️・kyvex-logs' || c.name === 'kyvex-logs'
    );
    if (found) {
      this.setLogChannel(guild.id, found.id);
      return found;
    }

    // 3. Auto-create a brand new private security logs channel!
    try {
      const { PermissionFlagsBits, ChannelType, OverwriteType } = require('discord.js');
      const newChannel = await guild.channels.create({
        name: '🛡️・kyvex-logs',
        type: ChannelType.GuildText,
        topic: 'Private Security Logs & Anti-Nuke Alerts for Kyvex (Owner & Bot Only)',
        permissionOverwrites: [
          {
            id: guild.roles.everyone.id,
            type: OverwriteType.Role,
            deny: [PermissionFlagsBits.ViewChannel] // Private from normal members and unwhitelisted staff
          },
          {
            id: guild.client.user.id,
            type: OverwriteType.Member,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.EmbedLinks,
              PermissionFlagsBits.AttachFiles
            ]
          },
          ...(guild.ownerId ? [{
            id: guild.ownerId,
            type: OverwriteType.Member,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.ReadMessageHistory
            ]
          }] : [])
        ],
        reason: '[Kyvex] Auto-created private security log channel'
      });

      this.setLogChannel(guild.id, newChannel.id);

      const initEmbed = new EmbedBuilder()
        .setColor('#F1C40F')
        .setTitle('🛡️ Kyvex • Security Log Channel Initialized')
        .setDescription(
          '**Ye channel automatically create kiya gaya hai aur completely private hai!**\n\n' +
          '• **Visibility:** Sirf **Server Owner** (<@' + guild.ownerId + '>) aur **Kyvex** bot hi ise dekh sakte hain.\n' +
          '• **Anti-Nuke Alerts:** Jab bhi koi unwhitelisted admin channel/role delete, mass-ban, kick ya unauthorized bot invite karega, uska alert yahan aayega!\n' +
          '• **Whitelist:** Kisi trusted admin ko allow karne ke liye `/whitelist add @user` use karein.'
        )
        .setFooter({ text: 'Kyvex Security System • Auto-Setup Complete' })
        .setTimestamp();

      await newChannel.send({ embeds: [initEmbed] }).catch(() => {});
      logger.info(`[SECURITY] Auto-created private log channel #${newChannel.name} in [${guild.name}]`);
      return newChannel;
    } catch (error) {
      logger.error('Failed to auto-create security log channel:', error);
      return null;
    }
  },

  async logSecurityAlert(guild, { action, executor, target, reason, details }) {
    const alertEntry = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      action: action || 'Security Intercept',
      executor: executor ? (executor.tag || executor.username || executor.id) : 'Unknown User',
      executorId: executor ? executor.id : null,
      target: target || 'Server Settings',
      status: details || 'Neutralized & Punished',
      reason: reason || 'Unauthorized Action',
      guildName: guild?.name || 'Unknown Server'
    };

    // Keep last 50 alerts in memory
    recentAlerts.unshift(alertEntry);
    if (recentAlerts.length > 50) recentAlerts.pop();

    const embed = new EmbedBuilder()
      .setColor('#FF0000')
      .setTitle('🚨 Kyvex • SECURITY BREACH DETECTED!')
      .setDescription(
        `**Action:** \`${action}\`\n` +
        `**Rogue User:** ${executor ? `<@${executor.id}> (${executor.tag || executor.username})` : 'Unknown'}\n` +
        `**Target:** \`${target || 'Server Setting'}\`\n` +
        `**Status / Countermeasure:** **${details || 'Neutralized & Punished'}**\n` +
        `**Reason:** ${reason || 'Unauthorized Administrator Action'}`
      )
      .setFooter({ text: 'Kyvex Security System • Instant Protection' })
      .setTimestamp();

    // 1. Send to auto-created or configured log channel
    const logChannel = await this.getOrCreateLogChannel(guild);
    if (logChannel) {
      await logChannel.send({ embeds: [embed] }).catch(() => {});
      return;
    }

    // 2. Fallback: DM Server Owner
    try {
      const owner = await guild.fetchOwner();
      if (owner) {
        await owner.send({
          content: `⚠️ **Security Alert for your server [${guild.name}]**`,
          embeds: [embed]
        }).catch(() => {});
      }
    } catch (e) {}
  },

  getRecentAlerts(limit = 20) {
    return recentAlerts.slice(0, limit);
  },

  async toggleEmergencyLockdown(guild, enable) {
    if (!guild) return false;
    const { PermissionFlagsBits, ChannelType } = require('discord.js');
    const channels = await guild.channels.fetch().catch(() => guild.channels.cache);
    let affected = 0;

    for (const channel of channels.values()) {
      if (!channel || channel.type !== ChannelType.GuildText) continue;
      try {
        await channel.permissionOverwrites.edit(guild.roles.everyone, {
          SendMessages: enable ? false : null
        }, { reason: `[Kyvex] Emergency Lockdown ${enable ? 'ENABLED' : 'DISABLED'}` });
        affected++;
      } catch (err) {
        // channel permission modification error handled silently
      }
    }

    this.updateConfig(guild.id, { emergencyLockdown: enable });
    logger.warn(`[EMERGENCY LOCKDOWN] Guild [${guild.name}] lockdown set to: ${enable} (${affected} channels affected)`);
    return { success: true, enabled: enable, affectedChannels: affected };
  },

  // ==========================================
  // 5-TIER PERMISSION SYSTEM
  // ==========================================
  getUserTier(guild, memberOrUser) {
    if (!guild || !memberOrUser) return TIERS.USER;
    const userId = typeof memberOrUser === 'string' ? memberOrUser : memberOrUser.id;

    // Tier 1: Owner (Guild Owner + Extra Owners + Bot self)
    if (userId === guild.ownerId || this.isExtraOwner(guild, userId) || userId === guild.client?.user?.id) {
      return TIERS.OWNER;
    }

    const config = this.getConfig(guild.id);

    // Tier 2: Administrator (Admin Whitelist or Discord Administrator in whitelist)
    const adminList = config.adminWhitelist || config.whitelist || [];
    if (adminList.includes(userId)) {
      return TIERS.ADMIN;
    }

    const member = guild.members.cache.get(userId);
    const memberRoleIds = member ? Array.from(member.roles.cache.keys()) : [];

    // Tier 3: Security Manager
    const secUsers = config.securityManagers?.users || [];
    const secRoles = config.securityManagers?.roles || [];
    if (secUsers.includes(userId) || secRoles.some((r) => memberRoleIds.includes(r))) {
      return TIERS.SECURITY_MANAGER;
    }

    // Tier 4: Moderator
    const modUsers = config.moderators?.users || [];
    const modRoles = config.moderators?.roles || [];
    if (modUsers.includes(userId) || modRoles.some((r) => memberRoleIds.includes(r))) {
      return TIERS.MODERATOR;
    }
    const { PermissionFlagsBits } = require('discord.js');
    if (member && (
      member.permissions.has(PermissionFlagsBits.ModerateMembers) ||
      member.permissions.has(PermissionFlagsBits.BanMembers) ||
      member.permissions.has(PermissionFlagsBits.ManageMessages)
    )) {
      return TIERS.MODERATOR;
    }

    // Tier 5: Trusted User
    const trustUsers = config.trustedUsers?.users || [];
    const trustRoles = config.trustedUsers?.roles || [];
    if (trustUsers.includes(userId) || trustRoles.some((r) => memberRoleIds.includes(r))) {
      return TIERS.TRUSTED;
    }

    return TIERS.USER;
  },

  hasTier(guild, memberOrUser, requiredTierName) {
    const userTier = this.getUserTier(guild, memberOrUser);
    const reqLevel = TIERS[requiredTierName.toUpperCase()] ?? 0;
    return userTier >= reqLevel;
  },

  getTierName(tierLevel) {
    for (const [name, val] of Object.entries(TIERS)) {
      if (val === tierLevel) return name;
    }
    return 'USER';
  },

  protectCommand(interaction, requiredTierName) {
    if (!this.hasTier(interaction.guild, interaction.user, requiredTierName)) {
      const { createErrorEmbed } = require('./embedBuilder');
      const userTier = this.getTierName(this.getUserTier(interaction.guild, interaction.user));
      interaction.reply({
        embeds: [
          createErrorEmbed(
            'Access Denied • Insufficient Security Tier',
            `⛔ **This command requires \`${requiredTierName.toUpperCase()}\` tier or higher.**\n\n` +
            `• **Your Tier:** \`${userTier}\`\n` +
            `• **Required Tier:** \`${requiredTierName.toUpperCase()}\`\n\n` +
            `*Security Policy: Normal staff cannot alter security configurations or bypass restrictions without explicit tier assignment.*`
          )
        ],
        ephemeral: true
      }).catch(() => {});
      return false;
    }
    return true;
  },

  addTierUser(guildId, tierKey, userId) {
    const config = this.getConfig(guildId);
    const targetGroup = config[tierKey] || { users: [], roles: [] };
    if (!targetGroup.users.includes(userId)) {
      targetGroup.users.push(userId);
      this.updateConfig(guildId, { [tierKey]: targetGroup });
    }
    return targetGroup;
  },

  removeTierUser(guildId, tierKey, userId) {
    const config = this.getConfig(guildId);
    const targetGroup = config[tierKey] || { users: [], roles: [] };
    targetGroup.users = targetGroup.users.filter((id) => id !== userId);
    this.updateConfig(guildId, { [tierKey]: targetGroup });
    return targetGroup;
  },

  addTierRole(guildId, tierKey, roleId) {
    const config = this.getConfig(guildId);
    const targetGroup = config[tierKey] || { users: [], roles: [] };
    if (!targetGroup.roles.includes(roleId)) {
      targetGroup.roles.push(roleId);
      this.updateConfig(guildId, { [tierKey]: targetGroup });
    }
    return targetGroup;
  },

  removeTierRole(guildId, tierKey, roleId) {
    const config = this.getConfig(guildId);
    const targetGroup = config[tierKey] || { users: [], roles: [] };
    targetGroup.roles = targetGroup.roles.filter((id) => id !== roleId);
    this.updateConfig(guildId, { [tierKey]: targetGroup });
    return targetGroup;
  },

  // ==========================================
  // ANTI-RAID RUNTIME STATE
  // ==========================================
  isRaidActive(guildId) {
    const state = this.raidStates.get(guildId);
    if (!state) return false;
    // Auto expire after 30 mins
    if (Date.now() - state.timestamp > 30 * 60 * 1000) {
      this.raidStates.delete(guildId);
      return false;
    }
    return state.active;
  },

  setRaidState(guildId, active, metadata = {}) {
    if (active) {
      this.raidStates.set(guildId, {
        active: true,
        timestamp: Date.now(),
        ...metadata
      });
    } else {
      this.raidStates.delete(guildId);
    }
  },

  // ==========================================
  // ANTI-NUKE ACTION BURST TRACKER
  // ==========================================
  recordAndCheckBurst(guild, executorId, actionType, customLimit = null, customWindowSec = null) {
    if (!guild || !executorId) return { exceeded: false, count: 0, limit: 1 };
    if (this.isWhitelisted(guild, executorId)) return { exceeded: false, count: 0, limit: 1 };

    const config = this.getConfig(guild.id);
    const thresholds = config.antiNukeThresholds || defaultGuildConfig.antiNukeThresholds;
    const windowSec = customWindowSec || thresholds.windowSec || 60;
    const windowMs = windowSec * 1000;

    let limit = 1;
    if (customLimit !== null && customLimit !== undefined) {
      limit = Math.max(1, parseInt(customLimit, 10) || 1);
    } else if (config.moduleLimits && config.moduleLimits[actionType] !== undefined) {
      limit = Math.max(1, parseInt(config.moduleLimits[actionType], 10) || 1);
    } else if (thresholds[actionType] !== undefined) {
      limit = Math.max(1, parseInt(thresholds[actionType], 10) || 1);
    }

    const key = `${guild.id}:${executorId}:${actionType}`;
    const now = Date.now();
    let timestamps = this.actionBursts.get(key) || [];
    timestamps = timestamps.filter((t) => now - t <= windowMs);
    timestamps.push(now);
    this.actionBursts.set(key, timestamps);

    const count = timestamps.length;
    const exceeded = count >= limit;

    if (exceeded) {
      // Reset burst count when threshold is breached so punishment doesn't loop
      this.actionBursts.delete(key);
    }

    return { exceeded, count, limit };
  }
};

module.exports = securityManager;
