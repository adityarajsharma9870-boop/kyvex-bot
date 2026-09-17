const { EmbedBuilder, AuditLogEvent } = require('discord.js');
const logManager = require('../../utils/logManager');

module.exports = [
  // 1. Message Deleted
  {
    name: 'messageDelete',
    async execute(message) {
      if (!message.guild || message.partial || message.author?.bot) return;

      // Small delay to allow Discord audit log entry creation if deleted by moderator
      await new Promise((resolve) => setTimeout(resolve, 350));
      const delLog = await logManager.fetchAuditLog(message.guild, AuditLogEvent.MessageDelete, message.author?.id, 5000);

      const isModDelete = Boolean(delLog && delLog.extra?.channel?.id === message.channel.id);
      const executor = isModDelete ? delLog.executor : message.author;

      const embed = new EmbedBuilder()
        .setColor('#ef4444')
        .setAuthor({
          name: '🗑️ Message Deleted',
          iconURL: message.author?.displayAvatarURL?.({ dynamic: true }) || undefined
        })
        .setDescription(
          isModDelete
            ? `Message by ${message.author} was deleted by moderator **${executor}** (\`${executor?.tag}\`) in ${message.channel}.`
            : `Message was deleted by ${message.author} in ${message.channel}.`
        )
        .addFields([
          { name: '👤 Message Author (Kiska tha)', value: `${message.author} (\`${message.author?.id}\`)`, inline: true },
          {
            name: '🛠️ Deleted By (Kisne delete kiya)',
            value: isModDelete ? `🛡️ ${executor} (\`${executor?.id}\`)` : `👤 ${message.author} *(Self-deleted)*`,
            inline: true
          },
          { name: '📺 Channel', value: `${message.channel} (\`#${message.channel.name}\`)`, inline: true }
        ])
        .setFooter({ text: `Message ID: ${message.id}` })
        .setTimestamp();

      if (message.content) {
        embed.addFields([{
          name: '📝 Deleted Content',
          value: message.content.length > 1024 ? message.content.substring(0, 1020) + '...' : message.content,
          inline: false
        }]);
      } else {
        embed.addFields([{
          name: '📝 Deleted Content',
          value: '*No text content (Embed or Media)*',
          inline: false
        }]);
      }

      if (message.attachments.size > 0) {
        const attachmentNames = message.attachments.map((a) => `[${a.name}](${a.url})`).join('\n');
        embed.addFields([{
          name: `📎 Attachments (${message.attachments.size})`,
          value: attachmentNames.length > 1024 ? attachmentNames.substring(0, 1020) + '...' : attachmentNames,
          inline: false
        }]);
      }

      await logManager.send(message.guild, 'message', embed);
    }
  },

  // 2. Message Edited
  {
    name: 'messageUpdate',
    async execute(oldMessage, newMessage) {
      if (!newMessage.guild || newMessage.author?.bot) return;
      if (oldMessage.content === newMessage.content) return; // Ignore link preview generation

      const embed = new EmbedBuilder()
        .setColor('#f59e0b')
        .setAuthor({
          name: '✏️ Message Edited',
          iconURL: newMessage.author?.displayAvatarURL?.({ dynamic: true }) || undefined
        })
        .setDescription(`A message was edited in ${newMessage.channel}. [Jump to Message](${newMessage.url})`)
        .addFields([
          { name: '👤 Author (Kisne edit kiya)', value: `${newMessage.author} (\`${newMessage.author?.id}\`)`, inline: true },
          { name: '📺 Channel', value: `${newMessage.channel}`, inline: true },
          {
            name: '⬅️ Before Edit (Pehle)',
            value: oldMessage.content ? (oldMessage.content.length > 1000 ? oldMessage.content.substring(0, 996) + '...' : oldMessage.content) : '*Unknown / Cached*',
            inline: false
          },
          {
            name: '➡️ After Edit (Abhi)',
            value: newMessage.content ? (newMessage.content.length > 1000 ? newMessage.content.substring(0, 996) + '...' : newMessage.content) : '*Empty*',
            inline: false
          }
        ])
        .setFooter({ text: `Message ID: ${newMessage.id}` })
        .setTimestamp();

      await logManager.send(newMessage.guild, 'message', embed);
    }
  },

  // 3. Bulk Messages Deleted
  {
    name: 'messageDeleteBulk',
    async execute(messages, channel) {
      if (!channel.guild) return;

      await new Promise((resolve) => setTimeout(resolve, 350));
      const purgeLog = await logManager.fetchAuditLog(channel.guild, AuditLogEvent.MessageBulkDelete, null, 6000);

      const embed = new EmbedBuilder()
        .setColor('#dc2626')
        .setAuthor({ name: '🧹 Bulk Messages Purged' })
        .setDescription(`**${messages.size} messages** were purged / mass deleted in ${channel}.`)
        .addFields([
          { name: '📺 Channel', value: `${channel} (\`#${channel.name}\`)`, inline: true },
          { name: '🔢 Message Count', value: `\`${messages.size}\``, inline: true },
          {
            name: '🛠️ Executed By (Kisne kiya)',
            value: purgeLog ? `${purgeLog.executor} (\`${purgeLog.executor?.id}\`)` : '*Bot / Moderator*',
            inline: true
          }
        ])
        .setFooter({ text: 'Bulk Purge Action' })
        .setTimestamp();

      await logManager.send(channel.guild, 'message', embed);
    }
  }
];
