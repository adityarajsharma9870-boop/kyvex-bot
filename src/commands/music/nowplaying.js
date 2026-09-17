const { SlashCommandBuilder } = require('discord.js');
const { createNowPlayingEmbed, createErrorEmbed } = require('../../utils/embedBuilder');
const { createControllerComponents } = require('../../utils/controller');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('nowplaying')
    .setDescription('Show details of the currently playing track with interactive controls'),

  category: 'music',

  async execute(interaction, client) {
    const queue = client.distube.getQueue(interaction.guildId);
    if (!queue || !queue.songs || queue.songs.length === 0) {
      return interaction.reply({
        embeds: [createErrorEmbed('No Music Playing', 'There is currently no music playing in this server.')],
        ephemeral: true
      });
    }

    const currentSong = queue.songs[0];
    const embed = createNowPlayingEmbed(currentSong, queue);
    const components = createControllerComponents(queue);

    return interaction.reply({
      embeds: [embed],
      components: components
    });
  }
};
