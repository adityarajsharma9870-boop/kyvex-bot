const { EmbedBuilder, AuditLogEvent } = require('discord.js');
const logManager = require('../../utils/logManager');

module.exports = [
  // 1. User Banned
  {
    name: 'guildBanAdd',
    async execute(ban) {
      if (!ban.guild) return;

      await new Promise((resolve) => setTimeout(resolve, 350));
      const banLog = await logManager.fetchAuditLog(ban.guild, AuditLogEvent.MemberBanAdd, ban.user.id, 6000);

      const embed = new EmbedBuilder()
        .setColor('#ef4444')
        .setAuthor({
          name: '🔨 Member Banned',
          iconURL: ban.user.displayAvatarURL({ dynamic: true })
        })
        .setThumbnail(ban.user.displayAvatarURL({ dynamic: true }))
        .setDescription(
          banLog
            ? `**${ban.user.tag}** was banned by ${banLog.executor} (\`${banLog.executor?.tag}\`).`
            : `**${ban.user.tag}** was banned from the server.`
        )
        .addFields([
          { name: '👤 Target (Kisko ban kiya)', value: `${ban.user.tag} (\`${ban.user.id}\`)`, inline: true },
          {
            name: '🛠️ Banned By (Kisne ban kiya)',
            value: banLog ? `${banLog.executor} (\`${banLog.executor?.id}\`)` : '*Unknown / Discord*',
            inline: true
          },
          { name: '📝 Reason', value: banLog?.reason || ban.reason || '*No reason specified*', inline: false }
        ])
        .setFooter({ text: 'Moderation Ban' })
        .setTimestamp();

      await logManager.send(ban.guild, 'mod', embed);
    }
  },

  // 2. User Unbanned
  {
    name: 'guildBanRemove',
    async execute(ban) {
      if (!ban.guild) return;

      await new Promise((resolve) => setTimeout(resolve, 350));
      const unbanLog = await logManager.fetchAuditLog(ban.guild, AuditLogEvent.MemberBanRemove, ban.user.id, 6000);

      const embed = new EmbedBuilder()
        .setColor('#22c55e')
        .setAuthor({
          name: '🔓 Member Unbanned',
          iconURL: ban.user.displayAvatarURL({ dynamic: true })
        })
        .setThumbnail(ban.user.displayAvatarURL({ dynamic: true }))
        .setDescription(
          unbanLog
            ? `**${ban.user.tag}** was unbanned by ${unbanLog.executor} (\`${unbanLog.executor?.tag}\`).`
            : `**${ban.user.tag}** was unbanned from the server.`
        )
        .addFields([
          { name: '👤 Target (Kisko unban kiya)', value: `${ban.user.tag} (\`${ban.user.id}\`)`, inline: true },
          {
            name: '🛠️ Unbanned By (Kisne unban kiya)',
            value: unbanLog ? `${unbanLog.executor} (\`${unbanLog.executor?.id}\`)` : '*Unknown / Discord*',
            inline: true
          }
        ])
        .setFooter({ text: 'Moderation Unban' })
        .setTimestamp();

      if (unbanLog?.reason) {
        embed.addFields([{ name: '📝 Reason', value: unbanLog.reason, inline: false }]);
      }

      await logManager.send(ban.guild, 'mod', embed);
    }
  }
];
