const { EmbedBuilder, ChannelType, AuditLogEvent } = require('discord.js');
const logManager = require('../../utils/logManager');

function getChannelTypeName(type) {
  switch (type) {
    case ChannelType.GuildText: return 'Text Channel';
    case ChannelType.GuildVoice: return 'Voice Channel';
    case ChannelType.GuildCategory: return 'Category';
    case ChannelType.GuildAnnouncement: return 'Announcement Channel';
    case ChannelType.GuildStageVoice: return 'Stage Channel';
    case ChannelType.GuildForum: return 'Forum Channel';
    default: return 'Channel';
  }
}

module.exports = [
  // 1. Channel Created
  {
    name: 'channelCreate',
    async execute(channel) {
      if (!channel.guild) return;

      await new Promise((resolve) => setTimeout(resolve, 350));
      const chLog = await logManager.fetchAuditLog(channel.guild, AuditLogEvent.ChannelCreate, channel.id, 6000);

      const embed = new EmbedBuilder()
        .setColor('#22c55e')
        .setAuthor({ name: '📺 Channel Created' })
        .setDescription(`Channel ${channel} was created.`)
        .addFields([
          { name: '📺 Channel (Kisko banaya)', value: `${channel} (\`#${channel.name}\`)`, inline: true },
          {
            name: '🛠️ Created By (Kisne banaya)',
            value: chLog ? `${chLog.executor} (\`${chLog.executor?.tag}\`)` : '*Unknown / Bot*',
            inline: true
          },
          { name: '📑 Type', value: `\`${getChannelTypeName(channel.type)}\``, inline: true },
          { name: '📁 Category', value: channel.parent ? `\`${channel.parent.name}\`` : '*None*', inline: true }
        ])
        .setFooter({ text: `Channel ID: ${channel.id}` })
        .setTimestamp();

      if (chLog?.reason) {
        embed.addFields([{ name: '📝 Reason', value: chLog.reason, inline: false }]);
      }

      await logManager.send(channel.guild, 'channel', embed);
    }
  },

  // 2. Channel Deleted
  {
    name: 'channelDelete',
    async execute(channel) {
      if (!channel.guild) return;

      await new Promise((resolve) => setTimeout(resolve, 350));
      const chLog = await logManager.fetchAuditLog(channel.guild, AuditLogEvent.ChannelDelete, channel.id, 6000);

      const embed = new EmbedBuilder()
        .setColor('#ef4444')
        .setAuthor({ name: '🗑️ Channel Deleted' })
        .setDescription(`Channel **#${channel.name}** was deleted from the server.`)
        .addFields([
          { name: '📺 Channel (Kisko delete kiya)', value: `\`#${channel.name}\` (\`${channel.id}\`)`, inline: true },
          {
            name: '🛠️ Deleted By (Kisne delete kiya)',
            value: chLog ? `${chLog.executor} (\`${chLog.executor?.tag}\`)` : '*Unknown / Bot*',
            inline: true
          },
          { name: '📁 Category', value: channel.parent ? `\`${channel.parent.name}\`` : '*None*', inline: true }
        ])
        .setFooter({ text: `Channel ID: ${channel.id}` })
        .setTimestamp();

      if (chLog?.reason) {
        embed.addFields([{ name: '📝 Reason', value: chLog.reason, inline: false }]);
      }

      await logManager.send(channel.guild, 'channel', embed);
    }
  },

  // 3. Channel Settings Updated
  {
    name: 'channelUpdate',
    async execute(oldChannel, newChannel) {
      if (!newChannel.guild) return;

      const changes = [];

      if (oldChannel.name !== newChannel.name) {
        changes.push(`**Name:** \`#${oldChannel.name}\` ➔ \`#${newChannel.name}\``);
      }
      if (oldChannel.topic !== newChannel.topic) {
        changes.push(`**Topic Updated:** ${newChannel.topic || '*Cleared*'}`);
      }
      if (oldChannel.rateLimitPerUser !== newChannel.rateLimitPerUser) {
        changes.push(`**Slowmode:** \`${oldChannel.rateLimitPerUser}s\` ➔ \`${newChannel.rateLimitPerUser}s\``);
      }
      if (oldChannel.parentId !== newChannel.parentId) {
        changes.push(`**Category:** \`${oldChannel.parent?.name || 'None'}\` ➔ \`${newChannel.parent?.name || 'None'}\``);
      }

      if (changes.length === 0) return;

      await new Promise((resolve) => setTimeout(resolve, 350));
      const chLog = await logManager.fetchAuditLog(newChannel.guild, AuditLogEvent.ChannelUpdate, newChannel.id, 6000);

      const embed = new EmbedBuilder()
        .setColor('#eab308')
        .setAuthor({ name: '⚙️ Channel Settings Updated' })
        .setDescription(`Settings modified for ${newChannel} (\`#${newChannel.name}\`).`)
        .addFields([
          { name: '📺 Channel (Kisko kiya)', value: `${newChannel} (\`#${newChannel.name}\`)`, inline: true },
          {
            name: '🛠️ Modified By (Kisne kiya)',
            value: chLog ? `${chLog.executor} (\`${chLog.executor?.tag}\`)` : '*Unknown / Bot*',
            inline: true
          },
          { name: '📝 Modifications', value: changes.join('\n'), inline: false }
        ])
        .setFooter({ text: `Channel ID: ${newChannel.id}` })
        .setTimestamp();

      if (chLog?.reason) {
        embed.addFields([{ name: '📝 Reason', value: chLog.reason, inline: false }]);
      }

      await logManager.send(newChannel.guild, 'channel', embed);
    }
  }
];
