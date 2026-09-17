const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const securityManager = require('../../utils/securityManager');
const warningManager = require('../../utils/warningManager');
const logManager = require('../../utils/logManager');
const logger = require('../../utils/logger');

// Sliding window message flood tracker: `${guildId}:${userId}` => [ timestamps ]
const messageTimestamps = new Map();
// Sliding window message history tracker: `${guildId}:${userId}` => [ { content, timestamp } ]
const messageHistory = new Map();

// Helper to extract domain from URL
function extractDomain(urlStr) {
  try {
    const parsed = new URL(urlStr.startsWith('http') ? urlStr : `https://${urlStr}`);
    return parsed.hostname.toLowerCase().replace(/^www\./, '');
  } catch (e) {
    return urlStr.toLowerCase();
  }
}

module.exports = {
  name: 'messageCreate',
  async execute(message) {
    if (!message.guild || message.author.bot || message.webhookId) return;

    const guild = message.guild;
    const member = message.member || await guild.members.fetch(message.author.id).catch(() => null);
    if (!member) return;

    const config = securityManager.getConfig(guild.id);
    const autoMod = config.autoMod || { enabled: true };

    // Bypass check: Administrator, Owner, ExtraOwner, Whitelist, or AutoMod Whitelist
    const isBypassed = securityManager.isWhitelisted(guild, member.id) ||
      (Array.isArray(autoMod.whitelist) && autoMod.whitelist.includes(member.id)) ||
      (Array.isArray(autoMod.whitelist) && member.roles.cache.some((r) => autoMod.whitelist.includes(r.id))) ||
      (Array.isArray(autoMod.whitelist) && autoMod.whitelist.includes(message.channel.id));

    if (isBypassed) return;

    const content = message.content || '';
    let violation = null;

    const modEnabled = (key) => {
      if (autoMod.enabled === false) return false;
      if (autoMod.modules && autoMod.modules[key] === false) return false;
      return true;
    };

    // ==========================================
    // 1. ANTI-INVITE FILTER (discord.gg)
    // ==========================================
    if (!violation && modEnabled('antiInvite')) {
      const inviteRegex = /(discord(?:app)?\.(?:com\/invite|gg)\/[a-zA-Z0-9_-]+)/i;
      if (inviteRegex.test(content)) {
        violation = {
          type: 'ANTI_INVITE',
          moduleKey: 'antiInvite',
          reason: 'Posted Unauthorized Discord Server Invite Link',
          detail: content.match(inviteRegex)[0]
        };
      }
    }

    // ==========================================
    // 2. ANTI-EXTERNAL / PHISHING LINKS
    // ==========================================
    if (!violation && modEnabled('antiLink')) {
      const urlRegex = /(https?:\/\/[^\s]+)/gi;
      const foundUrls = content.match(urlRegex);
      if (foundUrls && foundUrls.length > 0) {
        const allowedDomains = (config.antiLink?.whitelistDomains || [
          'youtube.com', 'youtu.be', 'spotify.com', 'tenor.com', 'giphy.com', 'discord.com', 'google.com'
        ]).map((d) => d.toLowerCase());

        for (const u of foundUrls) {
          const dom = extractDomain(u);
          const isAllowed = allowedDomains.some((ad) => dom === ad || dom.endsWith(`.${ad}`));
          if (!isAllowed) {
            violation = {
              type: 'UNAUTHORIZED_LINK',
              moduleKey: 'antiLink',
              reason: 'Posted Unapproved External / Suspicious Link',
              detail: dom
            };
            break;
          }
        }
      }
    }

    // ==========================================
    // 3. ANTI-BAD WORDS / PROFANITY
    // ==========================================
    if (!violation && modEnabled('antiBadWords')) {
      const badWordsList = autoMod.badWords || [];
      if (badWordsList.length > 0) {
        const lowerContent = content.toLowerCase();
        const matchedWord = badWordsList.find((w) => w && lowerContent.includes(w.toLowerCase()));
        if (matchedWord) {
          violation = {
            type: 'BAD_WORDS',
            moduleKey: 'antiBadWords',
            reason: `Message contained blacklisted bad word: "${matchedWord}"`,
            detail: matchedWord
          };
        }
      }
    }

    // ==========================================
    // 4. ANTI-MENTION & ANTI-EVERYONE FILTER
    // ==========================================
    const isEveryonePing = Boolean(message.mentions.everyone || content.includes('@everyone') || content.includes('@here'));
    if (!violation && isEveryonePing && config.antiEveryone !== false && config.antiEveryonePing !== false) {
      violation = {
        type: 'EVERYONE_MENTION',
        moduleKey: 'antiEveryonePing',
        reason: 'Unauthorized @everyone / @here Mention',
        detail: '@everyone / @here ping'
      };
    }

    if (!violation && modEnabled('antiMention')) {
      const maxUsers = autoMod.maxUserMentions || 4;
      const maxRoles = autoMod.maxRoleMentions || 3;

      if (message.mentions.users.size > maxUsers) {
        violation = {
          type: 'MASS_MENTIONS',
          moduleKey: 'antiMention',
          reason: `Mass user mentions limit exceeded (${message.mentions.users.size} users)`,
          detail: `${message.mentions.users.size} users mentioned`
        };
      } else if (message.mentions.roles.size > maxRoles) {
        violation = {
          type: 'ROLE_MENTIONS',
          moduleKey: 'antiMention',
          reason: `Role mentions limit exceeded (${message.mentions.roles.size} roles)`,
          detail: `${message.mentions.roles.size} roles mentioned`
        };
      }
    }

    // ==========================================
    // 5. ANTI-SPAM & FLOOD FILTER
    // ==========================================
    const userKey = `${guild.id}:${member.id}`;
    const now = Date.now();

    if (!violation && modEnabled('antiSpam')) {
      const maxMsgs = autoMod.maxMessagesPer3Sec || 5;
      const windowSec = autoMod.windowSec || 4;
      let timestamps = messageTimestamps.get(userKey) || [];
      timestamps = timestamps.filter((t) => now - t <= windowSec * 1000);
      timestamps.push(now);
      messageTimestamps.set(userKey, timestamps);

      if (timestamps.length > maxMsgs) {
        violation = {
          type: 'MESSAGE_FLOOD',
          moduleKey: 'antiSpam',
          reason: `Fast message flooding (${timestamps.length} msgs in ${windowSec}s)`,
          detail: `${timestamps.length} msgs / ${windowSec}s`
        };
      }
    }

    // ==========================================
    // 6. ANTI-DUPLICATE SPAM
    // ==========================================
    if (!violation && modEnabled('antiDuplicate') && content.length >= 3) {
      const maxDupes = autoMod.maxDuplicates || 3;
      let history = messageHistory.get(userKey) || [];
      history = history.filter((h) => now - h.timestamp <= 30000);
      history.push({ content: content.trim().toLowerCase(), timestamp: now });
      messageHistory.set(userKey, history);

      const currentMsg = content.trim().toLowerCase();
      const duplicates = history.filter((h) => h.content === currentMsg);
      if (duplicates.length >= maxDupes) {
        violation = {
          type: 'DUPLICATE_SPAM',
          moduleKey: 'antiDuplicate',
          reason: `Repeated identical message ${duplicates.length} times`,
          detail: currentMsg.substring(0, 50)
        };
      }
    }

    // ==========================================
    // 7. ANTI-CAPS LOCK FLOOD
    // ==========================================
    if (!violation && modEnabled('antiCaps') && content.length >= 8) {
      const upperCount = (content.match(/[A-Z]/g) || []).length;
      const alphaCount = (content.match(/[a-zA-Z]/g) || []).length;
      const maxCapsPercent = autoMod.maxCapsPercent || 70;
      if (alphaCount >= 8 && (upperCount / alphaCount) * 100 >= maxCapsPercent) {
        violation = {
          type: 'CAPS_FLOOD',
          moduleKey: 'antiCaps',
          reason: `Excessive uppercase / caps lock shouting (${Math.round((upperCount / alphaCount) * 100)}%)`,
          detail: `${Math.round((upperCount / alphaCount) * 100)}% CAPS`
        };
      }
    }

    // ==========================================
    // 8. ANTI-EMOJI & STICKER SPAM
    // ==========================================
    if (!violation && modEnabled('antiEmoji')) {
      const customEmojiMatches = content.match(/<a?:[a-zA-Z0-9_]+:\d+>/g) || [];
      const unicodeEmojiMatches = content.match(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu) || [];
      const totalEmojis = customEmojiMatches.length + unicodeEmojiMatches.length;
      const maxEmojis = autoMod.maxEmojis || 7;

      if (totalEmojis > maxEmojis) {
        violation = {
          type: 'EMOJI_SPAM',
          moduleKey: 'antiEmoji',
          reason: `Excessive emoji spam (${totalEmojis} emojis in message)`,
          detail: `${totalEmojis} emojis`
        };
      } else if (message.stickers && message.stickers.size > 2) {
        violation = {
          type: 'STICKER_SPAM',
          moduleKey: 'antiEmoji',
          reason: `Sticker spam (${message.stickers.size} stickers)`,
          detail: `${message.stickers.size} stickers`
        };
      }
    }

    // ==========================================
    // 9. MITIGATION & ACTION EXECUTION
    // ==========================================
    if (violation) {
      // 1. Delete offending message immediately
      await message.delete().catch(() => {});

      const modKey = violation.moduleKey || 'antiSpam';
      const isPing = modKey === 'antiEveryone' || modKey === 'antiEveryonePing';
      
      // Determine action threshold ("kitna kitna bar kare tab")
      let limit = 1;
      if (isPing) {
        limit = config.moduleLimits?.antiEveryonePing ?? config.moduleLimits?.antiEveryone ?? 1;
      } else {
        limit = autoMod.moduleLimits?.[modKey] ?? autoMod.moduleLimits?.antiSpam ?? 2;
      }

      // Determine punishment ("kick, ban, timeout, quarantine, delete")
      let punishmentAction = 'timeout';
      if (isPing) {
        punishmentAction = config.modulePunishments?.antiEveryonePing || config.modulePunishments?.antiEveryone || 'ban';
      } else {
        punishmentAction = autoMod.modulePunishments?.[modKey] || autoMod.punishment || 'timeout';
      }

      const burstKey = isPing ? 'antiEveryonePing' : `automod_${modKey}`;
      const burst = securityManager.recordAndCheckBurst(guild, member.id, burstKey, limit, isPing ? 15 : 60);

      // Add strike to persistent warning history
      const { totalWarnings } = warningManager.addWarning(
        guild.id,
        member.id,
        'Kyvex Auto-Mod',
        violation.reason,
        violation.type
      );

      let punishmentApplied = '';

      if (burst.exceeded) {
        // Punish member when limit reached
        if (punishmentAction === 'delete') {
          punishmentApplied = 'Message Deleted (Threshold reached)';
        } else {
          const timeoutMs = (config.timeoutDurationMinutes ? config.timeoutDurationMinutes * 60000 : null) || config.timeoutDurationMs || autoMod.timeoutDurationMs || 600000;
          let res = false;
          if (punishmentAction === 'timeout' && member.manageable) {
            await member.timeout(timeoutMs, `[KYVEX ANTI-NUKE] ${violation.reason} (Exceeded limit: ${burst.limit}x)`).catch(() => {});
            res = 'timed_out';
          } else {
            res = await securityManager.punish(guild, member.id, `${violation.reason} (Exceeded limit: ${burst.limit}x)`, punishmentAction);
          }
          punishmentApplied = res === 'banned' ? 'Permanent Ban' : (res === 'kicked' ? 'Kicked from Server' : (res === 'timed_out' ? 'Timeout Applied' : (res === 'quarantined' ? 'Quarantined' : `${punishmentAction.toUpperCase()} Applied`)));
        }

        const breachMsg = await message.channel.send({
          content: `🚨 ${member} **has received action: ${punishmentApplied.toUpperCase()}!** Reason: Reached ${violation.type} limit (${burst.limit}x threshold).`
        }).catch(() => null);
        if (breachMsg) setTimeout(() => breachMsg.delete().catch(() => {}), 9000);

        if (isPing) {
          await securityManager.logSecurityAlert(guild, {
            action: 'Everyone/Here Ping (Limit Exceeded)',
            executor: member.user,
            target: message.channel.name,
            reason: `Mentioned @everyone / @here without Whitelist (Reached ${burst.limit}x Limit)`,
            details: `Offender Punished (${punishmentAction.toUpperCase()}) & Message Deleted`
          });
        } else {
          // Send alert to AutoMod log channel or security log
          const logChannelId = autoMod.logChannelId || config.logChannel;
          const logChannel = logChannelId ? guild.channels.cache.get(logChannelId) : null;
          if (logChannel) {
            const alertEmbed = new EmbedBuilder()
              .setColor('#FF2449')
              .setTitle('🚨 AutoMod Action Executed')
              .setDescription(`**Offender:** ${member} (${member.user.tag} - \`${member.id}\`)\n**Channel:** ${message.channel}\n**Violation:** ${violation.reason}\n**Action Taken:** **${punishmentApplied}** (Exceeded ${burst.limit}x limit)\n**Total Warning Strikes:** ${totalWarnings}`)
              .setTimestamp();
            await logChannel.send({ embeds: [alertEmbed] }).catch(() => {});
          }
        }
      } else {
        punishmentApplied = `Strike Warning (${burst.count}/${burst.limit})`;

        const warnMsg = await message.channel.send({
          content: `⚠️ ${member}, **${violation.reason}! [Strike ${burst.count}/${burst.limit}]**\n*You have ${burst.limit - burst.count} strike(s) left before punishment (${punishmentAction.toUpperCase()}) is applied!*`
        }).catch(() => null);
        if (warnMsg) setTimeout(() => warnMsg.delete().catch(() => {}), 6500);

        if (isPing) {
          await securityManager.logSecurityAlert(guild, {
            action: `Everyone/Here Ping Strike (${burst.count}/${burst.limit})`,
            executor: member.user,
            target: message.channel.name,
            reason: `Mentioned @everyone / @here without Whitelist [Strike ${burst.count}/${burst.limit}]`,
            details: `Message Deleted • Offender has ${burst.limit - burst.count} strike(s) remaining`
          });
        } else {
          const logChannelId = autoMod.logChannelId || config.logChannel;
          const logChannel = logChannelId ? guild.channels.cache.get(logChannelId) : null;
          if (logChannel) {
            const alertEmbed = new EmbedBuilder()
              .setColor('#F1C40F')
              .setTitle('⚠️ AutoMod Strike Issued')
              .setDescription(`**Member:** ${member} (${member.user.tag})\n**Channel:** ${message.channel}\n**Violation:** ${violation.reason}\n**Strike:** [${burst.count}/${burst.limit}] (Next action: ${punishmentAction.toUpperCase()})`)
              .setTimestamp();
            await logChannel.send({ embeds: [alertEmbed] }).catch(() => {});
          }
        }
      }

      // 4. DM Warning to user
      try {
        await member.send({
          embeds: [
            new EmbedBuilder()
              .setColor('#FF3366')
              .setTitle(`🛡️ Security Warning • [${guild.name}]`)
              .setDescription(
                `Your message in **#${message.channel.name}** was automatically blocked by **Kyvex Auto-Mod**.\n\n` +
                `• **Violation:** \`${violation.reason}\`\n` +
                `• **Total Strikes:** \`${totalWarnings}\`\n` +
                `• **Action Taken:** **${punishmentApplied}**\n\n` +
                `*Please respect the server guidelines to avoid progressive timeouts or permanent removal.*`
              )
              .setTimestamp()
          ]
        }).catch(() => {});
      } catch (e) {}

      // 6. Log incident to Moderation Logs and Security Channel
      const embed = new EmbedBuilder()
        .setColor('#FF2449')
        .setTitle(`🛡️ AUTO-MOD ENFORCEMENT • ${violation.type}`)
        .setDescription(
          `**User:** ${member} (\`${member.user.tag}\` | \`${member.id}\`)\n` +
          `**Channel:** ${message.channel} (\`#${message.channel.name}\`)\n` +
          `**Violation:** \`${violation.reason}\`\n` +
          `**Progressive Action:** **${punishmentApplied}** (Strike #${totalWarnings})\n` +
          `**Filtered Content Snippet:** \`${content.substring(0, 200) || violation.detail}\``
        )
        .setFooter({ text: 'Kyvex Auto-Mod Matrix' })
        .setTimestamp();

      await logManager.send(guild, 'mod', embed);
      await logManager.send(guild, 'message', embed);
    }
  }
};
