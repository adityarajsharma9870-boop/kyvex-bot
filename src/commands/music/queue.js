const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { createAstrialEmbed, createErrorEmbed } = require('../../utils/embedBuilder');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('queue')
    .setDescription('Display the current music queue and upcoming tracks')
    .addIntegerOption((option) =>
      option.setName('page').setDescription('Page number to view').setMinValue(1)
    ),

  category: 'music',

  async execute(interaction, client) {
    const queue = client.distube.getQueue(interaction.guildId);
    if (!queue || !queue.songs || queue.songs.length === 0) {
      return interaction.reply({
        embeds: [createErrorEmbed('Queue is Empty', 'There are no songs in the queue.')],
        ephemeral: true
      });
    }

    const songs = queue.songs;
    const currentSong = songs[0];
    const upcoming = songs.slice(1);
    const pageSize = 10;
    const totalPages = Math.max(1, Math.ceil(upcoming.length / pageSize));

    let currentPage = (interaction.options.getInteger('page') || 1) - 1;
    if (currentPage >= totalPages) currentPage = totalPages - 1;
    if (currentPage < 0) currentPage = 0;

    const generateQueueEmbed = (page) => {
      const start = page * pageSize;
      const end = start + pageSize;
      const pageTracks = upcoming.slice(start, end);

      const trackList = pageTracks.length > 0
        ? pageTracks
            .map(
              (song, i) =>
                `\`${start + i + 1}.\` [${song.name.length > 45 ? song.name.substring(0, 42) + '...' : song.name}](${song.url}) - \`${song.formattedDuration}\` (Req by: ${song.user})`
            )
            .join('\n')
        : '*No more songs in the queue.*';

      return createAstrialEmbed()
        .setAuthor({
          name: `${interaction.guild.name} • Music Queue`,
          iconURL: interaction.guild.iconURL({ dynamic: true }) || undefined
        })
        .setTitle(`🎶 Currently Playing: ${currentSong.name.substring(0, 50)}`)
        .setURL(currentSong.url)
        .setDescription(
          `**Duration:** \`${queue.formattedCurrentTime} / ${currentSong.formattedDuration}\` | **Requested By:** ${currentSong.user}\n\n` +
          `__**Upcoming Tracks:**__\n${trackList}`
        )
        .addFields([
          { name: '📊 Total Songs', value: `\`${songs.length}\``, inline: true },
          { name: '⏱️ Total Duration', value: `\`${queue.formattedDuration}\``, inline: true },
          { name: '🔁 Loop Mode', value: `\`${['Off', 'Track', 'Queue'][queue.repeatMode] || 'Off'}\``, inline: true }
        ])
        .setFooter({ text: `Page ${page + 1} of ${totalPages} • Astrial Music` });
    };

    if (totalPages <= 1) {
      return interaction.reply({ embeds: [generateQueueEmbed(0)] });
    }

    const getRow = (page) => {
      return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('q_prev')
          .setLabel('◀ Previous')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(page === 0),
        new ButtonBuilder()
          .setCustomId('q_next')
          .setLabel('Next ▶')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(page === totalPages - 1)
      );
    };

    const replyMessage = await interaction.reply({
      embeds: [generateQueueEmbed(currentPage)],
      components: [getRow(currentPage)],
      fetchReply: true
    });

    const collector = replyMessage.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 60000
    });

    collector.on('collect', async (btnInteraction) => {
      if (btnInteraction.user.id !== interaction.user.id) {
        return btnInteraction.reply({
          content: '❌ Only the command author can navigate pages.',
          ephemeral: true
        });
      }

      if (btnInteraction.customId === 'q_prev' && currentPage > 0) {
        currentPage--;
      } else if (btnInteraction.customId === 'q_next' && currentPage < totalPages - 1) {
        currentPage++;
      }

      await btnInteraction.update({
        embeds: [generateQueueEmbed(currentPage)],
        components: [getRow(currentPage)]
      });
    });

    collector.on('end', async () => {
      try {
        await interaction.editReply({
          components: []
        });
      } catch (err) {
        // Message might have been deleted
      }
    });
  }
};
