const logger = require('../../utils/logger');
const { createAstrialEmbed } = require('../../utils/embedBuilder');

module.exports = {
  name: 'finish',
  async execute(queue) {
    logger.music(`Queue finished in [${queue.voiceChannel.name}]`);

    if (queue.textChannel) {
      try {
        const embed = createAstrialEmbed()
          .setTitle('🎶 Queue Finished')
          .setDescription('All queued songs have finished playing! Add more tracks with `/play <query>`.\n*(Autoplay or 24/7 can be toggled using `/autoplay` or `/247`)*');
        await queue.textChannel.send({ embeds: [embed] });
      } catch (err) {}
    }
  }
};
