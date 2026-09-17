const { createAstrialEmbed } = require('../../utils/embedBuilder');
const logger = require('../../utils/logger');

module.exports = {
  name: 'addList',
  async execute(queue, playlist) {
    logger.music(`Added playlist: "${playlist.name}" (${playlist.songs.length} tracks)`);

    if (queue.textChannel) {
      const embed = createAstrialEmbed()
        .setAuthor({
          name: 'Playlist Queued ♪',
          iconURL: playlist.user?.displayAvatarURL({ dynamic: true }) || undefined
        })
        .setTitle(playlist.name.length > 55 ? playlist.name.substring(0, 52) + '...' : playlist.name)
        .setURL(playlist.url || 'https://discord.com')
        .setThumbnail(playlist.thumbnail || null)
        .addFields([
          { name: '🎵 Total Tracks', value: `\`${playlist.songs.length} songs\``, inline: true },
          { name: '⏱️ Duration', value: `\`${playlist.formattedDuration}\``, inline: true },
          { name: '👤 Added By', value: playlist.user ? `${playlist.user}` : 'Unknown', inline: true }
        ]);

      try {
        await queue.textChannel.send({ embeds: [embed] });
      } catch (err) {
        logger.error('Failed to send addList embed:', err);
      }
    }
  }
};
