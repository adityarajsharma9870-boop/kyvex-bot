const logger = require('../../utils/logger');

module.exports = {
  name: 'error',
  execute(error) {
    logger.error('Discord Gateway Client Error:', error);
  }
};
