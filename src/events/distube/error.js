const logger = require('../../utils/logger');
const { createErrorEmbed } = require('../../utils/embedBuilder');

module.exports = {
  name: 'error',
  async execute(error, queue) {
    logger.error('DisTube Audio Engine Error:', error);

    if (queue && queue.textChannel) {
      try {
        const errorEmbed = createErrorEmbed(
          'Playback Error Occurred',
          `An error occurred while streaming audio: \`${error.message || 'Unknown error'}\``
        );
        await queue.textChannel.send({ embeds: [errorEmbed] });
      } catch (err) {}
    }
  }
};
