const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createSuccessEmbed, createErrorEmbed } = require('../../utils/embedBuilder');
const securityManager = require('../../utils/securityManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('slowmode')
    .setDescription('Set slowmode cooldown for the current channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addIntegerOption((opt) =>
      opt
        .setName('seconds')
        .setDescription('Cooldown in seconds (0 to disable)')
        .setRequired(true)
        .setMinValue(0)
        .setMaxValue(21600)
    ),

  category: 'moderation',

  async execute(interaction, client) {
    if (!securityManager.protectCommand(interaction, 'MODERATOR')) return;

    const seconds = interaction.options.getInteger('seconds');

    try {
      await interaction.channel.setRateLimitPerUser(seconds);
      return interaction.reply({
        embeds: [
          createSuccessEmbed(
            'Slowmode Updated',
            seconds === 0
              ? '⚡ Slowmode has been **disabled** in this channel.'
              : `⏱️ Slowmode set to **${seconds} seconds** per message.`
          )
        ]
      });
    } catch (err) {
      return interaction.reply({
        embeds: [createErrorEmbed('Slowmode Failed', err.message || 'Could not update slowmode.')],
        ephemeral: true
      });
    }
  }
};
