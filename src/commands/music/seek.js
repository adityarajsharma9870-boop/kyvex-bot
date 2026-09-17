const { SlashCommandBuilder } = require('discord.js');
const { createErrorEmbed, createSuccessEmbed } = require('../../utils/embedBuilder');
const { formatSeconds, parseTimeToSeconds } = require('../../utils/timeHelper');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('seek')
    .setDescription('Fast forward or rewind to a specific time or timestamp')
    .addStringOption((option) =>
      option
        .setName('time')
        .setDescription('Timestamp (e.g. 1:30, 02:45) or seconds (e.g. 90)')
        .setRequired(true)
    ),

  category: 'music',

  async execute(interaction, client) {
    const queue = client.distube.getQueue(interaction.guildId);
    if (!queue || !queue.songs || queue.songs.length === 0) {
      return interaction.reply({
        embeds: [createErrorEmbed('No Music Playing', 'There is currently no music playing in this server.')],
        ephemeral: true
      });
    }

    const rawTime = interaction.options.getString('time');
    const seconds = parseTimeToSeconds(rawTime);

    if (seconds === null || isNaN(seconds) || seconds < 0) {
      return interaction.reply({
        embeds: [createErrorEmbed('Invalid Time Format', 'Please specify seconds (e.g. `90`) or a timestamp format (e.g. `1:30`, `02:15`).')],
        ephemeral: true
      });
    }

    const song = queue.songs[0];
    if (seconds >= song.duration) {
      return interaction.reply({
        embeds: [
          createErrorEmbed(
            'Invalid Seek Time',
            `Cannot seek past the end of the song (\`${song.formattedDuration}\`).`
          )
        ],
        ephemeral: true
      });
    }

    queue.seek(seconds);
    return interaction.reply({
      embeds: [
        createSuccessEmbed(
          'Seek Position Updated',
          `⏩ Jumped to timestamp: \`${formatSeconds(seconds)}\` / \`${song.formattedDuration}\``
        )
      ]
    });
  }
};
