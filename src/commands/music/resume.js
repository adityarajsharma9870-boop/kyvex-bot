const { SlashCommandBuilder } = require('discord.js');
const { createErrorEmbed, createSuccessEmbed } = require('../../utils/embedBuilder');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('resume')
    .setDescription('Resume paused music playback'),

  category: 'music',

  async execute(interaction, client) {
    const queue = client.distube.getQueue(interaction.guildId);
    if (!queue) {
      return interaction.reply({
        embeds: [createErrorEmbed('No Music Playing', 'There is currently no music playing in this server.')],
        ephemeral: true
      });
    }

    if (!queue.paused) {
      return interaction.reply({
        embeds: [createErrorEmbed('Not Paused', 'The music is already actively playing.')],
        ephemeral: true
      });
    }

    queue.resume();
    return interaction.reply({
      embeds: [createSuccessEmbed('Playback Resumed', '▶️ Resumed music playback.')]
    });
  }
};
