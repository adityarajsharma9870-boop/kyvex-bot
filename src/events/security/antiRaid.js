const { EmbedBuilder } = require('discord.js');
const securityManager = require('../../utils/securityManager');
const logManager = require('../../utils/logManager');
const logger = require('../../utils/logger');

// Sliding window join tracking: guildId => [ { memberId, tag, timestamp, accountAgeDays } ]
const joinHistory = new Map();

module.exports = {
  name: 'guildMemberAdd',
  async execute(member) {
    if (!member || !member.guild) return;
    const guild = member.guild;

    const config = securityManager.getConfig(guild.id);
    const antiRaid = config.antiRaid || { enabled: true, joinThreshold: 5, joinWindowSec: 10, action: 'lockdown' };
    if (!antiRaid.enabled) return;

    const now = Date.now();
    const windowMs = (antiRaid.joinWindowSec || 10) * 1000;
    const threshold = antiRaid.joinThreshold || 5;

    let joins = joinHistory.get(guild.id) || [];
    joins = joins.filter((j) => now - j.timestamp <= windowMs);

    const user = member.user;
    const accountAgeDays = Math.floor((now - user.createdTimestamp) / (1000 * 60 * 60 * 24));

    joins.push({
      memberId: member.id,
      tag: user.tag || user.username,
      timestamp: now,
      accountAgeDays
    });
    joinHistory.set(guild.id, joins);

    // If an active raid was already engaged recently:
    if (securityManager.isRaidActive(guild.id)) {
      // Restrict this newly joined member
      try {
        if (member.manageable) {
          const timeoutMs = (antiRaid.quarantineDurationMin || 15) * 60 * 1000;
          await member.timeout(timeoutMs, '[Kyvex ANTI-RAID] Auto-restricted during active server raid');
          logger.warn(`[ANTI-RAID] Auto-timed out new joiner ${user.tag} during active raid in ${guild.name}`);
        }
      } catch (e) {}
      return;
    }

    // Check if threshold is breached (Trigger New Raid Alert)
    if (joins.length >= threshold) {
      logger.warn(`🚨 [ANTI-RAID TRIGGERED] ${joins.length} joins detected in ${antiRaid.joinWindowSec}s in [${guild.name}]! Engaging lockdown.`);

      // 1. Mark Raid Active
      securityManager.setRaidState(guild.id, true, {
        joinCount: joins.length,
        accounts: joins.map((j) => j.memberId)
      });

      // 2. Automatically engage emergency lockdown
      let lockdownResult = null;
      if (antiRaid.action === 'lockdown') {
        lockdownResult = await securityManager.toggleEmergencyLockdown(guild, true);
      }

      // 3. Restrict all recently joined members in the raid burst
      let restrictedCount = 0;
      const timeoutMs = (antiRaid.quarantineDurationMin || 15) * 60 * 1000;
      for (const j of joins) {
        try {
          const m = await guild.members.fetch(j.memberId).catch(() => null);
          if (m && m.manageable) {
            await m.timeout(timeoutMs, '[Kyvex ANTI-RAID] Restricted member during detected mass join raid');
            restrictedCount++;
          }
        } catch (e) {}
      }

      // 4. Incident Alert Embed
      const embed = new EmbedBuilder()
        .setColor('#FF0033')
        .setTitle('🚨 MASS JOIN RAID DETECTED • AUTOMATIC LOCKDOWN ENGAGED')
        .setDescription(
          `**Kyvex Anti-Raid Sentinel** has detected an abnormal mass member join surge in the server!\n\n` +
          `• **Join Surge Rate:** \`${joins.length} members\` within \`${antiRaid.joinWindowSec} seconds\`\n` +
          `• **Configured Threshold:** \`${threshold} joins\` / \`${antiRaid.joinWindowSec}s\`\n` +
          `• **Lockdown Status:** 🔒 **All Public Text Channels Locked** (${lockdownResult?.affectedChannels || 'Multiple'} channels)\n` +
          `• **Raider Mitigation:** 🛑 **${restrictedCount} accounts** placed on timeout (${antiRaid.quarantineDurationMin || 15}m)\n` +
          `• **How to Lift:** Run \`/security unlock\` when the raid has ceased.`
        )
        .addFields([
          {
            name: '👥 Detected Joining Accounts',
            value: joins.slice(0, 10).map((j) => `• <@${j.memberId}> (\`${j.tag}\` - ${j.accountAgeDays}d old)`).join('\n') +
              (joins.length > 10 ? `\n*...and ${joins.length - 10} more*` : '')
          }
        ])
        .setFooter({ text: 'Kyvex Autonomous Anti-Raid Matrix • Active Shield' })
        .setTimestamp();

      // Dispatch to security log channel & mod logs
      await securityManager.logSecurityAlert(guild, {
        action: 'Mass Join Raid Detected',
        executor: { tag: 'Multiple External Accounts', id: 'Raid Cluster' },
        target: `${joins.length} Joining Members`,
        reason: `Exceeded threshold of ${threshold} joins in ${antiRaid.joinWindowSec}s`,
        details: `Emergency Lockdown Enabled & ${restrictedCount} Members Restrained`
      });

      await logManager.send(guild, 'mod', embed);
    }
  }
};
