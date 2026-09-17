const { SlashCommandBuilder } = require('discord.js');
const { createErrorEmbed, createSuccessEmbed } = require('../../utils/embedBuilder');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('volume')
    .setDescription('Change the music playback volume (1% - 150%)')
    .addIntegerOption((option) =>
      option
        .setName('percent')
        .setDescription('Volume level from 1 to 150')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(150)
    ),

  category: 'music',

  async execute(interaction, client) {
    const queue = client.distube.getQueue(interaction.guildId);
    if (!queue) {
      return interaction.reply({
        embeds: [createErrorEmbed('No Music Playing', 'There is currently no music playing in this server.')],
        ephemeral: true
      });
    }

    const volume = interaction.options.getInteger('percent');
    queue.setVolume(volume);

    return interaction.reply({
      embeds: [
        createSuccessEmbed(
          'Volume Adjusted',
          `🔊 Volume has been set to **${volume}%**!`
        )
      ]
    });
  }
};
