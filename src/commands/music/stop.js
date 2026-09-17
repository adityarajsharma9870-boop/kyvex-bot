const { SlashCommandBuilder } = require('discord.js');
const { createErrorEmbed, createSuccessEmbed } = require('../../utils/embedBuilder');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stop')
    .setDescription('Stop music playback, clear queue, and leave voice channel'),

  category: 'music',

  async execute(interaction, client) {
    const queue = client.distube.getQueue(interaction.guildId);
    if (!queue) {
      return interaction.reply({
        embeds: [createErrorEmbed('No Music Playing', 'There is currently no music playing in this server.')],
        ephemeral: true
      });
    }

    try {
      await queue.stop();
      if (!client.stayInVoice?.[interaction.guildId]) {
        await client.distube.voices.leave(interaction.guildId);
      }

      return interaction.reply({
        embeds: [createSuccessEmbed('Playback Stopped', '⏹️ Music has been stopped and queue has been cleared.')]
      });
    } catch (error) {
      return interaction.reply({
        embeds: [createErrorEmbed('Stop Error', error.message || 'Could not stop music.')],
        ephemeral: true
      });
    }
  }
};
