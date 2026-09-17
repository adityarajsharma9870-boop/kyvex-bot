const fs = require('fs');
const path = require('path');
const { EmbedBuilder } = require('discord.js');
const logger = require('./logger');

const dataDir = path.join(__dirname, '..', '..', 'data');
const dataFilePath = path.join(dataDir, 'welcome.json');

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
    logger.error('Failed to load welcome.json:', e);
    return {};
  }
}

function saveData(data) {
  try {
    fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2));
  } catch (e) {
    logger.error('Failed to save welcome.json:', e);
  }
}

const defaultWelcomeConfig = {
  enabled: true,
  channelId: null,
  mentionUser: true,
  content: '{user}',
  authorEnabled: true,
  authorName: '{username}',
  authorIcon: 'user_avatar', // 'user_avatar', 'server_icon', 'custom', 'none'
  authorCustomUrl: '',
  title: '',
  description: `Welcome {user} to the **{server}**! 🌟\n\n• *Need assistance? Feel free to ask your questions in #🔧・support.*\n• *Have you checked out our premium features?*\n  - *Explore them today and support our development in #💎・premium!*\n\n*Enjoy your time here, and don't hesitate to reach out if you need help!*`,
  color: '#5865f2',
  thumbnail: 'custom', // 'user_avatar', 'server_icon', 'custom', 'none'
  thumbnailUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=400&auto=format&fit=crop&q=80',
  imageUrl: '',
  footerText: '{server} • Welcome!',
  footerIcon: 'server_icon', // 'server_icon', 'bot_icon', 'custom', 'none'
  footerCustomUrl: '',
  timestamp: true
};

const welcomeManager = {
  /**
   * Get welcome configuration for a guild
   * @param {string} guildId 
   * @returns {object}
   */
  getConfig(guildId) {
    const data = loadData();
    if (!data[guildId]) {
      data[guildId] = { ...defaultWelcomeConfig };
      saveData(data);
    }
    return { ...defaultWelcomeConfig, ...data[guildId] };
  },

  /**
   * Update welcome configuration for a guild
   * @param {string} guildId 
   * @param {object} updates 
   * @returns {object}
   */
  updateConfig(guildId, updates) {
    const data = loadData();
    const current = data[guildId] || { ...defaultWelcomeConfig };
    data[guildId] = { ...current, ...updates };
    saveData(data);
    return data[guildId];
  },

  /**
   * Replace template variables in a string
   */
  replaceVars(str, guild, member) {
    if (!str) return '';
    const username = member?.user?.username || member?.displayName || 'NewMember';
    const tag = member?.user?.tag || username;
    const server = guild?.name || 'Our Community';
    const memberCount = guild?.memberCount || 1;
    const userMention = member ? `<@${member.id}>` : `@${username}`;

    return str
      .replace(/{user}/g, userMention)
      .replace(/{username}/g, username)
      .replace(/{tag}/g, tag)
      .replace(/{server}/g, server)
      .replace(/{memberCount}/g, String(memberCount))
      .replace(/{count}/g, String(memberCount));
  },

  /**
   * Build Discord message payload with Embed
   */
  buildMessage(guild, member, customConfig = null) {
    const cfg = customConfig || this.getConfig(guild.id);
    const userAvatar = member?.user?.displayAvatarURL({ extension: 'png', dynamic: true, size: 512 }) 
      || 'https://cdn.discordapp.com/embed/avatars/0.png';
    const serverIcon = guild?.iconURL({ extension: 'png', dynamic: true, size: 512 }) 
      || 'https://cdn.discordapp.com/embed/avatars/0.png';
    const botAvatar = guild?.client?.user?.displayAvatarURL({ extension: 'png', size: 512 }) 
      || 'https://cdn.discordapp.com/embed/avatars/0.png';

    const embed = new EmbedBuilder();

    // Color
    const colorHex = cfg.color && /^#[0-9A-Fa-f]{6}$/.test(cfg.color) ? cfg.color : '#5865f2';
    embed.setColor(colorHex);

    // Author
    if (cfg.authorEnabled) {
      const authorText = this.replaceVars(cfg.authorName || '{username}', guild, member);
      let authorIconUrl = undefined;
      if (cfg.authorIcon === 'user_avatar') authorIconUrl = userAvatar;
      else if (cfg.authorIcon === 'server_icon') authorIconUrl = serverIcon;
      else if (cfg.authorIcon === 'custom' && cfg.authorCustomUrl) authorIconUrl = cfg.authorCustomUrl;

      embed.setAuthor({
        name: authorText,
        iconURL: authorIconUrl
      });
    }

    // Title
    if (cfg.title && cfg.title.trim()) {
      embed.setTitle(this.replaceVars(cfg.title, guild, member));
    }

    // Description
    if (cfg.description && cfg.description.trim()) {
      embed.setDescription(this.replaceVars(cfg.description, guild, member));
    }

    // Thumbnail
    if (cfg.thumbnail === 'user_avatar') {
      embed.setThumbnail(userAvatar);
    } else if (cfg.thumbnail === 'server_icon') {
      embed.setThumbnail(serverIcon);
    } else if (cfg.thumbnail === 'custom' && cfg.thumbnailUrl) {
      embed.setThumbnail(cfg.thumbnailUrl);
    }

    // Large Banner Image
    if (cfg.imageUrl && cfg.imageUrl.trim()) {
      embed.setImage(cfg.imageUrl.trim());
    }

    // Footer
    if (cfg.footerText && cfg.footerText.trim()) {
      let footerIconUrl = undefined;
      if (cfg.footerIcon === 'server_icon') footerIconUrl = serverIcon;
      else if (cfg.footerIcon === 'bot_icon') footerIconUrl = botAvatar;
      else if (cfg.footerIcon === 'custom' && cfg.footerCustomUrl) footerIconUrl = cfg.footerCustomUrl;

      embed.setFooter({
        text: this.replaceVars(cfg.footerText, guild, member),
        iconURL: footerIconUrl
      });
    }

    // Timestamp
    if (cfg.timestamp) {
      embed.setTimestamp();
    }

    // Outer Message Content (e.g. mention)
    let content = '';
    if (cfg.mentionUser && cfg.content) {
      content = this.replaceVars(cfg.content, guild, member);
    }

    return {
      content: content.trim() || undefined,
      embeds: [embed]
    };
  },

  /**
   * Send Welcome message to channel on new member join
   * @param {import('discord.js').GuildMember} member 
   */
  async sendWelcome(member) {
    if (!member || !member.guild) return;
    const guild = member.guild;
    const cfg = this.getConfig(guild.id);

    if (!cfg.enabled) return;

    // Find destination channel
    let channel = null;
    if (cfg.channelId) {
      channel = guild.channels.cache.get(cfg.channelId);
    }

    // Fallback: search for channel named welcome, general, or lobby
    if (!channel) {
      channel = guild.channels.cache.find(
        (c) => c.isTextBased() && (
          c.name.includes('welcome') || 
          c.name.includes('join') || 
          c.name.includes('general')
        )
      );
    }

    if (!channel || !channel.isTextBased()) {
      logger.warn(`[Welcome] No valid text channel found in ${guild.name} to send welcome message.`);
      return;
    }

    try {
      const payload = this.buildMessage(guild, member, cfg);
      await channel.send(payload);
      logger.info(`[Welcome] Sent welcome message for ${member.user.tag} in #${channel.name} (${guild.name})`);
    } catch (err) {
      logger.error(`[Welcome] Failed to send welcome message in #${channel.name}:`, err);
    }
  },

  /**
   * Send test welcome message
   */
  async sendTestWelcome(guild, channelId, customConfig = null) {
    if (!guild) throw new Error('Guild not found');
    const channel = guild.channels.cache.get(channelId);
    if (!channel || !channel.isTextBased()) {
      throw new Error('Selected channel was not found or is not a text channel.');
    }

    // Use guild owner or bot member as dummy member for preview
    const dummyMember = guild.members.me || guild.members.cache.first();
    const payload = this.buildMessage(guild, dummyMember, customConfig);

    return channel.send(payload);
  }
};

module.exports = welcomeManager;
