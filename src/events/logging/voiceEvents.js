const { EmbedBuilder } = require('discord.js');
const logManager = require('../../utils/logManager');

module.exports = [
  {
    name: 'voiceStateUpdate',
    async execute(oldState, newState) {
      const guild = newState.guild || oldState.guild;
      if (!guild) return;

      const member = newState.member || oldState.member;
      if (!member || member.user.bot) return;

      // 1. Joined Voice Channel
      if (!oldState.channelId && newState.channelId) {
        const embed = new EmbedBuilder()
          .setColor('#22c55e')
          .setAuthor({
            name: '🔊 Voice Channel Joined',
            iconURL: member.user.displayAvatarURL({ dynamic: true })
          })
          .setDescription(`${member} (\`${member.user.tag}\`) joined voice channel **${newState.channel.name}**.`)
          .addFields([
            { name: '👤 Member', value: `${member.user.tag} (\`${member.id}\`)`, inline: true },
            { name: '🔊 Channel', value: `${newState.channel} (\`#${newState.channel.name}\`)`, inline: true }
          ])
          .setFooter({ text: 'Voice Connection' })
          .setTimestamp();

        return logManager.send(guild, 'voice', embed);
      }

      // 2. Left Voice Channel
      if (oldState.channelId && !newState.channelId) {
        const embed = new EmbedBuilder()
          .setColor('#ef4444')
          .setAuthor({
            name: '🔇 Voice Channel Left',
            iconURL: member.user.displayAvatarURL({ dynamic: true })
          })
          .setDescription(`${member} (\`${member.user.tag}\`) disconnected from voice channel **${oldState.channel.name}**.`)
          .addFields([
            { name: '👤 Member', value: `${member.user.tag} (\`${member.id}\`)`, inline: true },
            { name: '🔇 Channel', value: `\`#${oldState.channel.name}\``, inline: true }
          ])
          .setFooter({ text: 'Voice Disconnect' })
          .setTimestamp();

        return logManager.send(guild, 'voice', embed);
      }

      // 3. Switched Voice Channel
      if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
        const embed = new EmbedBuilder()
          .setColor('#8b5cf6')
          .setAuthor({
            name: '🔄 Voice Channel Switched',
            iconURL: member.user.displayAvatarURL({ dynamic: true })
          })
          .setDescription(`${member} switched voice channels.`)
          .addFields([
            { name: '👤 Member', value: `${member.user.tag} (\`${member.id}\`)`, inline: true },
            { name: '⬅️ From Channel', value: `\`#${oldState.channel.name}\``, inline: true },
            { name: '➡️ To Channel', value: `${newState.channel} (\`#${newState.channel.name}\`)`, inline: true }
          ])
          .setFooter({ text: 'Voice Channel Switch' })
          .setTimestamp();

        return logManager.send(guild, 'voice', embed);
      }

      // 4. Server Mute / Deafen Changes
      if (oldState.serverMute !== newState.serverMute) {
        const embed = new EmbedBuilder()
          .setColor(newState.serverMute ? '#dc2626' : '#22c55e')
          .setAuthor({
            name: newState.serverMute ? '🎙️ Server Muted' : '🎙️ Server Unmuted',
            iconURL: member.user.displayAvatarURL({ dynamic: true })
          })
          .setDescription(`${member} was ${newState.serverMute ? '**Server Muted**' : '**Server Unmuted**'} in **${newState.channel?.name || 'Voice'}**.`)
          .setFooter({ text: `User ID: ${member.id}` })
          .setTimestamp();

        return logManager.send(guild, 'voice', embed);
      }
    }
  }
];
