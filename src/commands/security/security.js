const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { createSuccessEmbed, createErrorEmbed } = require('../../utils/embedBuilder');
const securityManager = require('../../utils/securityManager');
const logManager = require('../../utils/logManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('security')
    .setDescription('Autonomous security suite, emergency lockdown, and tier management')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    // 1. Lockdown
    .addSubcommand((sub) =>
      sub
        .setName('lockdown')
        .setDescription('Engage emergency lockdown across all text channels')
        .addStringOption((opt) => opt.setName('reason').setDescription('Reason for emergency lockdown'))
    )
    // 2. Unlock
    .addSubcommand((sub) =>
      sub
        .setName('unlock')
        .setDescription('Lift emergency lockdown and restore channel messaging')
        .addStringOption((opt) => opt.setName('reason').setDescription('Reason for unlocking'))
    )
    // 3. Status
    .addSubcommand((sub) =>
      sub
        .setName('status')
        .setDescription('View live status of Anti-Raid, Anti-Spam, Anti-Mention, Anti-Link & Tiers')
    )
    // 4. Roles
    .addSubcommand((sub) =>
      sub
        .setName('roles')
        .setDescription('Assign or revoke roles for Security Manager, Moderator, or Trusted User tiers')
        .addStringOption((opt) =>
          opt
            .setName('tier')
            .setDescription('Target security tier')
            .setRequired(true)
            .addChoices(
              { name: '🛡️ Security Manager', value: 'securityManagers' },
              { name: '🔨 Moderator', value: 'moderators' },
              { name: '⭐ Trusted User', value: 'trustedUsers' }
            )
        )
        .addStringOption((opt) =>
          opt
            .setName('action')
            .setDescription('Add or remove role')
            .setRequired(true)
            .addChoices(
              { name: '➕ Add Role to Tier', value: 'add' },
              { name: '➖ Remove Role from Tier', value: 'remove' }
            )
        )
        .addRoleOption((opt) => opt.setName('role').setDescription('Role to assign/remove').setRequired(true))
    )
    // 5. Config
    .addSubcommand((sub) =>
      sub
        .setName('config')
        .setDescription('Configure module thresholds and toggles')
        .addStringOption((opt) =>
          opt
            .setName('module')
            .setDescription('Target module')
            .setRequired(true)
            .addChoices(
              { name: 'Anti-Raid', value: 'antiRaid' },
              { name: 'Anti-Spam', value: 'antiSpam' },
              { name: 'Anti-Mention', value: 'antiMention' },
              { name: 'Anti-Link', value: 'antiLink' },
              { name: 'Anti-Nuke', value: 'antiNuke' }
            )
        )
        .addStringOption((opt) =>
          opt
            .setName('toggle')
            .setDescription('Turn module ON or OFF')
            .addChoices(
              { name: 'Enable (ON)', value: 'true' },
              { name: 'Disable (OFF)', value: 'false' }
            )
        )
        .addIntegerOption((opt) =>
          opt
            .setName('threshold')
            .setDescription('Numeric threshold (e.g. joins for raid, max mentions, or flood rate)')
            .setMinValue(1)
            .setMaxValue(50)
        )
    ),

  category: 'security',

  async execute(interaction, client) {
    // Strict Guard: Requires SECURITY_MANAGER, ADMIN, or OWNER tier!
    // Normal moderators are strictly denied from touching security config.
    if (!securityManager.protectCommand(interaction, 'SECURITY_MANAGER')) return;

    const sub = interaction.options.getSubcommand();
    const guild = interaction.guild;

    // ==========================================
    // 1. LOCKDOWN
    // ==========================================
    if (sub === 'lockdown') {
      const reason = interaction.options.getString('reason') || 'Manual emergency lockdown by administrator';
      await interaction.deferReply();

      const result = await securityManager.toggleEmergencyLockdown(guild, true);
      securityManager.setRaidState(guild.id, true, { reason, initiatedBy: interaction.user.id });

      await logManager.logModAction(guild, {
        action: 'EMERGENCY_LOCKDOWN',
        target: 'All Text Channels',
        moderator: interaction.user,
        reason,
        details: `${result.affectedChannels} channels locked`
      });

      return interaction.editReply({
        embeds: [
          createSuccessEmbed(
            '🔒 Emergency Lockdown Engaged',
            `**All public channels have been locked!**\n\n` +
            `• **Affected Channels:** \`${result.affectedChannels} channels\`\n` +
            `• **Initiator:** ${interaction.user} (\`${interaction.user.tag}\`)\n` +
            `• **Reason:** \`${reason}\`\n\n` +
            `*Use \`/security unlock\` when the emergency is resolved to restore messaging access.*`
          )
        ]
      });
    }

    // ==========================================
    // 2. UNLOCK
    // ==========================================
    if (sub === 'unlock') {
      const reason = interaction.options.getString('reason') || 'Emergency lockdown lifted';
      await interaction.deferReply();

      const result = await securityManager.toggleEmergencyLockdown(guild, false);
      securityManager.setRaidState(guild.id, false);

      await logManager.logModAction(guild, {
        action: 'LOCKDOWN_LIFTED',
        target: 'All Text Channels',
        moderator: interaction.user,
        reason,
        details: `${result.affectedChannels} channels unlocked`
      });

      return interaction.editReply({
        embeds: [
          createSuccessEmbed(
            '🔓 Emergency Lockdown Lifted',
            `**Server communication restored successfully!**\n\n` +
            `• **Restored Channels:** \`${result.affectedChannels} channels\`\n` +
            `• **Initiator:** ${interaction.user} (\`${interaction.user.tag}\`)\n` +
            `• **Reason:** \`${reason}\``
          )
        ]
      });
    }

    // ==========================================
    // 3. STATUS
    // ==========================================
    if (sub === 'status') {
      const config = securityManager.getConfig(guild.id);
      const isRaid = securityManager.isRaidActive(guild.id);

      const secRoles = (config.securityManagers?.roles || []).map((r) => `<@&${r}>`).join(' ') || '*None*';
      const modRoles = (config.moderators?.roles || []).map((r) => `<@&${r}>`).join(' ') || '*None*';
      const trustRoles = (config.trustedUsers?.roles || []).map((r) => `<@&${r}>`).join(' ') || '*None*';
      const extraOwners = (config.extraOwners || []).map((u) => `<@${u}>`).join(' ') || '*None*';

      const embed = new EmbedBuilder()
        .setColor('#ff2449')
        .setTitle(`🛡️ Kyvex • Autonomous Security Status [${guild.name}]`)
        .setDescription('Complete overview of active defense layers, threshold sentinels, and tier configurations.')
        .addFields([
          {
            name: '🚨 Anti-Raid Sentinel',
            value: `• **Status:** ${config.antiRaid?.enabled ? '🟢 Active' : '🔴 Disabled'}\n` +
                   `• **Raid Mode:** ${isRaid ? '⚠️ **ACTIVE RAID LOCKDOWN**' : '✅ Normal Operation'}\n` +
                   `• **Threshold:** \`${config.antiRaid?.joinThreshold || 5} joins\` within \`${config.antiRaid?.joinWindowSec || 10}s\`\n` +
                   `• **Action:** \`${config.antiRaid?.action || 'lockdown'}\` (${config.antiRaid?.quarantineDurationMin || 15}m timeout)`,
            inline: false
          },
          {
            name: '⚡ Anti-Spam & Progressive Punishment',
            value: `• **Status:** ${config.antiSpam?.enabled ? '🟢 Active' : '🔴 Disabled'}\n` +
                   `• **Message Flood Limit:** \`${config.antiSpam?.maxMessagesPer3Sec || 5} msgs / 3s\`\n` +
                   `• **Duplicate Filter:** \`${config.antiSpam?.maxDuplicates || 3} consecutive identical\`\n` +
                   `• **Emoji Limit:** \`${config.antiSpam?.maxEmojis || 7} emojis\` / \`${config.antiSpam?.maxStickers || 2} stickers\`\n` +
                   `• **Ladder:** Warn ➔ 5m Timeout ➔ 1h Timeout ➔ Kick ➔ Ban`,
            inline: false
          },
          {
            name: '📢 Anti-Mention & Anti-Link',
            value: `• **Anti-Mention:** ${config.antiMention?.enabled ? '🟢 Active' : '🔴 Disabled'} (Everyone/Here: ${config.antiMention?.blockEveryoneHere ? 'Blocked' : 'Allowed'} | Max Users: \`${config.antiMention?.maxUserMentions || 4}\` | Max Roles: \`${config.antiMention?.maxRoleMentions || 3}\`)\n` +
                   `• **Anti-Link:** ${config.antiLink?.enabled ? '🟢 Active' : '🔴 Disabled'} (Invites: ${config.antiLink?.blockInvites ? 'Blocked' : 'Allowed'} | Whitelist: \`${config.antiLink?.whitelistDomains?.length || 7} domains\`)`,
            inline: false
          },
          {
            name: '🔨 Anti-Nuke Sentinel & Rollback',
            value: `• **Status:** ${config.antiNuke ? '🟢 Active' : '🔴 Disabled'} | **Punishment:** \`${config.punishment || 'ban'}\`\n` +
                   `• **Burst Thresholds:** Ch Del: \`${config.antiNukeThresholds?.channelDelete || 2}\` | Role Del: \`${config.antiNukeThresholds?.roleDelete || 2}\` | Ban/Kick: \`${config.antiNukeThresholds?.banOrKick || 3}\` (Window: \`${config.antiNukeThresholds?.windowSec || 15}s\`)`,
            inline: false
          },
          {
            name: '👑 5-Tier Permission Configuration',
            value: `• **1. Owner:** <@${guild.ownerId}> | Extra Owners: ${extraOwners}\n` +
                   `• **2. Administrators:** Whitelisted (${config.adminWhitelist?.length || 0} users)\n` +
                   `• **3. Security Managers:** ${secRoles}\n` +
                   `• **4. Moderators:** ${modRoles}\n` +
                   `• **5. Trusted Users:** ${trustRoles}`,
            inline: false
          }
        ])
        .setFooter({ text: 'Kyvex Defense Matrix v5.2' })
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    }

    // ==========================================
    // 4. ROLES
    // ==========================================
    if (sub === 'roles') {
      const tierKey = interaction.options.getString('tier');
      const action = interaction.options.getString('action');
      const role = interaction.options.getRole('role');

      let updatedGroup;
      if (action === 'add') {
        updatedGroup = securityManager.addTierRole(guild.id, tierKey, role.id);
      } else {
        updatedGroup = securityManager.removeTierRole(guild.id, tierKey, role.id);
      }

      const tierLabels = {
        securityManagers: 'Security Manager',
        moderators: 'Moderator',
        trustedUsers: 'Trusted User'
      };

      await logManager.logModAction(guild, {
        action: 'TIER_ROLE_UPDATE',
        target: `@${role.name}`,
        moderator: interaction.user,
        reason: `${action === 'add' ? 'Added' : 'Removed'} ${role.name} ${action === 'add' ? 'to' : 'from'} ${tierLabels[tierKey]}`
      });

      return interaction.reply({
        embeds: [
          createSuccessEmbed(
            'Security Tier Role Updated',
            `Successfully **${action === 'add' ? 'added' : 'removed'}** role ${role} ${action === 'add' ? 'to' : 'from'} **${tierLabels[tierKey]}** tier.\n\n` +
            `• **Active Roles in Tier:** ${updatedGroup.roles.map((r) => `<@&${r}>`).join(', ') || '*None*'}`
          )
        ]
      });
    }

    // ==========================================
    // 5. CONFIG
    // ==========================================
    if (sub === 'config') {
      const moduleName = interaction.options.getString('module');
      const toggleStr = interaction.options.getString('toggle');
      const threshold = interaction.options.getInteger('threshold');

      const config = securityManager.getConfig(guild.id);
      const updates = {};

      if (moduleName === 'antiNuke') {
        if (toggleStr !== null) updates.antiNuke = toggleStr === 'true';
      } else if (config[moduleName]) {
        const modConfig = { ...config[moduleName] };
        if (toggleStr !== null) modConfig.enabled = toggleStr === 'true';

        if (threshold !== null) {
          if (moduleName === 'antiRaid') modConfig.joinThreshold = threshold;
          if (moduleName === 'antiSpam') modConfig.maxMessagesPer3Sec = threshold;
          if (moduleName === 'antiMention') modConfig.maxUserMentions = threshold;
        }
        updates[moduleName] = modConfig;
      }

      securityManager.updateConfig(guild.id, updates);

      await logManager.logModAction(guild, {
        action: 'SECURITY_CONFIG_UPDATE',
        target: moduleName,
        moderator: interaction.user,
        reason: `Configured ${moduleName} (toggle: ${toggleStr}, threshold: ${threshold})`
      });

      return interaction.reply({
        embeds: [
          createSuccessEmbed(
            'Security Configuration Saved',
            `⚙️ Successfully updated **${moduleName}** settings.\n` +
            (toggleStr !== null ? `• **Status:** \`${toggleStr === 'true' ? 'Enabled' : 'Disabled'}\`\n` : '') +
            (threshold !== null ? `• **Threshold:** \`${threshold}\`\n` : '') +
            `*Run \`/security status\` to view the updated matrix.*`
          )
        ]
      });
    }
  }
};
