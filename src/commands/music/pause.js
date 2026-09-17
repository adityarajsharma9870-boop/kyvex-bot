const { SlashCommandBuilder } = require('discord.js');
const { createErrorEmbed, createSuccessEmbed } = require('../../utils/embedBuilder');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('pause')
    .setDescription('Pause current music playback'),

  category: 'music',

  async execute(interaction, client) {
    const queue = client.distube.getQueue(interaction.guildId);
    if (!queue) {
      return interaction.reply({
        embeds: [createErrorEmbed('No Music Playing', 'There is currently no music playing in this server.')],
        ephemeral: true
      });
    }

    if (queue.paused) {
      return interaction.reply({
        embeds: [createErrorEmbed('Already Paused', 'The current song is already paused. Use `/resume` to unpause.')],
        ephemeral: true
      });
    }

    queue.pause();
    return interaction.reply({
      embeds: [createSuccessEmbed('Playback Paused', '⏸️ Music has been paused. Use `/resume` to continue.')]
    });
  }
};
