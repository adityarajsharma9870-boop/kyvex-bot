const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const securityManager = require('../../utils/securityManager');
const { createAstrialEmbed, createSuccessEmbed, createErrorEmbed } = require('../../utils/embedBuilder');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('adminwhitelist')
    .setDescription('Manage trusted administrators authorized to hold Admin roles and manage the server')
    .addSubcommand((sub) =>
      sub
        .setName('add')
        .setDescription('Authorize a trusted admin to hold Administrator permissions (Server Owner Only)')
        .addUserOption((opt) =>
          opt.setName('user').setDescription('User to add to Administrator Whitelist').setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('remove')
        .setDescription('Revoke admin authorization and strip active Admin roles (Server Owner Only)')
        .addUserOption((opt) =>
          opt.setName('user').setDescription('User to remove from Administrator Whitelist').setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub.setName('list').setDescription('View all verified and authorized administrators')
    )
    .addSubcommand((sub) =>
      sub
        .setName('securerole')
        .setDescription('Remove Administrator from role & make it safe to message in all channels (Owner Only)')
        .addRoleOption((opt) =>
          opt.setName('role').setDescription('Role to secure (e.g. Developer)').setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('scan')
        .setDescription('Scan the server and auto-secure any unwhitelisted Administrator roles (Owner Only)')
    ),

  category: 'security',

  async execute(interaction, client) {
    const sub = interaction.options.getSubcommand();
    const config = securityManager.getConfig(interaction.guildId);

    // 1. List Subcommand (Viewable by all)
    if (sub === 'list') {
      const whitelist = config.adminWhitelist || config.whitelist || [];
      const list = whitelist.length > 0
        ? whitelist.map((id, index) => `\`${index + 1}.\` <@${id}> (\`${id}\`)`).join('\n')
        : '*No additional administrators whitelisted yet.*';

      const embed = createAstrialEmbed()
        .setTitle('🛡️ Kyvex • Administrator Whitelist')
        .setDescription(
          `**Server Owner (Permanent Bypass):** <@${interaction.guild.ownerId}>\n\n` +
          `__**Authorized Administrators:**__\n${list}\n\n` +
          `🔒 **Strict Protection:** Koi bhi unwhitelisted member jiske paas Administrator role hai wo channel create/delete, role create/delete, server settings ya destructive actions nahi kar sakta.`
        )
        .addFields({
          name: '⚙️ Security Status',
          value: `• **Anti-Nuke:** \`${config.antiNuke ? 'ENABLED' : 'DISABLED'}\`\n• **Admin Protection:** \`ACTIVE\`\n• **Punishment:** \`${config.punishment.toUpperCase()}\``
        });

      return interaction.reply({ embeds: [embed] });
    }

    // 2. All remaining subcommands (add, remove, securerole, scan) are Server Owner or Extra Owner Only!
    if (!securityManager.isOwnerOrExtraOwner(interaction.guild, interaction.user.id)) {
      return interaction.reply({
        embeds: [
          createErrorEmbed(
            'Owner / Extra Owner Only',
            '⛔ Sirf **Server Owner** ya **Extra Owner** hi `/adminwhitelist` ko manage kar sakte hain!'
          )
        ],
        ephemeral: true
      });
    }

    // 3. Subcommand: securerole (e.g. Developer role)
    if (sub === 'securerole') {
      const targetRole = interaction.options.getRole('role');
      const botMember = interaction.guild.members.me;

      if (targetRole.id === interaction.guild.id) {
        return interaction.reply({
          embeds: [createErrorEmbed('Invalid Role', '@everyone role ko sanitize nahi kiya ja sakta.')],
          ephemeral: true
        });
      }

      if (targetRole.position >= botMember.roles.highest.position) {
        return interaction.reply({
          embeds: [
            createErrorEmbed(
              'Hierarchy Error',
              `Role **${targetRole.name}** bot ke highest role se upar ya barabar hai.\n` +
              `Discord me \`Server Settings -> Roles\` me jakar **Kyvex** bot role ko is role ke upar drag karein!`
            )
          ],
          ephemeral: true
        });
      }

      await interaction.deferReply();

      // Sanitize role: Remove Administrator, Server Settings, Role Management, etc.
      // And add ViewChannel, SendMessages, ReadHistory, EmbedLinks, AttachFiles!
      const success = await securityManager.sanitizeRole(
        targetRole,
        `Secured by Server Owner ${interaction.user.tag}`
      );

      if (!success) {
        return interaction.editReply({
          embeds: [createErrorEmbed('Action Failed', `Role **${targetRole.name}** ki permissions modify nahi ho saki.`)]
        });
      }

      // Ensure all text and voice channels have permission overwrites for this role
      let channelCount = 0;
      for (const channel of interaction.guild.channels.cache.values()) {
        if (channel.isTextBased?.() || channel.isVoiceBased?.()) {
          try {
            await channel.permissionOverwrites.edit(
              targetRole,
              {
                ViewChannel: true,
                SendMessages: true,
                ReadMessageHistory: true
              },
              { reason: '[Kyvex] All-channel messaging enabled for secured role' }
            );
            channelCount++;
          } catch (e) {}
        }
      }

      const embed = createSuccessEmbed(
        'Role Secured Successfully',
        `🛡️ Role **<@&${targetRole.id}>** has been secured!\n\n` +
        `• ❌ **Administrator:** \`DISABLED\` (Server Settings nahi khol sakta, bot add nahi kar sakta, role create nahi kar sakta)\n` +
        `• ❌ **Manage Guild / Manage Roles:** \`DISABLED\`\n` +
        `• ✅ **All-Channel Messaging:** \`ACTIVE\` in **${channelCount}** channels (Sabhi channels me message kar sakta hai)\n` +
        `• 👥 **Members with this role:** \`${targetRole.members.size}\` members keep their role safely!`
      );

      return interaction.editReply({ embeds: [embed] });
    }

    // 4. Scan Subcommand
    if (sub === 'scan') {
      await interaction.deferReply();
      try {
        const members = await interaction.guild.members.fetch();
        const whitelist = config.adminWhitelist || config.whitelist || [];

        const verifiedAdmins = [];
        const unauthorizedAdmins = [];
        const botMember = interaction.guild.members.me;

        for (const [id, member] of members) {
          if (member.user.bot) continue;
          if (id === interaction.guild.ownerId) continue;

          // Check if member has Administrator permission
          if (member.permissions.has(PermissionFlagsBits.Administrator)) {
            if (whitelist.includes(id)) {
              verifiedAdmins.push(member);
            } else {
              unauthorizedAdmins.push(member);
            }
          }
        }

        const verifiedText = verifiedAdmins.length > 0
          ? verifiedAdmins.map((m) => `• <@${m.id}> (\`${m.user.tag}\`)`).join('\n')
          : '*None*';

        const unauthorizedText = unauthorizedAdmins.length > 0
          ? unauthorizedAdmins.map((m) => `• ⚠️ <@${m.id}> (\`${m.user.tag}\`) - *Admin Permission Active (Guarded by Anti-Nuke)*`).join('\n')
          : '✅ *No unauthorized administrators found. Your server is 100% secure!*';

        const scanEmbed = createAstrialEmbed()
          .setTitle('🔍 Kyvex • Administrator Security Scan')
          .setDescription(
            `**Total Members Scanned:** \`${members.size}\`\n\n` +
            `👑 **Server Owner:** <@${interaction.guild.ownerId}>\n\n` +
            `🛡️ **Authorized Whitelisted Admins (${verifiedAdmins.length}):**\n${verifiedText}\n\n` +
            `🚨 **Unwhitelisted Members with Admin Roles (${unauthorizedAdmins.length}):**\n${unauthorizedText}`
          )
          .setFooter({ text: 'Kyvex Security Engine • Scan & Neutralization Complete' });

        return interaction.editReply({ embeds: [scanEmbed] });
      } catch (err) {
        return interaction.editReply({
          embeds: [createErrorEmbed('Scan Failed', err.message || 'Could not complete server scan.')]
        });
      }
    }

    const targetUser = interaction.options.getUser('user');

    // 5. Add Subcommand
    if (sub === 'add') {
      if (targetUser.id === interaction.guild.ownerId) {
        return interaction.reply({
          embeds: [createErrorEmbed('Already Immune', 'Server Owner permanently immune aur authorized hota hai.')],
          ephemeral: true
        });
      }

      if (targetUser.bot) {
        return interaction.reply({
          embeds: [createErrorEmbed('Invalid Target', 'Bot accounts ko user whitelist me add nahi kar sakte.')],
          ephemeral: true
        });
      }

      const whitelist = config.adminWhitelist || config.whitelist || [];
      if (whitelist.includes(targetUser.id)) {
        return interaction.reply({
          embeds: [createErrorEmbed('Already Whitelisted', `${targetUser} pehle se hi **Administrator Whitelist** me hai.`)],
          ephemeral: true
        });
      }

      securityManager.addAdminWhitelist(interaction.guildId, targetUser.id);

      return interaction.reply({
        embeds: [
          createSuccessEmbed(
            'Administrator Whitelisted',
            `✅ ${targetUser} has been **added to the Administrator Whitelist**!\n\n` +
            `• Ab ye user Administrator role rakh sakta hai.\n` +
            `• Channels, Roles aur Server Settings manage karne par bot inko block ya punish nahi karega.`
          )
        ]
      });
    }

    // 6. Remove Subcommand
    if (sub === 'remove') {
      const whitelist = config.adminWhitelist || config.whitelist || [];
      if (!whitelist.includes(targetUser.id)) {
        return interaction.reply({
          embeds: [createErrorEmbed('Not Whitelisted', `${targetUser} Administrator Whitelist me nahi hai.`)],
          ephemeral: true
        });
      }

      securityManager.removeAdminWhitelist(interaction.guildId, targetUser.id);

      // Immediately revoke any active Administrator roles from this user
      let roleRevokedMessage = '';
      try {
        const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
        if (member) {
          const botMember = interaction.guild.members.me;
          const dangerousRoles = member.roles.cache.filter(
            (r) => r.permissions.has(PermissionFlagsBits.Administrator) && r.position < botMember.roles.highest.position
          );
          if (dangerousRoles.size > 0) {
            await member.roles.remove(dangerousRoles, '[Kyvex] Removed from Administrator Whitelist');
            roleRevokedMessage = `\n🔒 *Unka Administrator role turant revoke kar diya gaya hai.*`;
          }
        }
      } catch (e) {}

      return interaction.reply({
        embeds: [
          createSuccessEmbed(
            'Administrator Whitelist Revoked',
            `❌ ${targetUser} has been **removed from the Administrator Whitelist**!${roleRevokedMessage}\n\n` +
            `• Agar inke paas Administrator role hoga ya wo channel/role/server settings chhedenge, toh bot turant rollback aur punish kar dega.`
          )
        ]
      });
    }
  }
};
