const { AuditLogEvent, PermissionFlagsBits } = require('discord.js');
const securityManager = require('../../utils/securityManager');
const logger = require('../../utils/logger');

// Cache to prevent duplicate processing if both stream and fallback fire
const processedAuditEntries = new Set();
function isAlreadyHandled(entryId) {
  if (!entryId) return false;
  if (processedAuditEntries.has(entryId)) return true;
  processedAuditEntries.add(entryId);
  setTimeout(() => processedAuditEntries.delete(entryId), 60000);
  return false;
}

// Helper to retrieve the specific module limit & punishment with fallbacks
function getModuleRule(config, eventKey, legacyKey = null, defaultPunish = 'ban', defaultLimit = 1) {
  const limits = config.moduleLimits || {};
  const punishments = config.modulePunishments || {};

  const limit = limits[eventKey] ?? (legacyKey ? limits[legacyKey] : null) ?? defaultLimit;
  const punishment = punishments[eventKey] ?? (legacyKey ? punishments[legacyKey] : null) ?? config.punishment ?? defaultPunish;

  return { limit, punishment };
}

// Master Dispatcher for Audit Log Actions
async function processAuditEntry(entry, guild) {
  if (!guild || !entry) return;

  const config = securityManager.getConfig(guild.id);
  if (!config.antiNuke) return; // Anti-nuke disabled

  const executorId = entry.executorId;
  if (!executorId) return;

  // Deduplicate execution
  if (isAlreadyHandled(entry.id)) return;

  const actionType = entry.action;

  // Map AuditLogEvent to 22 Anti-Nuke whitelist action keys
  const auditActionMap = {
    [AuditLogEvent.MemberBanAdd]: 'antiBan',
    [AuditLogEvent.MemberBanRemove]: 'antiUnban',
    [AuditLogEvent.MemberKick]: 'antiKick',
    [AuditLogEvent.MemberPrune]: 'antiPrune',
    [AuditLogEvent.MemberUpdate]: 'antiMemberUpdate',
    [AuditLogEvent.ChannelCreate]: 'antiChannelCreate',
    [AuditLogEvent.ChannelDelete]: 'antiChannelDelete',
    [AuditLogEvent.ChannelUpdate]: 'antiChannelUpdate',
    [AuditLogEvent.RoleCreate]: 'antiRoleCreate',
    [AuditLogEvent.RoleDelete]: 'antiRoleDelete',
    [AuditLogEvent.RoleUpdate]: 'antiRoleUpdate',
    [AuditLogEvent.WebhookCreate]: 'antiWebhookCreate',
    [AuditLogEvent.WebhookDelete]: 'antiWebhookDelete',
    [AuditLogEvent.WebhookUpdate]: 'antiWebhookUpdate',
    [AuditLogEvent.EmojiCreate]: 'antiEmojiCreate',
    [AuditLogEvent.EmojiDelete]: 'antiEmojiDelete',
    [AuditLogEvent.EmojiUpdate]: 'antiEmojiUpdate',
    [AuditLogEvent.StickerCreate]: 'antiEmojiCreate',
    [AuditLogEvent.StickerDelete]: 'antiEmojiDelete',
    [AuditLogEvent.StickerUpdate]: 'antiEmojiUpdate',
    [AuditLogEvent.GuildUpdate]: 'antiGuildUpdate',
    [AuditLogEvent.BotAdd]: 'antiBotAdd',
    [AuditLogEvent.IntegrationCreate]: 'antiIntegration',
    [AuditLogEvent.IntegrationDelete]: 'antiIntegration',
    [AuditLogEvent.IntegrationUpdate]: 'antiIntegration'
  };

  const actionModule = auditActionMap[actionType];

  // Check if executor is authorized (Owner, Bot, Extra Owner, or Whitelisted for this specific action)
  const isAllowed = securityManager.isWhitelisted(guild, executorId, actionModule);
  if (isAllowed) return; // Legitimate whitelisted action

  const executor = entry.executor || await guild.client.users.fetch(executorId).catch(() => null);

  logger.warn(`[SECURITY INTERCEPT] Unauthorized action ${actionType} (${AuditLogEvent[actionType] || 'Unknown'}) by ${executor?.tag || executorId} in [${guild.name}]!`);

  // =========================================================================
  // 1. MEMBER ACTIONS (5 EVENTS)
  // =========================================================================

  // Event 1: Anti Ban (MemberBanAdd)
  if (actionType === AuditLogEvent.MemberBanAdd) {
    const { limit, punishment } = getModuleRule(config, 'antiBan', 'antiBanKick', 'ban', 1);
    const burst = securityManager.recordAndCheckBurst(guild, executorId, 'antiBan', limit, 15);

    // Immediately unban the victim
    try {
      if (entry.targetId) {
        await guild.bans.remove(entry.targetId, '[KYVEX ANTI-NUKE] Reverted unauthorized ban').catch(() => {});
      }
    } catch (e) {}

    if (burst.exceeded) {
      await securityManager.punish(guild, executorId, `Anti-Ban Triggered (Exceeded ${burst.limit}x Limit)`, punishment);
      await securityManager.logSecurityAlert(guild, {
        action: 'Member Banned (Limit Exceeded)',
        executor,
        target: `<@${entry.targetId}>`,
        reason: `Banned member without Whitelist (Reached ${burst.limit}x Limit)`,
        details: `Offender Punished (${punishment.toUpperCase()}) & Victim Unbanned`
      });
    } else {
      await securityManager.logSecurityAlert(guild, {
        action: `Member Ban Strike (${burst.count}/${burst.limit})`,
        executor,
        target: `<@${entry.targetId}>`,
        reason: `Banned member without Whitelist [Strike ${burst.count}/${burst.limit}]`,
        details: `Victim Unbanned • Offender has ${burst.limit - burst.count} strike(s) remaining`
      });
    }
    return;
  }

  // Event 2: Anti Unban (MemberBanRemove)
  if (actionType === AuditLogEvent.MemberBanRemove) {
    const { limit, punishment } = getModuleRule(config, 'antiUnban', 'antiBanKick', 'ban', 1);
    const burst = securityManager.recordAndCheckBurst(guild, executorId, 'antiUnban', limit, 15);

    // Re-ban the target who was maliciously unbanned
    try {
      if (entry.targetId) {
        await guild.bans.create(entry.targetId, { reason: '[KYVEX ANTI-NUKE] Re-banned unauthorized unban target' }).catch(() => {});
      }
    } catch (e) {}

    if (burst.exceeded) {
      await securityManager.punish(guild, executorId, `Anti-Unban Triggered (Exceeded ${burst.limit}x Limit)`, punishment);
      await securityManager.logSecurityAlert(guild, {
        action: 'Member Unbanned (Limit Exceeded)',
        executor,
        target: `<@${entry.targetId}>`,
        reason: `Unbanned user without Whitelist (Reached ${burst.limit}x Limit)`,
        details: `Offender Punished (${punishment.toUpperCase()}) & User Re-banned`
      });
    } else {
      await securityManager.logSecurityAlert(guild, {
        action: `Member Unban Strike (${burst.count}/${burst.limit})`,
        executor,
        target: `<@${entry.targetId}>`,
        reason: `Unbanned user without Whitelist [Strike ${burst.count}/${burst.limit}]`,
        details: `Target Re-banned • Offender has ${burst.limit - burst.count} strike(s) remaining`
      });
    }
    return;
  }

  // Event 3: Anti Kick (MemberKick)
  if (actionType === AuditLogEvent.MemberKick) {
    const { limit, punishment } = getModuleRule(config, 'antiKick', 'antiBanKick', 'ban', 1);
    const burst = securityManager.recordAndCheckBurst(guild, executorId, 'antiKick', limit, 15);

    if (burst.exceeded) {
      await securityManager.punish(guild, executorId, `Anti-Kick Triggered (Exceeded ${burst.limit}x Limit)`, punishment);
      await securityManager.logSecurityAlert(guild, {
        action: 'Member Kicked (Limit Exceeded)',
        executor,
        target: `<@${entry.targetId}>`,
        reason: `Kicked member without Whitelist (Reached ${burst.limit}x Limit)`,
        details: `Offender Punished (${punishment.toUpperCase()})`
      });
    } else {
      await securityManager.logSecurityAlert(guild, {
        action: `Member Kick Strike (${burst.count}/${burst.limit})`,
        executor,
        target: `<@${entry.targetId}>`,
        reason: `Kicked member without Whitelist [Strike ${burst.count}/${burst.limit}]`,
        details: `Strike recorded • Offender has ${burst.limit - burst.count} strike(s) remaining`
      });
    }
    return;
  }

  // Event 4: Anti Prune (MemberPrune)
  if (actionType === AuditLogEvent.MemberPrune) {
    const { limit, punishment } = getModuleRule(config, 'antiPrune', 'antiBanKick', 'ban', 1);
    const burst = securityManager.recordAndCheckBurst(guild, executorId, 'antiPrune', limit, 15);

    if (burst.exceeded) {
      await securityManager.punish(guild, executorId, `Anti-Prune Triggered (Exceeded ${burst.limit}x Limit)`, punishment);
      await securityManager.logSecurityAlert(guild, {
        action: 'Member Prune (Limit Exceeded)',
        executor,
        target: 'Server Members',
        reason: `Pruned members without Whitelist (Reached ${burst.limit}x Limit)`,
        details: `Offender Punished (${punishment.toUpperCase()})`
      });
    } else {
      await securityManager.logSecurityAlert(guild, {
        action: `Member Prune Strike (${burst.count}/${burst.limit})`,
        executor,
        target: 'Server Members',
        reason: `Pruned members without Whitelist [Strike ${burst.count}/${burst.limit}]`,
        details: `Strike recorded • Offender has ${burst.limit - burst.count} strike(s) remaining`
      });
    }
    return;
  }

  // Event 5: Anti Member Update (MemberUpdate - Timeout / Nickname / Deafen abuse)
  if (actionType === AuditLogEvent.MemberUpdate) {
    const { limit, punishment } = getModuleRule(config, 'antiMemberUpdate', null, 'ban', 1);
    const burst = securityManager.recordAndCheckBurst(guild, executorId, 'antiMemberUpdate', limit, 15);

    // Revert unauthorized changes
    try {
      const targetMember = await guild.members.fetch(entry.targetId).catch(() => null);
      if (targetMember && entry.changes) {
        for (const change of entry.changes) {
          // Revert unauthorized timeout
          if (change.key === 'communication_disabled_until') {
            await targetMember.disableCommunicationUntil(null, '[KYVEX ANTI-NUKE] Reverted unauthorized timeout').catch(() => {});
          }
          // Revert unauthorized nickname tampering
          if (change.key === 'nick') {
            await targetMember.setNickname(change.old || null, '[KYVEX ANTI-NUKE] Reverted unauthorized nickname change').catch(() => {});
          }
        }
      }
    } catch (e) {}

    if (burst.exceeded) {
      await securityManager.punish(guild, executorId, `Anti Member Update Triggered (Exceeded ${burst.limit}x Limit)`, punishment);
      await securityManager.logSecurityAlert(guild, {
        action: 'Member Modified / Timed Out (Limit Exceeded)',
        executor,
        target: `<@${entry.targetId}>`,
        reason: `Modified member settings without Whitelist (Reached ${burst.limit}x Limit)`,
        details: `Offender Punished (${punishment.toUpperCase()}) & Member Settings Reverted`
      });
    } else {
      await securityManager.logSecurityAlert(guild, {
        action: `Member Update Strike (${burst.count}/${burst.limit})`,
        executor,
        target: `<@${entry.targetId}>`,
        reason: `Modified member settings without Whitelist [Strike ${burst.count}/${burst.limit}]`,
        details: `Settings Reverted • Offender has ${burst.limit - burst.count} strike(s) remaining`
      });
    }
    return;
  }

  // =========================================================================
  // 2. CHANNEL MANAGEMENT (3 EVENTS)
  // =========================================================================

  // Event 6: Anti Channel Create (ChannelCreate)
  if (actionType === AuditLogEvent.ChannelCreate) {
    const { limit, punishment } = getModuleRule(config, 'antiChannelCreate', 'antiChannel', 'ban', 1);
    const burst = securityManager.recordAndCheckBurst(guild, executorId, 'antiChannelCreate', limit, 15);

    // Delete rogue channel
    try {
      const channel = guild.channels.cache.get(entry.targetId);
      if (channel) {
        await channel.delete('[KYVEX ANTI-NUKE] Unauthorized channel creation');
      }
    } catch (e) {}

    if (burst.exceeded) {
      await securityManager.punish(guild, executorId, `Anti Channel Create Triggered (Exceeded ${burst.limit}x Limit)`, punishment);
      await securityManager.logSecurityAlert(guild, {
        action: 'Channel Created (Limit Exceeded)',
        executor,
        target: entry.target?.name || 'Channel',
        reason: `Created channel without Whitelist (Reached ${burst.limit}x Limit)`,
        details: `Offender Punished (${punishment.toUpperCase()}) & Rogue Channel Deleted`
      });
    } else {
      await securityManager.logSecurityAlert(guild, {
        action: `Channel Creation Strike (${burst.count}/${burst.limit})`,
        executor,
        target: entry.target?.name || 'Channel',
        reason: `Created channel without Whitelist [Strike ${burst.count}/${burst.limit}]`,
        details: `Rogue Channel Deleted • Offender has ${burst.limit - burst.count} strike(s) remaining`
      });
    }
    return;
  }

  // Event 7: Anti Channel Delete (ChannelDelete)
  if (actionType === AuditLogEvent.ChannelDelete) {
    const { limit, punishment } = getModuleRule(config, 'antiChannelDelete', 'antiChannel', 'ban', 1);
    const burst = securityManager.recordAndCheckBurst(guild, executorId, 'antiChannelDelete', limit, 15);

    // Attempt Channel Restoration
    try {
      const deletedData = entry.target;
      if (deletedData) {
        await guild.channels.create({
          name: deletedData.name || 'restored-channel',
          type: deletedData.type || 0,
          topic: deletedData.topic || undefined,
          parent: deletedData.parentId || undefined,
          reason: '[KYVEX ANTI-NUKE] Recreated deleted channel'
        });
      }
    } catch (e) {
      logger.error('Failed to recreate deleted channel:', e);
    }

    if (burst.exceeded) {
      await securityManager.punish(guild, executorId, `Anti Channel Delete Triggered (Exceeded ${burst.limit}x Limit)`, punishment);
      await securityManager.logSecurityAlert(guild, {
        action: 'Channel Deleted (Limit Exceeded)',
        executor,
        target: entry.target?.name || 'Channel',
        reason: `Deleted channel without Whitelist (Reached ${burst.limit}x Limit)`,
        details: `Offender Punished (${punishment.toUpperCase()}) & Channel Recreated`
      });
    } else {
      await securityManager.logSecurityAlert(guild, {
        action: `Channel Deletion Strike (${burst.count}/${burst.limit})`,
        executor,
        target: entry.target?.name || 'Channel',
        reason: `Deleted channel without Whitelist [Strike ${burst.count}/${burst.limit}]`,
        details: `Channel Recreated • Offender has ${burst.limit - burst.count} strike(s) remaining`
      });
    }
    return;
  }

  // Event 8: Anti Channel Update (ChannelUpdate, OverwriteCreate/Update/Delete)
  if (
    actionType === AuditLogEvent.ChannelUpdate ||
    actionType === AuditLogEvent.ChannelOverwriteCreate ||
    actionType === AuditLogEvent.ChannelOverwriteUpdate ||
    actionType === AuditLogEvent.ChannelOverwriteDelete
  ) {
    const { limit, punishment } = getModuleRule(config, 'antiChannelUpdate', 'antiChannel', 'ban', 1);
    const burst = securityManager.recordAndCheckBurst(guild, executorId, 'antiChannelUpdate', limit, 15);

    // Attempt to revert channel modifications
    try {
      const channel = guild.channels.cache.get(entry.targetId);
      if (channel && entry.changes) {
        const revertData = {};
        for (const change of entry.changes) {
          if (change.key === 'name' && change.old) revertData.name = change.old;
          if (change.key === 'topic') revertData.topic = change.old || null;
        }
        if (Object.keys(revertData).length > 0) {
          await channel.edit(revertData);
        }
      }
    } catch (e) {}

    if (burst.exceeded) {
      await securityManager.punish(guild, executorId, `Anti Channel Update Triggered (Exceeded ${burst.limit}x Limit)`, punishment);
      await securityManager.logSecurityAlert(guild, {
        action: 'Channel Modified (Limit Exceeded)',
        executor,
        target: entry.target?.name || 'Channel',
        reason: `Modified channel settings/overwrites without Whitelist (Reached ${burst.limit}x Limit)`,
        details: `Offender Punished (${punishment.toUpperCase()}) & Settings Reverted`
      });
    } else {
      await securityManager.logSecurityAlert(guild, {
        action: `Channel Modification Strike (${burst.count}/${burst.limit})`,
        executor,
        target: entry.target?.name || 'Channel',
        reason: `Modified channel without Whitelist [Strike ${burst.count}/${burst.limit}]`,
        details: `Settings Reverted • Offender has ${burst.limit - burst.count} strike(s) remaining`
      });
    }
    return;
  }

  // =========================================================================
  // 3. ROLE MANAGEMENT (4 EVENTS)
  // =========================================================================

  // Event 9: Anti Role Create (RoleCreate)
  if (actionType === AuditLogEvent.RoleCreate) {
    const { limit, punishment } = getModuleRule(config, 'antiRoleCreate', 'antiRole', 'ban', 1);
    const burst = securityManager.recordAndCheckBurst(guild, executorId, 'antiRoleCreate', limit, 15);

    // Delete rogue created role
    try {
      const role = guild.roles.cache.get(entry.targetId);
      if (role) {
        await role.delete('[KYVEX ANTI-NUKE] Unauthorized role creation');
      }
    } catch (e) {}

    if (burst.exceeded) {
      await securityManager.punish(guild, executorId, `Anti Role Create Triggered (Exceeded ${burst.limit}x Limit)`, punishment);
      await securityManager.logSecurityAlert(guild, {
        action: 'Role Created (Limit Exceeded)',
        executor,
        target: entry.target?.name || 'Role',
        reason: `Created role without Whitelist (Reached ${burst.limit}x Limit)`,
        details: `Offender Punished (${punishment.toUpperCase()}) & Rogue Role Deleted`
      });
    } else {
      await securityManager.logSecurityAlert(guild, {
        action: `Role Creation Strike (${burst.count}/${burst.limit})`,
        executor,
        target: entry.target?.name || 'Role',
        reason: `Created role without Whitelist [Strike ${burst.count}/${burst.limit}]`,
        details: `Rogue Role Deleted • Offender has ${burst.limit - burst.count} strike(s) remaining`
      });
    }
    return;
  }

  // Event 10: Anti Role Delete (RoleDelete)
  if (actionType === AuditLogEvent.RoleDelete) {
    const { limit, punishment } = getModuleRule(config, 'antiRoleDelete', 'antiRole', 'ban', 1);
    const burst = securityManager.recordAndCheckBurst(guild, executorId, 'antiRoleDelete', limit, 15);

    // Attempt Role Restoration
    try {
      const roleData = entry.target;
      if (roleData) {
        await guild.roles.create({
          name: roleData.name || 'restored-role',
          color: roleData.color || 0,
          permissions: roleData.permissions || undefined,
          reason: '[KYVEX ANTI-NUKE] Recreated deleted role'
        });
      }
    } catch (e) {}

    if (burst.exceeded) {
      await securityManager.punish(guild, executorId, `Anti Role Delete Triggered (Exceeded ${burst.limit}x Limit)`, punishment);
      await securityManager.logSecurityAlert(guild, {
        action: 'Role Deleted (Limit Exceeded)',
        executor,
        target: entry.target?.name || 'Role',
        reason: `Deleted role without Whitelist (Reached ${burst.limit}x Limit)`,
        details: `Offender Punished (${punishment.toUpperCase()}) & Role Recreated`
      });
    } else {
      await securityManager.logSecurityAlert(guild, {
        action: `Role Deletion Strike (${burst.count}/${burst.limit})`,
        executor,
        target: entry.target?.name || 'Role',
        reason: `Deleted role without Whitelist [Strike ${burst.count}/${burst.limit}]`,
        details: `Role Recreated • Offender has ${burst.limit - burst.count} strike(s) remaining`
      });
    }
    return;
  }

  // Event 11 & 12: Anti Role Update & Anti Role Ping (RoleUpdate, MemberRoleUpdate)
  if (actionType === AuditLogEvent.RoleUpdate) {
    // Check if role was made mentionable (Anti Role Ping trigger)
    const madeMentionable = entry.changes?.some((c) => c.key === 'mentionable' && c.new === true);
    if (madeMentionable) {
      const { limit, punishment } = getModuleRule(config, 'antiRolePing', 'antiRole', 'ban', 1);
      const burst = securityManager.recordAndCheckBurst(guild, executorId, 'antiRolePing', limit, 15);

      try {
        const role = guild.roles.cache.get(entry.targetId);
        if (role) await role.setMentionable(false, '[KYVEX ANTI-NUKE] Reverted unauthorized role mentionable change');
      } catch (e) {}

      if (burst.exceeded) {
        await securityManager.punish(guild, executorId, `Anti Role Ping Triggered (Exceeded ${burst.limit}x Limit)`, punishment);
        await securityManager.logSecurityAlert(guild, {
          action: 'Role Made Mentionable (Limit Exceeded)',
          executor,
          target: entry.target?.name || 'Role',
          reason: `Made role mentionable without Whitelist (Reached ${burst.limit}x Limit)`,
          details: `Offender Punished (${punishment.toUpperCase()}) & Role Mentionable Disabled`
        });
      } else {
        await securityManager.logSecurityAlert(guild, {
          action: `Role Ping Strike (${burst.count}/${burst.limit})`,
          executor,
          target: entry.target?.name || 'Role',
          reason: `Made role mentionable without Whitelist [Strike ${burst.count}/${burst.limit}]`,
          details: `Role Mentionable Disabled • Offender has ${burst.limit - burst.count} strike(s) remaining`
        });
      }
      return;
    }

    // Standard Role Update (Permissions / Name)
    const { limit, punishment } = getModuleRule(config, 'antiRoleUpdate', 'antiRole', 'ban', 1);
    const burst = securityManager.recordAndCheckBurst(guild, executorId, 'antiRoleUpdate', limit, 15);

    try {
      const role = guild.roles.cache.get(entry.targetId);
      if (role && entry.changes) {
        for (const change of entry.changes) {
          if (change.key === 'permissions' && change.old) {
            await role.setPermissions(BigInt(change.old), '[KYVEX ANTI-NUKE] Reverted unauthorized role permissions');
          }
          if (change.key === 'name' && change.old) {
            await role.setName(change.old, '[KYVEX ANTI-NUKE] Reverted unauthorized role rename');
          }
        }
      }
    } catch (e) {}

    if (burst.exceeded) {
      await securityManager.punish(guild, executorId, `Anti Role Update Triggered (Exceeded ${burst.limit}x Limit)`, punishment);
      await securityManager.logSecurityAlert(guild, {
        action: 'Role Permissions Modified (Limit Exceeded)',
        executor,
        target: entry.target?.name || 'Role',
        reason: `Modified role permissions/name without Whitelist (Reached ${burst.limit}x Limit)`,
        details: `Offender Punished (${punishment.toUpperCase()}) & Role Permissions Reverted`
      });
    } else {
      await securityManager.logSecurityAlert(guild, {
        action: `Role Modification Strike (${burst.count}/${burst.limit})`,
        executor,
        target: entry.target?.name || 'Role',
        reason: `Modified role permissions without Whitelist [Strike ${burst.count}/${burst.limit}]`,
        details: `Role Permissions Reverted • Offender has ${burst.limit - burst.count} strike(s) remaining`
      });
    }
    return;
  }

  // Member Role Escalation (Giving Admin to other users)
  if (actionType === AuditLogEvent.MemberRoleUpdate) {
    const { limit, punishment } = getModuleRule(config, 'antiRoleUpdate', 'antiRole', 'ban', 1);
    const burst = securityManager.recordAndCheckBurst(guild, executorId, 'antiRoleUpdate', limit, 15);

    try {
      const targetMember = await guild.members.fetch(entry.targetId).catch(() => null);
      if (targetMember && entry.changes) {
        for (const change of entry.changes) {
          if (change.key === '$add' && Array.isArray(change.new)) {
            const roleIdsToRemove = change.new.map((r) => r.id);
            await targetMember.roles.remove(roleIdsToRemove, '[KYVEX ANTI-NUKE] Unauthorized role assignment reverted');
          }
        }
      }
    } catch (e) {}

    if (burst.exceeded) {
      await securityManager.punish(guild, executorId, `Member Role Escalation Triggered (Exceeded ${burst.limit}x Limit)`, punishment);
      await securityManager.logSecurityAlert(guild, {
        action: 'Member Role Modified (Limit Exceeded)',
        executor,
        target: `<@${entry.targetId}>`,
        reason: `Assigned roles without Whitelist (Reached ${burst.limit}x Limit)`,
        details: `Offender Punished (${punishment.toUpperCase()}) & Target Roles Revoked`
      });
    } else {
      await securityManager.logSecurityAlert(guild, {
        action: `Member Role Escalation Strike (${burst.count}/${burst.limit})`,
        executor,
        target: `<@${entry.targetId}>`,
        reason: `Assigned roles without Whitelist [Strike ${burst.count}/${burst.limit}]`,
        details: `Target Roles Revoked • Offender has ${burst.limit - burst.count} strike(s) remaining`
      });
    }
    return;
  }

  // =========================================================================
  // 4. WEBHOOK MANAGEMENT (3 EVENTS)
  // =========================================================================

  // Event 13: Anti Webhook Create (WebhookCreate)
  if (actionType === AuditLogEvent.WebhookCreate) {
    const { limit, punishment } = getModuleRule(config, 'antiWebhookCreate', 'antiWebhook', 'ban', 1);
    const burst = securityManager.recordAndCheckBurst(guild, executorId, 'antiWebhookCreate', limit, 15);

    try {
      const webhooks = await guild.fetchWebhooks().catch(() => null);
      const hook = webhooks?.get(entry.targetId);
      if (hook) await hook.delete('[KYVEX ANTI-NUKE] Unauthorized webhook creation');
    } catch (e) {}

    if (burst.exceeded) {
      await securityManager.punish(guild, executorId, `Anti Webhook Create Triggered (Exceeded ${burst.limit}x Limit)`, punishment);
      await securityManager.logSecurityAlert(guild, {
        action: 'Webhook Created (Limit Exceeded)',
        executor,
        target: entry.target?.name || 'Webhook',
        reason: `Created webhook without Whitelist (Reached ${burst.limit}x Limit)`,
        details: `Offender Punished (${punishment.toUpperCase()}) & Webhook Deleted`
      });
    } else {
      await securityManager.logSecurityAlert(guild, {
        action: `Webhook Creation Strike (${burst.count}/${burst.limit})`,
        executor,
        target: entry.target?.name || 'Webhook',
        reason: `Created webhook without Whitelist [Strike ${burst.count}/${burst.limit}]`,
        details: `Webhook Deleted • Offender has ${burst.limit - burst.count} strike(s) remaining`
      });
    }
    return;
  }

  // Event 14: Anti Webhook Delete (WebhookDelete)
  if (actionType === AuditLogEvent.WebhookDelete) {
    const { limit, punishment } = getModuleRule(config, 'antiWebhookDelete', 'antiWebhook', 'ban', 1);
    const burst = securityManager.recordAndCheckBurst(guild, executorId, 'antiWebhookDelete', limit, 15);

    if (burst.exceeded) {
      await securityManager.punish(guild, executorId, `Anti Webhook Delete Triggered (Exceeded ${burst.limit}x Limit)`, punishment);
      await securityManager.logSecurityAlert(guild, {
        action: 'Webhook Deleted (Limit Exceeded)',
        executor,
        target: entry.target?.name || 'Webhook',
        reason: `Deleted webhook without Whitelist (Reached ${burst.limit}x Limit)`,
        details: `Offender Punished (${punishment.toUpperCase()})`
      });
    } else {
      await securityManager.logSecurityAlert(guild, {
        action: `Webhook Deletion Strike (${burst.count}/${burst.limit})`,
        executor,
        target: entry.target?.name || 'Webhook',
        reason: `Deleted webhook without Whitelist [Strike ${burst.count}/${burst.limit}]`,
        details: `Strike recorded • Offender has ${burst.limit - burst.count} strike(s) remaining`
      });
    }
    return;
  }

  // Event 15: Anti Webhook Update (WebhookUpdate)
  if (actionType === AuditLogEvent.WebhookUpdate) {
    const { limit, punishment } = getModuleRule(config, 'antiWebhookUpdate', 'antiWebhook', 'ban', 1);
    const burst = securityManager.recordAndCheckBurst(guild, executorId, 'antiWebhookUpdate', limit, 15);

    if (burst.exceeded) {
      await securityManager.punish(guild, executorId, `Anti Webhook Update Triggered (Exceeded ${burst.limit}x Limit)`, punishment);
      await securityManager.logSecurityAlert(guild, {
        action: 'Webhook Modified (Limit Exceeded)',
        executor,
        target: entry.target?.name || 'Webhook',
        reason: `Modified webhook without Whitelist (Reached ${burst.limit}x Limit)`,
        details: `Offender Punished (${punishment.toUpperCase()})`
      });
    } else {
      await securityManager.logSecurityAlert(guild, {
        action: `Webhook Modification Strike (${burst.count}/${burst.limit})`,
        executor,
        target: entry.target?.name || 'Webhook',
        reason: `Modified webhook without Whitelist [Strike ${burst.count}/${burst.limit}]`,
        details: `Strike recorded • Offender has ${burst.limit - burst.count} strike(s) remaining`
      });
    }
    return;
  }

  // =========================================================================
  // 5. SERVER CONTENT (3 EVENTS)
  // =========================================================================

  // Event 16: Anti Emoji Create (EmojiCreate)
  if (actionType === AuditLogEvent.EmojiCreate) {
    const { limit, punishment } = getModuleRule(config, 'antiEmojiCreate', null, 'ban', 1);
    const burst = securityManager.recordAndCheckBurst(guild, executorId, 'antiEmojiCreate', limit, 15);

    try {
      const emoji = guild.emojis.cache.get(entry.targetId);
      if (emoji) await emoji.delete('[KYVEX ANTI-NUKE] Unauthorized emoji created');
    } catch (e) {}

    if (burst.exceeded) {
      await securityManager.punish(guild, executorId, `Anti Emoji Create Triggered (Exceeded ${burst.limit}x Limit)`, punishment);
      await securityManager.logSecurityAlert(guild, {
        action: 'Emoji Created (Limit Exceeded)',
        executor,
        target: 'Server Emoji',
        reason: `Created emoji without Whitelist (Reached ${burst.limit}x Limit)`,
        details: `Offender Punished (${punishment.toUpperCase()}) & Emoji Deleted`
      });
    } else {
      await securityManager.logSecurityAlert(guild, {
        action: `Emoji Creation Strike (${burst.count}/${burst.limit})`,
        executor,
        target: 'Server Emoji',
        reason: `Created emoji without Whitelist [Strike ${burst.count}/${burst.limit}]`,
        details: `Emoji Deleted • Offender has ${burst.limit - burst.count} strike(s) remaining`
      });
    }
    return;
  }

  // Event 17: Anti Emoji Delete (EmojiDelete)
  if (actionType === AuditLogEvent.EmojiDelete) {
    const { limit, punishment } = getModuleRule(config, 'antiEmojiDelete', null, 'ban', 1);
    const burst = securityManager.recordAndCheckBurst(guild, executorId, 'antiEmojiDelete', limit, 15);

    if (burst.exceeded) {
      await securityManager.punish(guild, executorId, `Anti Emoji Delete Triggered (Exceeded ${burst.limit}x Limit)`, punishment);
      await securityManager.logSecurityAlert(guild, {
        action: 'Emoji Deleted (Limit Exceeded)',
        executor,
        target: 'Server Emoji',
        reason: `Deleted emoji without Whitelist (Reached ${burst.limit}x Limit)`,
        details: `Offender Punished (${punishment.toUpperCase()})`
      });
    } else {
      await securityManager.logSecurityAlert(guild, {
        action: `Emoji Deletion Strike (${burst.count}/${burst.limit})`,
        executor,
        target: 'Server Emoji',
        reason: `Deleted emoji without Whitelist [Strike ${burst.count}/${burst.limit}]`,
        details: `Strike recorded • Offender has ${burst.limit - burst.count} strike(s) remaining`
      });
    }
    return;
  }

  // Event 18: Anti Emoji/Sticker Update (EmojiUpdate, StickerCreate/Delete/Update)
  if (
    actionType === AuditLogEvent.EmojiUpdate ||
    actionType === AuditLogEvent.StickerCreate ||
    actionType === AuditLogEvent.StickerDelete ||
    actionType === AuditLogEvent.StickerUpdate
  ) {
    const { limit, punishment } = getModuleRule(config, 'antiEmojiUpdate', null, 'ban', 1);
    const burst = securityManager.recordAndCheckBurst(guild, executorId, 'antiEmojiUpdate', limit, 15);

    if (actionType === AuditLogEvent.StickerCreate) {
      try {
        const sticker = guild.stickers.cache.get(entry.targetId);
        if (sticker) await sticker.delete('[KYVEX ANTI-NUKE] Unauthorized sticker creation');
      } catch (e) {}
    }

    if (burst.exceeded) {
      await securityManager.punish(guild, executorId, `Anti Emoji/Sticker Update Triggered (Exceeded ${burst.limit}x Limit)`, punishment);
      await securityManager.logSecurityAlert(guild, {
        action: 'Emoji/Sticker Tampered (Limit Exceeded)',
        executor,
        target: 'Emoji / Sticker',
        reason: `Modified emoji/sticker without Whitelist (Reached ${burst.limit}x Limit)`,
        details: `Offender Punished (${punishment.toUpperCase()})`
      });
    } else {
      await securityManager.logSecurityAlert(guild, {
        action: `Emoji/Sticker Tampering Strike (${burst.count}/${burst.limit})`,
        executor,
        target: 'Emoji / Sticker',
        reason: `Modified emoji/sticker without Whitelist [Strike ${burst.count}/${burst.limit}]`,
        details: `Strike recorded • Offender has ${burst.limit - burst.count} strike(s) remaining`
      });
    }
    return;
  }

  // =========================================================================
  // 6. SERVER SETTINGS (4 EVENTS)
  // =========================================================================

  // Event 19: Anti Guild Update (GuildUpdate - Name, Icon, Vanities, Verification Level)
  if (actionType === AuditLogEvent.GuildUpdate) {
    const { limit, punishment } = getModuleRule(config, 'antiGuildUpdate', null, 'ban', 1);
    const burst = securityManager.recordAndCheckBurst(guild, executorId, 'antiGuildUpdate', limit, 15);

    // Revert settings automatically
    const reverted = await securityManager.revertGuildSettings(guild, entry.changes);

    if (burst.exceeded) {
      await securityManager.punish(guild, executorId, `Anti Guild Update Triggered (Exceeded ${burst.limit}x Limit)`, punishment);
      await securityManager.logSecurityAlert(guild, {
        action: 'Server Settings Tampered (Limit Exceeded)',
        executor,
        target: guild.name,
        reason: `Modified server settings without Whitelist (Reached ${burst.limit}x Limit)`,
        details: reverted
          ? `Offender Punished (${punishment.toUpperCase()}) & Settings Reverted`
          : `Offender Punished (${punishment.toUpperCase()})`
      });
    } else {
      await securityManager.logSecurityAlert(guild, {
        action: `Server Settings Strike (${burst.count}/${burst.limit})`,
        executor,
        target: guild.name,
        reason: `Modified server settings without Whitelist [Strike ${burst.count}/${burst.limit}]`,
        details: reverted
          ? 'Settings Reverted • Offender will be punished upon reaching limit'
          : 'Alert Logged'
      });
    }
    return;
  }

  // Event 20: Anti Bot Add (BotAdd - Unauthorized Bot Invites)
  // Even if a user has Administrator permission, bot invites are strictly prohibited unless explicitly whitelisted!
  if (actionType === AuditLogEvent.BotAdd) {
    const { punishment } = getModuleRule(config, 'antiBotAdd', null, 'kick', 1);

    // 1. Instantly BAN or KICK the rogue bot from the server
    try {
      if (entry.targetId) {
        await guild.members.ban(entry.targetId, {
          reason: '[KYVEX ANTI-NUKE] Rogue bot addition strictly blocked - Administrator role does not grant bot invite privilege'
        }).catch(async () => {
          const botMember = await guild.members.fetch(entry.targetId).catch(() => null);
          if (botMember && botMember.user.bot) {
            await botMember.kick('[KYVEX ANTI-NUKE] Rogue bot addition blocked');
          }
        });
      }
    } catch (e) {}

    // 2. Immediately punish the inviter (even if they have Administrator permission!) and strip their admin roles
    const punishResult = await securityManager.punish(
      guild,
      executorId,
      'Unauthorized Bot Addition (Administrator role is not permitted to add bots)',
      punishment
    );

    // 3. Log high-severity security alert
    await securityManager.logSecurityAlert(guild, {
      action: 'Unauthorized Bot Invite Blocked',
      executor,
      target: `<@${entry.targetId}>`,
      reason: `Invited a bot without explicit Whitelist. Having Administrator permission does NOT authorize bot additions!`,
      details: `Rogue Bot Banned/Kicked • Offender Admin Roles Stripped & Punished (${punishResult || punishment.toUpperCase()})`
    });

    return;
  }

  // Event 22: Anti Integration (IntegrationCreate, IntegrationDelete, IntegrationUpdate)
  if (
    actionType === AuditLogEvent.IntegrationCreate ||
    actionType === AuditLogEvent.IntegrationDelete ||
    actionType === AuditLogEvent.IntegrationUpdate
  ) {
    const { limit, punishment } = getModuleRule(config, 'antiIntegration', 'antiIntegrationCreate', 'ban', 1);
    const burst = securityManager.recordAndCheckBurst(guild, executorId, 'antiIntegration', limit, 15);

    if (burst.exceeded) {
      await securityManager.punish(guild, executorId, `Anti Integration Triggered (Exceeded ${burst.limit}x Limit)`, punishment);
      await securityManager.logSecurityAlert(guild, {
        action: 'Integration Tampered (Limit Exceeded)',
        executor,
        target: 'Server Integrations',
        reason: `Modified server integrations without Whitelist (Reached ${burst.limit}x Limit)`,
        details: `Offender Punished (${punishment.toUpperCase()})`
      });
    } else {
      await securityManager.logSecurityAlert(guild, {
        action: `Integration Strike (${burst.count}/${burst.limit})`,
        executor,
        target: 'Server Integrations',
        reason: `Modified server integrations without Whitelist [Strike ${burst.count}/${burst.limit}]`,
        details: `Strike recorded • Offender has ${burst.limit - burst.count} strike(s) remaining`
      });
    }
    return;
  }
}

// Export module array with real-time audit log stream AND instant guild-level fallbacks
module.exports = [
  // 1. Primary real-time stream listener
  {
    name: 'guildAuditLogEntryCreate',
    async execute(entry, guild) {
      await processAuditEntry(entry, guild);
    }
  },

  // 2. Fallback: Instant Bot-Add Trap
  {
    name: 'guildMemberAdd',
    async execute(member, client) {
      if (!member || !member.user.bot) return;
      if (member.id === client.user.id) return;
      const guild = member.guild;
      const config = securityManager.getConfig(guild.id);
      if (!config.antiNuke) return;

      // Check audit log immediately (150ms for gateway audit log sync)
      setTimeout(async () => {
        try {
          const auditLogs = await guild.fetchAuditLogs({ limit: 5, type: AuditLogEvent.BotAdd }).catch(() => null);
          const entry = auditLogs?.entries.find((e) => e.targetId === member.id && Date.now() - e.createdTimestamp < 30000);
          if (entry) {
            await processAuditEntry(entry, guild);
          } else {
            // Safety ban/kick unverified rogue bot
            await guild.members.ban(member.id, {
              reason: '[KYVEX ANTI-NUKE] Unverified bot addition blocked - Administrator role does not grant bot invite privilege'
            }).catch(async () => {
              await member.kick('[KYVEX ANTI-NUKE] Unverified bot addition blocked').catch(() => {});
            });
          }
        } catch (err) {}
      }, 150);
    }
  },

  // 3. Fallback: Channel Delete Trap
  {
    name: 'channelDelete',
    async execute(channel, client) {
      if (!channel || !channel.guild) return;
      const guild = channel.guild;
      const config = securityManager.getConfig(guild.id);
      if (!config.antiNuke) return;

      setTimeout(async () => {
        try {
          const auditLogs = await guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.ChannelDelete }).catch(() => null);
          const entry = auditLogs?.entries.first();
          if (entry && entry.targetId === channel.id && Date.now() - entry.createdTimestamp < 15000) {
            await processAuditEntry(entry, guild);
          }
        } catch (err) {}
      }, 500);
    }
  },

  // 4. Fallback: Role Delete Trap
  {
    name: 'roleDelete',
    async execute(role, client) {
      if (!role || !role.guild) return;
      const guild = role.guild;
      const config = securityManager.getConfig(guild.id);
      if (!config.antiNuke) return;

      setTimeout(async () => {
        try {
          const auditLogs = await guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.RoleDelete }).catch(() => null);
          const entry = auditLogs?.entries.first();
          if (entry && entry.targetId === role.id && Date.now() - entry.createdTimestamp < 15000) {
            await processAuditEntry(entry, guild);
          }
        } catch (err) {}
      }, 500);
    }
  }
];
