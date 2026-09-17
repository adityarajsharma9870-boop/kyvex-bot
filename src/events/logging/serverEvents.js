const { EmbedBuilder, AuditLogEvent } = require('discord.js');
const logManager = require('../../utils/logManager');

module.exports = [
  // 1. Server Details Updated
  {
    name: 'guildUpdate',
    async execute(oldGuild, newGuild) {
      const changes = [];

      if (oldGuild.name !== newGuild.name) {
        changes.push(`**Name:** \`${oldGuild.name}\` ➔ \`${newGuild.name}\``);
      }
      if (oldGuild.icon !== newGuild.icon) {
        changes.push('**Server Icon:** Server icon was updated.');
      }
      if (oldGuild.banner !== newGuild.banner) {
        changes.push('**Server Banner:** Server banner was updated.');
      }
      if (oldGuild.vanityURLCode !== newGuild.vanityURLCode) {
        changes.push(`**Vanity URL:** \`${oldGuild.vanityURLCode || 'None'}\` ➔ \`${newGuild.vanityURLCode || 'None'}\``);
      }
      if (oldGuild.ownerId !== newGuild.ownerId) {
        changes.push(`**Ownership Transferred:** <@${oldGuild.ownerId}> ➔ <@${newGuild.ownerId}>`);
      }

      if (changes.length === 0) return;

      await new Promise((resolve) => setTimeout(resolve, 350));
      const gLog = await logManager.fetchAuditLog(newGuild, AuditLogEvent.GuildUpdate, null, 6000);

      const embed = new EmbedBuilder()
        .setColor('#06b6d4')
        .setAuthor({
          name: '🌐 Server Settings Modified',
          iconURL: newGuild.iconURL({ dynamic: true }) || undefined
        })
        .setThumbnail(newGuild.iconURL({ dynamic: true }) || undefined)
        .setDescription(`Server settings were updated for **${newGuild.name}**.`)
        .addFields([
          {
            name: '🛠️ Modified By (Kisne badla)',
            value: gLog ? `${gLog.executor} (\`${gLog.executor?.tag}\`)` : '*Unknown / Server Owner*',
            inline: true
          },
          { name: '📝 Modifications', value: changes.join('\n'), inline: false }
        ])
        .setFooter({ text: `Guild ID: ${newGuild.id}` })
        .setTimestamp();

      await logManager.send(newGuild, 'server', embed);
    }
  },

  // 2. Invite Created
  {
    name: 'inviteCreate',
    async execute(invite) {
      if (!invite.guild) return;

      const embed = new EmbedBuilder()
        .setColor('#22c55e')
        .setAuthor({ name: '🔗 Invite Created' })
        .setDescription(`An invite link was created for ${invite.channel}.`)
        .addFields([
          { name: '🎟️ Code', value: `\`${invite.code}\``, inline: true },
          { name: '👤 Creator (Kisne banaya)', value: `${invite.inviter ? `${invite.inviter} (\`${invite.inviter.tag}\`)` : '*System / Unknown*'}`, inline: true },
          { name: '📺 Channel', value: `${invite.channel}`, inline: true },
          { name: '⏳ Expires', value: invite.maxAge ? `<t:${Math.floor((Date.now() + invite.maxAge * 1000) / 1000)}:R>` : 'Never', inline: true },
          { name: '🔢 Max Uses', value: invite.maxUses ? `\`${invite.maxUses}\`` : 'Unlimited', inline: true }
        ])
        .setFooter({ text: 'Server Invite' })
        .setTimestamp();

      await logManager.send(invite.guild, 'server', embed);
    }
  },

  // 3. Emoji Created
  {
    name: 'emojiCreate',
    async execute(emoji) {
      if (!emoji.guild) return;

      await new Promise((resolve) => setTimeout(resolve, 350));
      const eLog = await logManager.fetchAuditLog(emoji.guild, AuditLogEvent.EmojiCreate, emoji.id, 6000);

      const embed = new EmbedBuilder()
        .setColor('#22c55e')
        .setAuthor({ name: '😀 Emoji Created' })
        .setDescription(`Emoji ${emoji} (\`:${emoji.name}:\`) has been added.`)
        .addFields([
          { name: '📛 Name', value: `\`${emoji.name}\``, inline: true },
          {
            name: '🛠️ Added By (Kisne add kiya)',
            value: eLog ? `${eLog.executor} (\`${eLog.executor?.tag}\`)` : '*Unknown / Bot*',
            inline: true
          },
          { name: '✨ Animated', value: emoji.animated ? 'Yes' : 'No', inline: true }
        ])
        .setThumbnail(emoji.url)
        .setFooter({ text: `Emoji ID: ${emoji.id}` })
        .setTimestamp();

      await logManager.send(emoji.guild, 'server', embed);
    }
  },

  // 4. Emoji Deleted
  {
    name: 'emojiDelete',
    async execute(emoji) {
      if (!emoji.guild) return;

      await new Promise((resolve) => setTimeout(resolve, 350));
      const eLog = await logManager.fetchAuditLog(emoji.guild, AuditLogEvent.EmojiDelete, emoji.id, 6000);

      const embed = new EmbedBuilder()
        .setColor('#ef4444')
        .setAuthor({ name: '🗑️ Emoji Deleted' })
        .setDescription(`Emoji \`:${emoji.name}:\` was removed from the server.`)
        .addFields([
          { name: '📛 Name', value: `\`${emoji.name}\``, inline: true },
          {
            name: '🛠️ Deleted By (Kisne delete kiya)',
            value: eLog ? `${eLog.executor} (\`${eLog.executor?.tag}\`)` : '*Unknown / Bot*',
            inline: true
          }
        ])
        .setFooter({ text: `Emoji ID: ${emoji.id}` })
        .setTimestamp();

      await logManager.send(emoji.guild, 'server', embed);
    }
  }
];
