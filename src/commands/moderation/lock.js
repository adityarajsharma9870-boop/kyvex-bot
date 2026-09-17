const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createSuccessEmbed, createErrorEmbed } = require('../../utils/embedBuilder');
const securityManager = require('../../utils/securityManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('lock')
    .setDescription('Lock down the current channel for @everyone')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  category: 'moderation',

  async execute(interaction, client) {
    if (!securityManager.protectCommand(interaction, 'MODERATOR')) return;

    try {
      await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
        SendMessages: false
      });

      const logManager = require('../../utils/logManager');
      await logManager.logModAction(interaction.guild, {
        action: 'CHANNEL LOCK',
        target: `#${interaction.channel.name}`,
        moderator: interaction.user,
        reason: 'Locked for @everyone'
      });

      return interaction.reply({
        embeds: [
          createSuccessEmbed(
            'Channel Locked',
            `🔒 **${interaction.channel.name}** has been locked for @everyone! Use \`/unlock\` to reopen.`
          )
        ]
      });
    } catch (err) {
      return interaction.reply({
        embeds: [createErrorEmbed('Lock Failed', err.message || 'Could not lock channel.')],
        ephemeral: true
      });
    }
  }
};
