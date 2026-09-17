const { createNowPlayingEmbed } = require('../../utils/embedBuilder');
const { createControllerComponents } = require('../../utils/controller');
const logger = require('../../utils/logger');

module.exports = {
  name: 'playSong',
  async execute(queue, song) {
    logger.music(`Started playing: "${song.name}" in [${queue.voiceChannel.name}]`);

    const embed = createNowPlayingEmbed(song, queue);
    const components = createControllerComponents(queue);

    if (queue.textChannel) {
      try {
        const msg = await queue.textChannel.send({
          embeds: [embed],
          components: components
        });
        queue.lastControllerMessage = msg;
      } catch (err) {
        logger.error('Failed to send Now Playing message:', err);
      }
    }
  }
};
