const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createSuccessEmbed, createErrorEmbed } = require('../../utils/embedBuilder');
const securityManager = require('../../utils/securityManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unlock')
    .setDescription('Unlock the current channel for @everyone')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  category: 'moderation',

  async execute(interaction, client) {
    if (!securityManager.protectCommand(interaction, 'MODERATOR')) return;

    try {
      await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
        SendMessages: null
      });

      const logManager = require('../../utils/logManager');
      await logManager.logModAction(interaction.guild, {
        action: 'CHANNEL UNLOCK',
        target: `#${interaction.channel.name}`,
        moderator: interaction.user,
        reason: 'Unlocked for @everyone'
      });

      return interaction.reply({
        embeds: [
          createSuccessEmbed(
            'Channel Unlocked',
            `🔓 **${interaction.channel.name}** has been unlocked! Members can now send messages.`
          )
        ]
      });
    } catch (err) {
      return interaction.reply({
        embeds: [createErrorEmbed('Unlock Failed', err.message || 'Could not unlock channel.')],
        ephemeral: true
      });
    }
  }
};
