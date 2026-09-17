const { SlashCommandBuilder, ChannelType, PermissionFlagsBits } = require('discord.js');
const securityManager = require('../../utils/securityManager');
const { createSuccessEmbed, createErrorEmbed } = require('../../utils/embedBuilder');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setlogchannel')
    .setDescription('Set the channel where Kyvex posts security alerts and audit logs')
    .addChannelOption((option) =>
      option
        .setName('channel')
        .setDescription('Text channel for security logs')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    ),

  category: 'security',

  async execute(interaction, client) {
    if (interaction.user.id !== interaction.guild.ownerId) {
      return interaction.reply({
        embeds: [createErrorEmbed('Permission Denied', 'Only the **Server Owner** can set the security log channel.')],
        ephemeral: true
      });
    }

    const channel = interaction.options.getChannel('channel');
    securityManager.setLogChannel(interaction.guildId, channel.id);

    return interaction.reply({
      embeds: [
        createSuccessEmbed(
          'Security Channel Configured',
          `📢 All security breaches, anti-nuke intercepts, and audit logs will now be sent to ${channel}!`
        )
      ]
    });
  }
};
