const fs = require('fs');
const path = require('path');
const logger = require('./logger');

const dataDir = path.join(__dirname, '..', '..', 'data');
const warningsFilePath = path.join(dataDir, 'warnings.json');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

if (!fs.existsSync(warningsFilePath)) {
  fs.writeFileSync(warningsFilePath, JSON.stringify({}, null, 2));
}

function loadWarnings() {
  try {
    const raw = fs.readFileSync(warningsFilePath, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    logger.error('Failed to load warnings.json:', e);
    return {};
  }
}

function saveWarnings(data) {
  try {
    fs.writeFileSync(warningsFilePath, JSON.stringify(data, null, 2));
  } catch (e) {
    logger.error('Failed to save warnings.json:', e);
  }
}

const warningManager = {
  getWarnings(guildId, userId) {
    const data = loadWarnings();
    if (!data[guildId] || !data[guildId][userId]) return [];
    return data[guildId][userId];
  },

  addWarning(guildId, userId, moderatorId, reason, actionTaken = 'warn') {
    const data = loadWarnings();
    if (!data[guildId]) data[guildId] = {};
    if (!data[guildId][userId]) data[guildId][userId] = [];

    const newWarning = {
      id: Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
      timestamp: Date.now(),
      moderatorId: moderatorId || 'System Auto-Mod',
      reason: reason || 'Violation of server rules',
      actionTaken
    };

    data[guildId][userId].push(newWarning);
    saveWarnings(data);
    return {
      warning: newWarning,
      totalWarnings: data[guildId][userId].length
    };
  },

  clearWarnings(guildId, userId) {
    const data = loadWarnings();
    if (data[guildId] && data[guildId][userId]) {
      const removedCount = data[guildId][userId].length;
      delete data[guildId][userId];
      saveWarnings(data);
      return removedCount;
    }
    return 0;
  },

  deleteWarning(guildId, userId, warningId) {
    const data = loadWarnings();
    if (!data[guildId] || !data[guildId][userId]) return false;

    const initialLen = data[guildId][userId].length;
    data[guildId][userId] = data[guildId][userId].filter((w) => w.id !== warningId);
    if (data[guildId][userId].length !== initialLen) {
      saveWarnings(data);
      return true;
    }
    return false;
  },

  /**
   * Resolves progressive punishment based on current strike count
   * Strike 1: Warning
   * Strike 2: 5m Timeout
   * Strike 3: 1h Timeout
   * Strike 4: Kick
   * Strike 5+: Ban
   */
  resolveProgressivePunishment(strikeCount) {
    if (strikeCount <= 1) return { type: 'warn', label: 'Formal Warning', durationMs: 0 };
    if (strikeCount === 2) return { type: 'timeout', label: '5-Minute Timeout', durationMs: 5 * 60 * 1000 };
    if (strikeCount === 3) return { type: 'timeout', label: '1-Hour Timeout', durationMs: 60 * 60 * 1000 };
    if (strikeCount === 4) return { type: 'kick', label: 'Server Kick', durationMs: 0 };
    return { type: 'ban', label: 'Permanent Server Ban', durationMs: 0 };
  }
};

module.exports = warningManager;
