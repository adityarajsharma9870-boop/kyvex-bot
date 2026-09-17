const { createAstrialEmbed } = require('../../utils/embedBuilder');
const logger = require('../../utils/logger');

module.exports = {
  name: 'addSong',
  async execute(queue, song) {
    logger.music(`Added to queue: "${song.name}"`);

    // Only send "Added to queue" message if there is already a song playing
    if (queue.songs.length > 1 && queue.textChannel) {
      const embed = createAstrialEmbed()
        .setAuthor({
          name: 'Track Added to Queue ♪',
          iconURL: song.user?.displayAvatarURL({ dynamic: true }) || undefined
        })
        .setTitle(song.name.length > 55 ? song.name.substring(0, 52) + '...' : song.name)
        .setURL(song.url)
        .setThumbnail(song.thumbnail || null)
        .addFields([
          { name: '⏱️ Duration', value: `\`${song.formattedDuration}\``, inline: true },
          { name: '👤 Requested By', value: song.user ? `${song.user}` : 'Unknown', inline: true },
          { name: '📍 Position in Queue', value: `\`#${queue.songs.length - 1}\``, inline: true }
        ]);

      try {
        await queue.textChannel.send({ embeds: [embed] });
      } catch (err) {
        logger.error('Failed to send addSong embed:', err);
      }
    }
  }
};
