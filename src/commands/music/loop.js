const { SlashCommandBuilder } = require('discord.js');
const { createErrorEmbed, createSuccessEmbed } = require('../../utils/embedBuilder');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('loop')
    .setDescription('Set repeat mode for song or queue')
    .addStringOption((option) =>
      option
        .setName('mode')
        .setDescription('Loop mode')
        .setRequired(true)
        .addChoices(
          { name: 'Off - Disable Repeat', value: '0' },
          { name: 'Song - Repeat Current Track', value: '1' },
          { name: 'Queue - Repeat Entire Queue', value: '2' }
        )
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

    const mode = parseInt(interaction.options.getString('mode'), 10);
    queue.setRepeatMode(mode);

    const modeNames = ['Disabled', 'Repeat Track (Song)', 'Repeat Queue (All)'];
    return interaction.reply({
      embeds: [
        createSuccessEmbed(
          'Loop Mode Updated',
          `🔁 Repeat mode has been set to: **${modeNames[mode]}**`
        )
      ]
    });
  }
};
