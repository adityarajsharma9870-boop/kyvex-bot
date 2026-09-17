const { SlashCommandBuilder } = require('discord.js');
const { createErrorEmbed, createSuccessEmbed } = require('../../utils/embedBuilder');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('filter')
    .setDescription('Apply or clear audio sound filters')
    .addStringOption((option) =>
      option
        .setName('effect')
        .setDescription('Audio filter to apply')
        .setRequired(true)
        .addChoices(
          { name: 'Clear / Off - Remove all filters', value: 'clear' },
          { name: 'Bassboost - Low punchy bass', value: 'bassboost' },
          { name: '3D / 8D Surround Audio', value: '3d' },
          { name: 'Nightcore - High pitch & speed', value: 'nightcore' },
          { name: 'Vaporwave - Slow retro aesthetic', value: 'vaporwave' },
          { name: 'Karaoke - Vocal attenuation', value: 'karaoke' },
          { name: 'Echo - Reverb & echo', value: 'echo' },
          { name: 'Surround Sound', value: 'surround' },
          { name: 'Reverse - Backward audio', value: 'reverse' }
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

    const effect = interaction.options.getString('effect');

    if (effect === 'clear') {
      queue.filters.clear();
      return interaction.reply({
        embeds: [createSuccessEmbed('Filters Cleared', '🎛️ Cleared all audio filters. Audio is now normal.')]
      });
    }

    if (queue.filters.has(effect)) {
      queue.filters.remove(effect);
      return interaction.reply({
        embeds: [createSuccessEmbed('Filter Removed', `🎛️ Removed filter: **${effect}**`)]
      });
    } else {
      queue.filters.add(effect);
      return interaction.reply({
        embeds: [
          createSuccessEmbed(
            'Filter Applied',
            `🎛️ Applied filter: **${effect}**\n*(Note: It may take 1-2 seconds for the audio stream buffer to apply the effect)*`
          )
        ]
      });
    }
  }
};
