const { EmbedBuilder, AuditLogEvent } = require('discord.js');
const logManager = require('../../utils/logManager');

module.exports = [
  // 1. Role Created
  {
    name: 'roleCreate',
    async execute(role) {
      if (!role.guild) return;

      await new Promise((resolve) => setTimeout(resolve, 350));
      const roleLog = await logManager.fetchAuditLog(role.guild, AuditLogEvent.RoleCreate, role.id, 6000);

      const embed = new EmbedBuilder()
        .setColor(role.color || '#22c55e')
        .setAuthor({ name: '🛡️ Role Created' })
        .setDescription(`Role ${role} (\`${role.name}\`) has been created.`)
        .addFields([
          { name: '🛡️ Role (Kisko banaya)', value: `${role} (\`${role.name}\`)`, inline: true },
          {
            name: '🛠️ Created By (Kisne banaya)',
            value: roleLog ? `${roleLog.executor} (\`${roleLog.executor?.tag}\`)` : '*Unknown / Bot*',
            inline: true
          },
          { name: '🎨 Color', value: `\`${role.hexColor}\``, inline: true },
          { name: '📌 Hoisted', value: role.hoist ? 'Yes' : 'No', inline: true },
          { name: '🔔 Mentionable', value: role.mentionable ? 'Yes' : 'No', inline: true }
        ])
        .setFooter({ text: `Role ID: ${role.id}` })
        .setTimestamp();

      if (roleLog?.reason) {
        embed.addFields([{ name: '📝 Reason', value: roleLog.reason, inline: false }]);
      }

      await logManager.send(role.guild, 'role', embed);
    }
  },

  // 2. Role Deleted
  {
    name: 'roleDelete',
    async execute(role) {
      if (!role.guild) return;

      await new Promise((resolve) => setTimeout(resolve, 350));
      const roleLog = await logManager.fetchAuditLog(role.guild, AuditLogEvent.RoleDelete, role.id, 6000);

      const embed = new EmbedBuilder()
        .setColor('#ef4444')
        .setAuthor({ name: '🗑️ Role Deleted' })
        .setDescription(`Role **@${role.name}** was deleted from the server.`)
        .addFields([
          { name: '🛡️ Role (Kisko delete kiya)', value: `\`@${role.name}\` (\`${role.id}\`)`, inline: true },
          {
            name: '🛠️ Deleted By (Kisne delete kiya)',
            value: roleLog ? `${roleLog.executor} (\`${roleLog.executor?.tag}\`)` : '*Unknown / Bot*',
            inline: true
          }
        ])
        .setFooter({ text: `Role ID: ${role.id}` })
        .setTimestamp();

      if (roleLog?.reason) {
        embed.addFields([{ name: '📝 Reason', value: roleLog.reason, inline: false }]);
      }

      await logManager.send(role.guild, 'role', embed);
    }
  },

  // 3. Role Settings Updated
  {
    name: 'roleUpdate',
    async execute(oldRole, newRole) {
      if (!newRole.guild) return;

      const changes = [];

      if (oldRole.name !== newRole.name) {
        changes.push(`**Name:** \`${oldRole.name}\` ➔ \`${newRole.name}\``);
      }
      if (oldRole.hexColor !== newRole.hexColor) {
        changes.push(`**Color:** \`${oldRole.hexColor}\` ➔ \`${newRole.hexColor}\``);
      }
      if (oldRole.hoist !== newRole.hoist) {
        changes.push(`**Hoisted:** \`${oldRole.hoist}\` ➔ \`${newRole.hoist}\``);
      }
      if (oldRole.mentionable !== newRole.mentionable) {
        changes.push(`**Mentionable:** \`${oldRole.mentionable}\` ➔ \`${newRole.mentionable}\``);
      }
      if (oldRole.permissions.bitfield !== newRole.permissions.bitfield) {
        changes.push('**Permissions:** Role permissions have been modified.');
      }

      if (changes.length === 0) return;

      await new Promise((resolve) => setTimeout(resolve, 350));
      const roleLog = await logManager.fetchAuditLog(newRole.guild, AuditLogEvent.RoleUpdate, newRole.id, 6000);

      const embed = new EmbedBuilder()
        .setColor(newRole.color || '#ec4899')
        .setAuthor({ name: '✏️ Role Updated' })
        .setDescription(`Role ${newRole} (\`${newRole.name}\`) was modified.`)
        .addFields([
          { name: '🛡️ Role (Kisko kiya)', value: `${newRole} (\`${newRole.id}\`)`, inline: true },
          {
            name: '🛠️ Modified By (Kisne kiya)',
            value: roleLog ? `${roleLog.executor} (\`${roleLog.executor?.tag}\`)` : '*Unknown / Bot*',
            inline: true
          },
          { name: '📝 Modifications', value: changes.join('\n'), inline: false }
        ])
        .setFooter({ text: `Role ID: ${newRole.id}` })
        .setTimestamp();

      if (roleLog?.reason) {
        embed.addFields([{ name: '📝 Reason', value: roleLog.reason, inline: false }]);
      }

      await logManager.send(newRole.guild, 'role', embed);
    }
  }
];
