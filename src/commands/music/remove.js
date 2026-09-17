const { SlashCommandBuilder } = require('discord.js');
const { createErrorEmbed, createSuccessEmbed } = require('../../utils/embedBuilder');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('remove')
    .setDescription('Remove a specific track from the queue')
    .addIntegerOption((option) =>
      option
        .setName('position')
        .setDescription('Track number to remove from the queue')
        .setRequired(true)
        .setMinValue(1)
    ),

  category: 'music',

  async execute(interaction, client) {
    const queue = client.distube.getQueue(interaction.guildId);
    if (!queue || !queue.songs || queue.songs.length <= 1) {
      return interaction.reply({
        embeds: [createErrorEmbed('Queue Empty', 'There are no upcoming songs in the queue to remove.')],
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

    const [removed] = queue.songs.splice(position, 1);
    return interaction.reply({
      embeds: [
        createSuccessEmbed(
          'Track Removed',
          `🗑️ Removed **${removed.name}** from position #${position}.`
        )
      ]
    });
  }
};
