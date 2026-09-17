const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');
const { createAstrialEmbed } = require('../../utils/embedBuilder');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('invite')
    .setDescription('Add this bot to another Discord server with full permissions'),

  category: 'info',

  async execute(interaction, client) {
    const botName = client.user.username || 'Kyvex';
    const clientId = client.user.id || config.clientId;
    const inviteUrl = `https://discord.com/oauth2/authorize?client_id=${clientId}&permissions=8&scope=bot%20applications.commands`;
    const dashboardUrl = config.dashboardUrl || 'http://localhost:3000';

    const embed = createAstrialEmbed()
      .setAuthor({
        name: `${botName} • Bot Invitation`,
        iconURL: client.user.displayAvatarURL({ dynamic: true })
      })
      .setTitle(`➕ Add ${botName} To Your Server`)
      .setDescription(
        `Click the buttons below to invite **${botName}** to your Discord server or open the Web Management Dashboard.\n\n` +
        `🛡️ **Permissions Included:**\n` +
        `• **Administrator (All Features)**\n` +
        `• **Slash Commands (/commands)**\n` +
        `• **Ticket Systems & Anti-Nuke Shield**\n` +
        `• **High-Definition 24/7 Music Audio**\n\n` +
        `*Make sure you have "Manage Server" permissions in the server you wish to add the bot to.*`
      )
      .setColor('#ff2449')
      .setFooter({
        text: `${botName} • Next-Gen Discord Bot`,
        iconURL: client.user.displayAvatarURL({ dynamic: true })
      });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel(`Add ${botName} To Server`)
        .setStyle(ButtonStyle.Link)
        .setURL(inviteUrl)
        .setEmoji('🔗'),
      new ButtonBuilder()
        .setLabel('Web Dashboard')
        .setStyle(ButtonStyle.Link)
        .setURL(dashboardUrl)
        .setEmoji('🌐')
    );

    await interaction.reply({
      embeds: [embed],
      components: [row]
    });
  }
};
