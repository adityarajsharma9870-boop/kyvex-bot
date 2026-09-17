const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const logManager = require('../../utils/logManager');
const securityManager = require('../../utils/securityManager');
const { createErrorEmbed } = require('../../utils/embedBuilder');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setlog')
    .setDescription('Automatically creates private logging category & 7 dedicated log channels')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption((option) =>
      option
        .setName('category_name')
        .setDescription('Custom category name (default: Zynrax Logs)')
        .setRequired(false)
    ),

  category: 'security',

  async execute(interaction, client) {
    // Check permission: Owner, Extra Owner, or Whitelisted Admin
    const isWhitelisted = securityManager.isWhitelisted(interaction.guild, interaction.user.id);
    if (!isWhitelisted && interaction.user.id !== interaction.guild.ownerId) {
      return interaction.reply({
        embeds: [
          createErrorEmbed(
            'Permission Denied',
            '⛔ Only the **Server Owner** or Whitelisted Administrators can auto-setup logging channels.'
          )
        ],
        ephemeral: true
      });
    }

    await interaction.deferReply();

    const customCategory = interaction.options.getString('category_name') || 'Zynrax Logs';

    try {
      const result = await logManager.setupLogs(interaction.guild, customCategory);

      const embed = new EmbedBuilder()
        .setColor('#F1C40F')
        .setAuthor({
          name: 'OG EMPIRE • Automated Server Logging System',
          iconURL: client.user.displayAvatarURL()
        })
        .setTitle('✅ Logging Channels Auto-Configured Successfully!')
        .setDescription(
          `All **7 dedicated logging channels** have been created under the private category **${result.category.name}**.\n` +
          `Permissions have been automatically configured so regular members cannot view or access these logs.\n`
        )
        .addFields([
          { name: '📁 Category', value: `\`${result.category.name}\` (\`${result.category.id}\`)`, inline: false },
          { name: '👥 Member Logs', value: `<#${result.config.channels.member}> (\`member-logs\`)`, inline: true },
          { name: '💬 Message Logs', value: `<#${result.config.channels.message}> (\`message-logs\`)`, inline: true },
          { name: '🔊 Voice Logs', value: `<#${result.config.channels.voice}> (\`voice-logs\`)`, inline: true },
          { name: '🌐 Server Logs', value: `<#${result.config.channels.server}> (\`server-logs\`)`, inline: true },
          { name: '📺 Channel Logs', value: `<#${result.config.channels.channel}> (\`channel-logs\`)`, inline: true },
          { name: '🛡️ Role Logs', value: `<#${result.config.channels.role}> (\`role-logs\`)`, inline: true },
          { name: '🔨 Mod Logs', value: `<#${result.config.channels.mod}> (\`mod-logs\`)`, inline: true }
        ])
        .setFooter({ text: 'All server activities will now be logged live in real-time!' })
        .setTimestamp();

      return interaction.editReply({ embeds: [embed] });
    } catch (err) {
      return interaction.editReply({
        embeds: [
          createErrorEmbed(
            'Setup Failed',
            `❌ Failed to setup logging channels: \`${err.message}\`\nPlease ensure the bot has **Administrator** or **Manage Channels** permissions and its role is high enough.`
          )
        ]
      });
    }
  }
};
