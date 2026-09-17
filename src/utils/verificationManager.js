const fs = require('fs');
const path = require('path');
const { 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  AttachmentBuilder, 
  PermissionsBitField 
} = require('discord.js');
const logger = require('./logger');

const dataDir = path.join(__dirname, '..', '..', 'data');
const dataFilePath = path.join(dataDir, 'verification.json');

// Ensure data file exists
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
    logger.error('Failed to load verification.json:', e);
    return {};
  }
}

function saveData(data) {
  try {
    fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2));
  } catch (e) {
    logger.error('Failed to save verification.json:', e);
  }
}

const defaultVerificationConfig = {
  enabled: false,
  roleId: null,
  channelId: null,
  messageId: null,
  title: 'SECURITY',
  description: 'This server requires you to verify yourself to get access to other channels, you can simply verify by clicking on the verify button.',
  buttonText: 'Verify',
  buttonColor: 'Primary', // Primary (Blurple), Success (Green), Danger (Red), Secondary (Gray)
  buttonEmoji: '🛡️',
  bannerUrl: null, // If null, uses bundled high-res attachment
  embedColor: '#2b7fff', // Default matching user's screenshot
  verifiedCount: 0
};

const verificationManager = {
  getConfig(guildId) {
    const data = loadData();
    if (!data[guildId]) {
      data[guildId] = { ...defaultVerificationConfig };
      saveData(data);
    }
    return data[guildId];
  },

  updateConfig(guildId, updates) {
    const data = loadData();
    const current = data[guildId] || { ...defaultVerificationConfig };
    data[guildId] = { ...current, ...updates };
    saveData(data);
    return data[guildId];
  },

  /**
   * Generates Discord Embed, Components, and optional Attachment for Verification Panel
   */
  buildVerificationPayload(guild, config) {
    const embed = new EmbedBuilder()
      .setColor(config.embedColor || '#2b7fff')
      .setDescription(config.description || defaultVerificationConfig.description);

    // Optional Author header: "SECURITY" with badge / guild icon
    if (config.title) {
      embed.setAuthor({
        name: config.title,
        iconURL: guild.iconURL({ dynamic: true }) || 'https://cdn.discordapp.com/embed/avatars/0.png'
      });
    }

    const files = [];
    const localBannerPath = path.join(__dirname, '..', '..', 'public', 'assets', 'verify-banner.png');

    if (config.bannerUrl && config.bannerUrl.startsWith('http')) {
      embed.setImage(config.bannerUrl);
    } else if (fs.existsSync(localBannerPath)) {
      const bannerAttachment = new AttachmentBuilder(localBannerPath, { name: 'verify-banner.png' });
      files.push(bannerAttachment);
      embed.setImage('attachment://verify-banner.png');
    }

    // Button style
    let style = ButtonStyle.Primary;
    if (config.buttonColor === 'Success') style = ButtonStyle.Success;
    else if (config.buttonColor === 'Danger') style = ButtonStyle.Danger;
    else if (config.buttonColor === 'Secondary') style = ButtonStyle.Secondary;

    const button = new ButtonBuilder()
      .setCustomId('btn_verify_member')
      .setLabel(config.buttonText || 'Verify')
      .setStyle(style);

    if (config.buttonEmoji) {
      button.setEmoji(config.buttonEmoji);
    }

    const row = new ActionRowBuilder().addComponents(button);

    return {
      embeds: [embed],
      components: [row],
      files
    };
  },

  /**
   * Deploy verification panel into a text channel
   */
  async deployPanel(guild, channel, role, options = {}) {
    const config = this.getConfig(guild.id);
    
    config.enabled = true;
    config.roleId = role.id;
    config.channelId = channel.id;
    if (options.description) config.description = options.description;
    if (options.title) config.title = options.title;
    if (options.buttonText) config.buttonText = options.buttonText;
    if (options.embedColor) config.embedColor = options.embedColor;
    if (options.bannerUrl) config.bannerUrl = options.bannerUrl;

    const payload = this.buildVerificationPayload(guild, config);
    const sentMessage = await channel.send(payload);

    config.messageId = sentMessage.id;
    this.updateConfig(guild.id, config);

    logger.info(`[VERIFICATION] Deployed verification panel in Guild [${guild.name}] Channel [${channel.name}] for Role [${role.name}]`);
    return sentMessage;
  },

  /**
   * Handle the Verify button click event
   */
  async handleVerificationButton(interaction) {
    const { guild, member } = interaction;
    if (!guild || !member) return;

    await interaction.deferReply({ ephemeral: true }).catch(() => {});

    const config = this.getConfig(guild.id);
    if (!config || !config.enabled || !config.roleId) {
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor('#ef4444')
            .setTitle('⚠️ Verification System Inactive')
            .setDescription('Verification has not been fully configured on this server yet. Please ask an administrator to set it up with `/verification setup`.')
        ]
      });
    }

    const role = guild.roles.cache.get(config.roleId);
    if (!role) {
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor('#ef4444')
            .setTitle('❌ Role Not Found')
            .setDescription('The configured verification role no longer exists in this server. Please contact an admin.')
        ]
      });
    }

    // 1. Check if user already has the role
    if (member.roles.cache.has(role.id)) {
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor('#38bdf8')
            .setTitle('ℹ️ Already Verified')
            .setDescription(`You are already verified in **${guild.name}**! You already have the ${role} role and access to all member channels.`)
        ]
      });
    }

    // 2. Check bot hierarchy & permissions
    const botMember = guild.members.me;
    if (!botMember.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor('#ef4444')
            .setTitle('❌ Permission Error')
            .setDescription('The bot lacks the `Manage Roles` permission to assign the verification role.')
        ]
      });
    }

    if (role.position >= botMember.roles.highest.position) {
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor('#ef4444')
            .setTitle('❌ Role Hierarchy Error')
            .setDescription(`The role ${role} is higher than or equal to the bot's highest role. Please move the bot's role above ${role} in Server Settings &rarr; Roles.`)
        ]
      });
    }

    // 3. Grant the verified role
    try {
      await member.roles.add(role, `Server Verification by ${interaction.user.tag}`);
      
      // Increment counter
      config.verifiedCount = (config.verifiedCount || 0) + 1;
      this.updateConfig(guild.id, { verifiedCount: config.verifiedCount });

      logger.info(`[VERIFICATION] Member ${interaction.user.tag} (${interaction.user.id}) verified in ${guild.name} -> Assigned ${role.name}`);

      // Send ephemeral success embed
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor('#00ff88')
            .setTitle('✅ Verification Successful!')
            .setDescription(`Welcome to **${guild.name}**, ${interaction.user}!\n\nYou have been verified and granted the **${role.name}** role. You now have full access to the server!`)
            .setFooter({ text: 'Security Protected • Kyvex', iconURL: guild.iconURL({ dynamic: true }) || undefined })
            .setTimestamp()
        ]
      });

      // Send log to security channel if set
      try {
        const securityManager = require('./securityManager');
        const secConfig = securityManager.getConfig(guild.id);
        if (secConfig && secConfig.logChannel) {
          const logChan = guild.channels.cache.get(secConfig.logChannel);
          if (logChan && logChan.isTextBased()) {
            const logEmbed = new EmbedBuilder()
              .setColor('#00ff88')
              .setTitle('🛡️ Member Verified')
              .setDescription(`${interaction.user} (\`${interaction.user.id}\`) successfully verified via panel.`)
              .addFields(
                { name: 'Role Assigned', value: `${role}`, inline: true },
                { name: 'Account Age', value: `<t:${Math.floor(interaction.user.createdTimestamp / 1000)}:R>`, inline: true },
                { name: 'Total Verified', value: `${config.verifiedCount}`, inline: true }
              )
              .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
              .setTimestamp();
            logChan.send({ embeds: [logEmbed] }).catch(() => {});
          }
        }
      } catch (e) {}

    } catch (err) {
      logger.error(`Failed to assign verified role to ${interaction.user.tag}:`, err);
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor('#ef4444')
            .setTitle('❌ Verification Failed')
            .setDescription(`An error occurred while granting your role: \`${err.message}\`. Please notify the server staff.`)
        ]
      });
    }
  }
};

module.exports = verificationManager;
