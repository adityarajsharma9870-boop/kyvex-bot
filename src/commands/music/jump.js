const { SlashCommandBuilder } = require('discord.js');
const { createErrorEmbed, createSuccessEmbed } = require('../../utils/embedBuilder');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('jump')
    .setDescription('Jump directly to a specific track number in the queue')
    .addIntegerOption((option) =>
      option
        .setName('position')
        .setDescription('Track number in the queue')
        .setRequired(true)
        .setMinValue(1)
    ),

  category: 'music',

  async execute(interaction, client) {
    const queue = client.distube.getQueue(interaction.guildId);
    if (!queue || !queue.songs || queue.songs.length <= 1) {
      return interaction.reply({
        embeds: [createErrorEmbed('No Upcoming Tracks', 'There are no upcoming tracks in the queue to jump to.')],
        ephemeral: true
      });
    }

    const position = interaction.options.getInteger('position');
    if (position >= queue.songs.length) {
      return interaction.reply({
        embeds: [createErrorEmbed('Invalid Position', `Position exceeds queue length (${queue.songs.length - 1} upcoming tracks).`)],
        ephemeral: true
      });
    }

    try {
      const targetSong = queue.songs[position];
      await queue.jump(position);
      return interaction.reply({
        embeds: [createSuccessEmbed('Jumped to Track', `⏭️ Jumped to track #${position}: **${targetSong.name}**!`)]
      });
    } catch (error) {
      return interaction.reply({
        embeds: [createErrorEmbed('Jump Error', error.message || 'Could not jump to that track.')],
        ephemeral: true
      });
    }
  }
};
