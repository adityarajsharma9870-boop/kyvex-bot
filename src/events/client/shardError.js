const logger = require('../../utils/logger');

module.exports = {
  name: 'shardError',
  execute(error, shardId) {
    logger.error(`Discord Gateway Shard ${shardId} Error:`, error);
  }
};
