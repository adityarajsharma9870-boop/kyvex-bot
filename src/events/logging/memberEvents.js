const { EmbedBuilder, AuditLogEvent } = require('discord.js');
const logManager = require('../../utils/logManager');

module.exports = [
  // 1. Member Joined
  {
    name: 'guildMemberAdd',
    async execute(member) {
      if (!member.guild) return;

      const user = member.user;
      const accountAgeDays = Math.floor((Date.now() - user.createdTimestamp) / (1000 * 60 * 60 * 24));
      const isNewAccount = accountAgeDays < 7;

      const embed = new EmbedBuilder()
        .setColor('#22c55e')
        .setAuthor({
          name: '📥 Member Joined',
          iconURL: user.displayAvatarURL({ dynamic: true })
        })
        .setThumbnail(user.displayAvatarURL({ dynamic: true }))
        .setDescription(`${member} (\`${user.tag}\`) joined the server.`)
        .addFields([
          { name: '👤 Member (Kisko/Target)', value: `${member} (\`${user.id}\`)`, inline: true },
          { name: '📅 Account Created', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R> (${accountAgeDays}d ago)`, inline: true },
          { name: '👥 Member Count', value: `\`#${member.guild.memberCount}\``, inline: true }
        ])
        .setFooter({ text: isNewAccount ? '⚠️ New Account (< 7 days old)' : 'Member Joined' })
        .setTimestamp();

      await logManager.send(member.guild, 'member', embed);
    }
  },

  // 2. Member Left or Kicked
  {
    name: 'guildMemberRemove',
    async execute(member) {
      if (!member.guild) return;

      const user = member.user;
      const roles = member.roles.cache
        .filter((r) => r.id !== member.guild.id)
        .map((r) => r.name)
        .join(', ') || 'None';

      // Check if user was kicked via Audit Logs
      const kickLog = await logManager.fetchAuditLog(member.guild, AuditLogEvent.MemberKick, member.id, 6000);

      const embed = new EmbedBuilder()
        .setColor(kickLog ? '#dc2626' : '#ef4444')
        .setAuthor({
          name: kickLog ? '👢 Member Kicked' : '📤 Member Left',
          iconURL: user.displayAvatarURL({ dynamic: true })
        })
        .setThumbnail(user.displayAvatarURL({ dynamic: true }))
        .setDescription(
          kickLog
            ? `**${user.tag}** was kicked by ${kickLog.executor} (\`${kickLog.executor?.tag}\`).`
            : `**${user.tag}** left the server.`
        )
        .addFields([
          { name: '👤 Target (Kisko kiya)', value: `${user.tag} (\`${user.id}\`)`, inline: true },
          {
            name: '🛠️ Action By (Kisne kiya)',
            value: kickLog ? `${kickLog.executor} (\`${kickLog.executor?.id}\`)` : '*Self / Left*',
            inline: true
          },
          { name: '👥 Member Count', value: `\`#${member.guild.memberCount}\``, inline: true }
        ])
        .setFooter({ text: kickLog ? 'Moderation Kick' : 'Member Left' })
        .setTimestamp();

      if (kickLog?.reason) {
        embed.addFields([{ name: '📝 Reason', value: kickLog.reason, inline: false }]);
      }

      if (roles !== 'None') {
        embed.addFields([{
          name: '🏷️ Roles Before Leaving',
          value: roles.length > 1024 ? roles.substring(0, 1020) + '...' : roles,
          inline: false
        }]);
      }

      await logManager.send(member.guild, 'member', embed);
    }
  },

  // 3. Member Profile / Nickname / Roles Update
  {
    name: 'guildMemberUpdate',
    async execute(oldMember, newMember) {
      if (!newMember.guild) return;

      // A. Nickname Update
      if (oldMember.nickname !== newMember.nickname) {
        const updateLog = await logManager.fetchAuditLog(newMember.guild, AuditLogEvent.MemberUpdate, newMember.id, 6000);
        const executor = updateLog ? updateLog.executor : newMember.user;

        const embed = new EmbedBuilder()
          .setColor('#3b82f6')
          .setAuthor({
            name: '✏️ Nickname Changed',
            iconURL: newMember.user.displayAvatarURL({ dynamic: true })
          })
          .setDescription(`Nickname changed for ${newMember} (\`${newMember.user.tag}\`).`)
          .addFields([
            { name: '👤 Target (Kiska nick badla)', value: `${newMember} (\`${newMember.id}\`)`, inline: true },
            { name: '🛠️ Changed By (Kisne badla)', value: `${executor} (\`${executor?.tag || executor?.id}\`)`, inline: true },
            { name: 'Old Nickname', value: oldMember.nickname || '*None (Username)*', inline: true },
            { name: 'New Nickname', value: newMember.nickname || '*None (Username)*', inline: true }
          ])
          .setFooter({ text: 'Member Profile Update' })
          .setTimestamp();

        await logManager.send(newMember.guild, 'member', embed);
      }

      // B. Role Assignment / Removal (Routed to role-logs)
      const addedRoles = newMember.roles.cache.filter((r) => !oldMember.roles.cache.has(r.id));
      const removedRoles = oldMember.roles.cache.filter((r) => !newMember.roles.cache.has(r.id));

      if (addedRoles.size > 0 || removedRoles.size > 0) {
        // Small delay to allow Discord audit log entry creation
        await new Promise((resolve) => setTimeout(resolve, 350));
        const roleLog = await logManager.fetchAuditLog(newMember.guild, AuditLogEvent.MemberRoleUpdate, newMember.id, 6000);

        const embed = new EmbedBuilder()
          .setColor('#ec4899')
          .setAuthor({
            name: '🛡️ Member Roles Updated',
            iconURL: newMember.user.displayAvatarURL({ dynamic: true })
          })
          .setDescription(
            roleLog
              ? `Roles for ${newMember} were updated by ${roleLog.executor} (\`${roleLog.executor?.tag}\`).`
              : `Roles updated for ${newMember} (\`${newMember.user.tag}\`).`
          )
          .addFields([
            { name: '👤 Target (Kisko kiya)', value: `${newMember} (\`${newMember.id}\`)`, inline: true },
            {
              name: '🛠️ Action By (Kisne kiya)',
              value: roleLog ? `${roleLog.executor} (\`${roleLog.executor?.id}\`)` : '*Unknown / Bot / Integration*',
              inline: true
            }
          ])
          .setFooter({ text: 'Role Assignment Log' })
          .setTimestamp();

        if (addedRoles.size > 0) {
          embed.addFields([{
            name: '➕ Added Roles (Diya gaya)',
            value: addedRoles.map((r) => `<@&${r.id}>`).join(' ') || 'None',
            inline: false
          }]);
        }
        if (removedRoles.size > 0) {
          embed.addFields([{
            name: '➖ Removed Roles (Hataya gaya)',
            value: removedRoles.map((r) => `<@&${r.id}>`).join(' ') || 'None',
            inline: false
          }]);
        }
        if (roleLog?.reason) {
          embed.addFields([{ name: '📝 Reason', value: roleLog.reason, inline: false }]);
        }

        await logManager.send(newMember.guild, 'role', embed);
      }
    }
  }
];
