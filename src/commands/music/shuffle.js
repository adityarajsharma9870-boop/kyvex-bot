const { SlashCommandBuilder } = require('discord.js');
const { createErrorEmbed, createSuccessEmbed } = require('../../utils/embedBuilder');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('shuffle')
    .setDescription('Shuffle all upcoming songs in the queue'),

  category: 'music',

  async execute(interaction, client) {
    const queue = client.distube.getQueue(interaction.guildId);
    if (!queue || queue.songs.length <= 1) {
      return interaction.reply({
        embeds: [createErrorEmbed('Insufficient Songs', 'There must be at least 2 songs in the queue to shuffle.')],
        ephemeral: true
      });
    }

    await queue.shuffle();
    return interaction.reply({
      embeds: [
        createSuccessEmbed(
          'Queue Shuffled',
          `🔀 Successfully shuffled **${queue.songs.length - 1}** upcoming tracks in the queue!`
        )
      ]
    });
  }
};
