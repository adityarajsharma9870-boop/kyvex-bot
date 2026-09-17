const { SlashCommandBuilder } = require('discord.js');
const { createErrorEmbed, createSuccessEmbed } = require('../../utils/embedBuilder');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clearqueue')
    .setDescription('Clear all upcoming tracks from the queue without stopping the current song'),

  category: 'music',

  async execute(interaction, client) {
    const queue = client.distube.getQueue(interaction.guildId);
    if (!queue || !queue.songs || queue.songs.length <= 1) {
      return interaction.reply({
        embeds: [createErrorEmbed('Queue Empty', 'There are no upcoming songs to clear.')],
        ephemeral: true
      });
    }

    const removedCount = queue.songs.length - 1;
    queue.songs.splice(1);

    return interaction.reply({
      embeds: [
        createSuccessEmbed(
          'Queue Cleared',
          `🧹 Removed **${removedCount}** upcoming songs from the queue. Current track will continue playing!`
        )
      ]
    });
  }
};
