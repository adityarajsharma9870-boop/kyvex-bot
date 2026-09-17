const logger = require('../../utils/logger');
const { createAstrialEmbed } = require('../../utils/embedBuilder');

module.exports = {
  name: 'empty',
  async execute(queue) {
    const guildId = queue.voiceChannel?.guild?.id;
    const client = queue.distube.client;

    // Check if 24/7 is enabled for this guild
    if (client.stayInVoice?.[guildId]) {
      logger.info(`Voice channel empty in [${queue.voiceChannel.name}], but 24/7 mode is ACTIVE. Staying connected.`);
      return;
    }

    logger.info(`Voice channel empty in [${queue.voiceChannel.name}]. Disconnecting.`);
    if (queue.textChannel) {
      try {
        const embed = createAstrialEmbed()
          .setTitle('👋 Voice Channel Left')
          .setDescription('The voice channel was empty, so I disconnected to save resources.\n*(Use `/247` if you want me to stay connected permanently!)*');
        await queue.textChannel.send({ embeds: [embed] });
      } catch (err) {}
    }
  }
};
