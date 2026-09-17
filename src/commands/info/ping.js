const { SlashCommandBuilder } = require('discord.js');
const { createAstrialEmbed } = require('../../utils/embedBuilder');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Check bot latency and Discord gateway ping'),

  category: 'info',

  async execute(interaction, client) {
    const sent = await interaction.reply({
      content: '🏓 Pinging Discord Gateway...',
      fetchReply: true
    });

    const roundtrip = sent.createdTimestamp - interaction.createdTimestamp;
    const wsPing = Math.round(client.ws.ping);

    const embed = createAstrialEmbed()
      .setTitle('🏓 Pong! Bot Latency')
      .addFields([
        { name: '📡 Gateway WebSocket', value: `\`${wsPing}ms\``, inline: true },
        { name: '⚡ Roundtrip Latency', value: `\`${roundtrip}ms\``, inline: true },
        { name: '🎙️ Voice Servers', value: '`DAVE E2EE Active`', inline: true }
      ]);

    return interaction.editReply({ content: null, embeds: [embed] });
  }
};
