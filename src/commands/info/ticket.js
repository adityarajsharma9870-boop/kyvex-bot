const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const ticketManager = require('../../utils/ticketManager');
const { createSuccessEmbed, createErrorEmbed } = require('../../utils/embedBuilder');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('Discord Ticket System configuration & controls')
    .addSubcommand((sub) =>
      sub
        .setName('send')
        .setDescription('Send the OG Regedit 4-dropdown ticket panel to a channel')
        .addChannelOption((opt) =>
          opt
            .setName('channel')
            .setDescription('Target text channel where ticket panel will be sent')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
        .addStringOption((opt) =>
          opt.setName('title').setDescription('Panel title (Default: OG REGEDIT)').setRequired(false)
        )
        .addStringOption((opt) =>
          opt.setName('description').setDescription('Panel description text').setRequired(false)
        )
        .addStringOption((opt) =>
          opt.setName('banner').setDescription('Direct image URL for banner').setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub.setName('close').setDescription('Close the current ticket channel')
    )
    .addSubcommand((sub) =>
      sub.setName('claim').setDescription('Claim the current ticket channel as support staff')
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  category: 'info',

  async execute(interaction, client) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'send') {
      await interaction.deferReply({ ephemeral: true });

      const targetChannel = interaction.options.getChannel('channel');
      const title = interaction.options.getString('title') || 'OG REGEDIT';
      const description = interaction.options.getString('description') || null;
      const bannerUrl = interaction.options.getString('banner') || null;

      try {
        await ticketManager.sendTicketPanel(interaction.guild, targetChannel.id, {
          title,
          description,
          bannerUrl
        });

        return interaction.editReply({
          embeds: [
            createSuccessEmbed(
              'Ticket Panel Sent',
              `✅ **OG REGEDIT Ticket Panel** with 4 interactive dropdowns has been sent to ${targetChannel}!`
            )
          ]
        });
      } catch (err) {
        return interaction.editReply({
          embeds: [createErrorEmbed('Failed to Send Panel', err.message)]
        });
      }
    }

    if (sub === 'close') {
      const data = ticketManager.getData();
      const ticketInfo = data.activeTickets[interaction.channelId];

      if (!ticketInfo) {
        return interaction.reply({
          content: '❌ Yeh channel koi active ticket channel nahi hai.',
          ephemeral: true
        });
      }

      await interaction.reply({ content: '🔒 Closing ticket...' });
      await interaction.channel.permissionOverwrites.edit(ticketInfo.userId, {
        SendMessages: false
      }).catch(() => {});

      ticketInfo.closed = true;
      ticketInfo.closedBy = interaction.user.tag;
      ticketInfo.closedAt = new Date().toISOString();
      const fs = require('fs');
      const path = require('path');
      fs.writeFileSync(path.join(__dirname, '..', '..', '..', 'data', 'tickets.json'), JSON.stringify(data, null, 2));

      return interaction.followUp({
        embeds: [
          createSuccessEmbed(
            'Ticket Closed',
            `Ticket has been closed by ${interaction.user}. Chat permissions have been revoked.`
          )
        ]
      });
    }

    if (sub === 'claim') {
      const data = ticketManager.getData();
      const ticketInfo = data.activeTickets[interaction.channelId];

      if (!ticketInfo) {
        return interaction.reply({
          content: '❌ Yeh channel koi active ticket channel nahi hai.',
          ephemeral: true
        });
      }

      if (ticketInfo.claimedBy) {
        return interaction.reply({
          content: `⚠️ Yeh ticket pehle se **${ticketInfo.claimedBy}** dwara claim kiya gaya hai!`,
          ephemeral: true
        });
      }

      ticketInfo.claimedBy = interaction.user.tag;
      const fs = require('fs');
      const path = require('path');
      fs.writeFileSync(path.join(__dirname, '..', '..', '..', 'data', 'tickets.json'), JSON.stringify(data, null, 2));

      return interaction.reply({
        embeds: [
          createSuccessEmbed(
            'Ticket Claimed',
            `**${interaction.user}** has claimed this ticket and will be your support agent!`
          )
        ]
      });
    }
  }
};
