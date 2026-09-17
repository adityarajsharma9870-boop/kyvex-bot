const { ActivityType } = require('discord.js');
const logger = require('../../utils/logger');
const securityManager = require('../../utils/securityManager');

module.exports = {
  name: 'ready',
  once: true,
  async execute(client) {
    // Dynamically sync username with Discord Developer Portal Application name
    try {
      await client.application?.fetch();
      const appName = client.application?.name;
      if (appName && client.user.username !== appName) {
        await client.user.setUsername(appName);
        logger.info(`Updated bot username to match application name: ${appName}`);
      }
    } catch (e) {
      // Discord allows username changes 2 times per hour; ignore if rate limited
    }

    const currentName = client.user.username || 'Kyvex';

    // Set dynamic bot presence
    client.user.setPresence({
      activities: [
        {
          name: `${currentName} | /help`,
          type: ActivityType.Playing
        }
      ],
      status: 'online'
    });

    logger.ready(client.user.tag);
    logger.info(`Serving ${client.guilds.cache.size} servers and ${client.users.cache.size} cached users.`);

    // Automatically ensure security log channel is ready
    for (const guild of client.guilds.cache.values()) {
      await securityManager.getOrCreateLogChannel(guild).catch((err) => {
        logger.error(`Failed to auto-setup log channel in [${guild.name}]:`, err);
      });
    }
  }
};
