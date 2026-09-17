const welcomeManager = require('../../utils/welcomeManager');
const logger = require('../../utils/logger');

module.exports = {
  name: 'guildMemberAdd',
  once: false,
  async execute(member) {
    try {
      await welcomeManager.sendWelcome(member);
    } catch (err) {
      logger.error(`[guildMemberAdd] Error sending welcome message:`, err);
    }
  }
};
