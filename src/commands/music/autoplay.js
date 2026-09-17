const { SlashCommandBuilder } = require('discord.js');
const { createErrorEmbed, createSuccessEmbed } = require('../../utils/embedBuilder');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('autoplay')
    .setDescription('Toggle smart music autoplay when the queue ends'),

  category: 'music',

  async execute(interaction, client) {
    const queue = client.distube.getQueue(interaction.guildId);
    if (!queue) {
      return interaction.reply({
        embeds: [createErrorEmbed('No Music Playing', 'There is currently no music playing in this server.')],
        ephemeral: true
      });
    }

    const autoplay = queue.toggleAutoplay();
    return interaction.reply({
      embeds: [
        createSuccessEmbed(
          'Autoplay Toggled',
          `📻 Smart Autoplay is now: **${autoplay ? 'Enabled' : 'Disabled'}**!\n` +
          `${autoplay ? 'Related songs will be automatically added when the queue finishes.' : 'The bot will stop when the queue finishes.'}`
        )
      ]
    });
  }
};
