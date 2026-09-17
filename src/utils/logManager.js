const fs = require('fs');
const path = require('path');
const { ChannelType, PermissionFlagsBits, EmbedBuilder, AuditLogEvent } = require('discord.js');
const logger = require('./logger');

const dataDir = path.join(__dirname, '..', '..', 'data');
const logsFile = path.join(dataDir, 'logs.json');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

if (!fs.existsSync(logsFile)) {
  fs.writeFileSync(logsFile, JSON.stringify({}, null, 2));
}

function loadLogsData() {
  try {
    return JSON.parse(fs.readFileSync(logsFile, 'utf8'));
  } catch (e) {
    logger.error('Failed to load logs.json:', e);
    return {};
  }
}

function saveLogsData(data) {
  try {
    fs.writeFileSync(logsFile, JSON.stringify(data, null, 2));
  } catch (e) {
    logger.error('Failed to save logs.json:', e);
  }
}

// Definition of the 7 dedicated log channels matching user's reference
const LOG_CHANNEL_DEFINITIONS = [
  {
    key: 'member',
    name: 'member-logs',
    topic: 'Logs for member joins, leaves, nickname changes, and role assignments',
    color: '#22c55e',
    title: '👥 Member Logs Activated',
    description: 'This channel will record member joins, leaves, kicks, username changes, and profile updates.'
  },
  {
    key: 'message',
    name: 'message-logs',
    topic: 'Logs for message edits, deletions, and bulk purges',
    color: '#3b82f6',
    title: '💬 Message Logs Activated',
    description: 'This channel will record deleted messages, message edit history (before/after), and bulk message purges.'
  },
  {
    key: 'voice',
    name: 'voice-logs',
    topic: 'Logs for voice channel joins, leaves, and channel switches',
    color: '#8b5cf6',
    title: '🔊 Voice Logs Activated',
    description: 'This channel will record voice channel joins, leaves, moves between channels, and mute/deafen states.'
  },
  {
    key: 'server',
    name: 'server-logs',
    topic: 'Logs for server settings updates, emojis, stickers, and invites',
    color: '#06b6d4',
    title: '🌐 Server Logs Activated',
    description: 'This channel will record server name/icon updates, vanity URLs, invites created/deleted, and emojis.'
  },
  {
    key: 'channel',
    name: 'channel-logs',
    topic: 'Logs for channel creation, deletion, and settings updates',
    color: '#eab308',
    title: '📺 Channel Logs Activated',
    description: 'This channel will record channel creations, deletions, renames, topic changes, and slowmode changes.'
  },
  {
    key: 'role',
    name: 'role-logs',
    topic: 'Logs for role creation, deletion, and permission changes',
    color: '#ec4899',
    title: '🛡️ Role Logs Activated',
    description: 'This channel will record role creations, deletions, permission modifications, and color/name changes.'
  },
  {
    key: 'mod',
    name: 'mod-logs',
    topic: 'Logs for moderation actions (bans, unbans, kicks, timeouts, warnings, locks)',
    color: '#ef4444',
    title: '🔨 Moderation Logs Activated',
    description: 'This channel will record bans, kicks, timeouts, unbans, channel locks/unlocks, and nuke actions.'
  }
];

const logManager = {
  getGuildConfig(guildId) {
    const data = loadLogsData();
    return data[guildId] || null;
  },

  setGuildConfig(guildId, config) {
    const data = loadLogsData();
    data[guildId] = config;
    saveLogsData(data);
    return data[guildId];
  },

  /**
   * Automatically creates private category and all 7 log channels
   */
  async setupLogs(guild, customCategoryName = null) {
    if (!guild) throw new Error('Guild is required');

    const me = guild.members.me;
    if (!me.permissions.has(PermissionFlagsBits.ManageChannels)) {
      throw new Error('Bot lacks `Manage Channels` permission to create log channels.');
    }

    const categoryName = customCategoryName || 'Zynrax Logs';

    // Overwrites: Private to @everyone, full access to Bot & Server Admins
    const permissionOverwrites = [
      {
        id: guild.roles.everyone.id,
        deny: [PermissionFlagsBits.ViewChannel]
      },
      {
        id: me.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.EmbedLinks,
          PermissionFlagsBits.AttachFiles,
          PermissionFlagsBits.ManageChannels,
          PermissionFlagsBits.ReadMessageHistory
        ]
      }
    ];

    // Find existing category or create a new one
    let category = guild.channels.cache.find(
      (c) => c.type === ChannelType.GuildCategory && c.name.toLowerCase() === categoryName.toLowerCase()
    );

    if (!category) {
      category = await guild.channels.create({
        name: categoryName,
        type: ChannelType.GuildCategory,
        permissionOverwrites,
        reason: '[AUTO LOG SETUP] Created dedicated logging category'
      });
    }

    const channelsMap = {};
    const createdChannels = [];

    // Create each channel under the category
    for (const def of LOG_CHANNEL_DEFINITIONS) {
      // Check if channel already exists in this category
      let channel = guild.channels.cache.find(
        (c) => c.parentId === category.id && c.name.toLowerCase() === def.name.toLowerCase()
      );

      let isNew = false;
      if (!channel) {
        channel = await guild.channels.create({
          name: def.name,
          type: ChannelType.GuildText,
          parent: category.id,
          topic: def.topic,
          permissionOverwrites,
          reason: `[AUTO LOG SETUP] Created ${def.name}`
        });
        isNew = true;
      }

      channelsMap[def.key] = channel.id;
      createdChannels.push({
        key: def.key,
        name: def.name,
        channel,
        isNew
      });

      // Send initial welcome message if newly created
      if (isNew) {
        const welcomeEmbed = new EmbedBuilder()
          .setColor(def.color)
          .setTitle(def.title)
          .setDescription(def.description)
          .addFields([
            { name: '🔒 Security', value: 'This channel is **Private** (`@everyone` cannot view).', inline: true },
            { name: '📁 Category', value: `\`${category.name}\``, inline: true }
          ])
          .setFooter({ text: 'Kyvex Security & Logging System' })
          .setTimestamp();

        await channel.send({ embeds: [welcomeEmbed] }).catch(() => null);
      }
    }

    // Save into database
    const savedConfig = {
      categoryId: category.id,
      categoryName: category.name,
      channels: channelsMap,
      enabled: true,
      setupAt: new Date().toISOString()
    };

    this.setGuildConfig(guild.id, savedConfig);

    return {
      category,
      channels: createdChannels,
      config: savedConfig
    };
  },

  /**
   * Send a log embed to a specific log type ('member', 'message', 'voice', 'server', 'channel', 'role', 'mod')
   */
  async send(guild, logType, embed) {
    if (!guild) return null;
    const config = this.getGuildConfig(guild.id);
    if (!config || !config.enabled) return null;

    const channelId = config.channels?.[logType];
    if (!channelId) return null;

    try {
      const channel = guild.channels.cache.get(channelId) || await guild.channels.fetch(channelId).catch(() => null);
      if (channel && channel.isTextBased()) {
        return await channel.send({ embeds: [embed] }).catch((e) => {
          logger.warn(`Could not deliver log to channel [${channelId}]: ${e.message}`);
          return null;
        });
      }
    } catch (err) {
      logger.warn(`Failed to send log to [${logType}]: ${err.message}`);
    }
    return null;
  },

  /**
   * Fetches latest audit log entry to track "Kisne kiya" (Executor) & "Kisko kiya" (Target)
   */
  async fetchAuditLog(guild, actionType, targetId = null, maxAgeMs = 7000) {
    if (!guild || !guild.members?.me?.permissions.has(PermissionFlagsBits.ViewAuditLog)) {
      return null;
    }
    try {
      const logs = await guild.fetchAuditLogs({ type: actionType, limit: 5 });
      const now = Date.now();
      for (const entry of logs.entries.values()) {
        const isRecent = (now - entry.createdTimestamp) <= maxAgeMs;
        if (!isRecent) continue;

        if (targetId) {
          if (entry.targetId === targetId || entry.target?.id === targetId) {
            return entry;
          }
        } else {
          return entry;
        }
      }
    } catch (e) {
      logger.warn(`Failed to fetch audit log for action [${actionType}]: ${e.message}`);
    }
    return null;
  },

  /**
   * Helper to log moderation actions directly from moderation commands
   */
  async logModAction(guild, { action, target, moderator, reason, duration, details }) {
    const embed = new EmbedBuilder()
      .setColor('#ef4444')
      .setAuthor({
        name: `[MOD ACTION] ${action}`,
        iconURL: moderator?.displayAvatarURL?.({ dynamic: true }) || undefined
      })
      .setThumbnail(target?.displayAvatarURL?.({ dynamic: true }) || target?.user?.displayAvatarURL?.({ dynamic: true }) || undefined)
      .setDescription(`A moderation command **${action}** was executed on ${target || 'Unknown'}.`)
      .addFields([
        { name: '👤 Target', value: `${target?.tag || target?.user?.tag || target?.name || target} (\`${target?.id || 'Unknown'}\`)`, inline: true },
        { name: '🛡️ Moderator', value: `${moderator?.tag || moderator} (\`${moderator?.id || 'Unknown'}\`)`, inline: true },
        { name: '📝 Reason', value: reason || 'No reason provided', inline: false }
      ])
      .setFooter({ text: 'Kyvex Moderation Logs' })
      .setTimestamp();

    if (duration) {
      embed.addFields([{ name: '⏳ Duration', value: `${duration}`, inline: true }]);
    }
    if (details) {
      embed.addFields([{ name: 'ℹ️ Details', value: `${details}`, inline: true }]);
    }

    return this.send(guild, 'mod', embed);
  }
};

module.exports = logManager;
