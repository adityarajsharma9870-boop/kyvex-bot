const logger = require('../../utils/logger');
const { createErrorEmbed } = require('../../utils/embedBuilder');

module.exports = {
  name: 'error',
  async execute(error, queue) {
    logger.error('DisTube Audio Engine Error:', error);

    if (queue && queue.textChannel) {
      try {
        let cleanMsg = error?.message || 'Unknown error occurred while processing track.';
        if (cleanMsg.includes('Sign in to confirm you') || cleanMsg.includes('bot')) {
          cleanMsg = 'This YouTube track is age-restricted or requires bot-verification. Please try another song or use a SoundCloud / Spotify link!';
        } else if (cleanMsg.includes('Deprecated Feature')) {
          cleanMsg = 'Audio stream decoder refreshed. Please try your request again!';
        }

        const errorEmbed = createErrorEmbed(
          'Playback Error Occurred',
          `An issue occurred while streaming: \`${cleanMsg}\``
        );
        await queue.textChannel.send({ embeds: [errorEmbed] });
      } catch (err) {}
    }
  }
};
