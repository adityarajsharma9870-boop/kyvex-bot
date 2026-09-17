const { SlashCommandBuilder } = require('discord.js');
const { createErrorEmbed, createSuccessEmbed } = require('../../utils/embedBuilder');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('skip')
    .setDescription('Skip to the next song in the queue'),

  category: 'music',

  async execute(interaction, client) {
    const queue = client.distube.getQueue(interaction.guildId);
    if (!queue) {
      return interaction.reply({
        embeds: [createErrorEmbed('No Music Playing', 'There is currently no music playing to skip.')],
        ephemeral: true
      });
    }

    try {
      const currentSong = queue.songs[0];
      if (queue.songs.length <= 1 && !queue.autoplay) {
        await queue.stop();
        return interaction.reply({
          embeds: [createSuccessEmbed('Skipped & Queue Finished', `Skipped **${currentSong.name}**. No more tracks in queue!`)]
        });
      }

      await queue.skip();
      return interaction.reply({
        embeds: [createSuccessEmbed('Track Skipped', `⏭️ Skipped **${currentSong.name}**!`)]
      });
    } catch (error) {
      return interaction.reply({
        embeds: [createErrorEmbed('Skip Error', error.message || 'Could not skip the song.')],
        ephemeral: true
      });
    }
  }
};
