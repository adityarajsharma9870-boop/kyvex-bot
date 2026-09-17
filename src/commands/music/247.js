const { SlashCommandBuilder } = require('discord.js');
const { createErrorEmbed, createSuccessEmbed } = require('../../utils/embedBuilder');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('247')
    .setDescription('Toggle 24/7 mode to keep the bot in the voice channel permanently'),

  category: 'music',

  async execute(interaction, client) {
    const voiceChannel = interaction.member.voice.channel;
    if (!voiceChannel) {
      return interaction.reply({
        embeds: [createErrorEmbed('Voice Channel Required', 'You must be in a voice channel to toggle 24/7 mode.')],
        ephemeral: true
      });
    }

    if (!client.stayInVoice) {
      client.stayInVoice = {};
    }

    const currentStatus = !!client.stayInVoice[interaction.guildId];
    const newStatus = !currentStatus;
    client.stayInVoice[interaction.guildId] = newStatus;

    if (newStatus && !interaction.guild.members.me.voice.channel) {
      await client.distube.voices.join(voiceChannel);
    }

    return interaction.reply({
      embeds: [
        createSuccessEmbed(
          '24/7 Mode Updated',
          `🌐 24/7 Voice Channel Stay is now: **${newStatus ? 'ENABLED' : 'DISABLED'}**!\n` +
          `${newStatus ? 'The bot will permanently stay in the voice channel even when idle.' : 'The bot will disconnect after remaining idle.'}`
        )
      ]
    });
  }
};
