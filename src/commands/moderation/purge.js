const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createSuccessEmbed, createErrorEmbed } = require('../../utils/embedBuilder');
const securityManager = require('../../utils/securityManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('purge')
    .setDescription('Bulk delete messages from the channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addIntegerOption((opt) =>
      opt
        .setName('amount')
        .setDescription('Number of messages to delete (1 - 100)')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(100)
    ),

  category: 'moderation',

  async execute(interaction, client) {
    const isWhitelisted = securityManager.isWhitelisted(interaction.guild, interaction.user.id);
    if (!isWhitelisted) {
      return interaction.reply({
        embeds: [
          createErrorEmbed(
            'Administrator Whitelist Required',
            '⛔ Aapke paas chahe **Administrator** role ho, lekin jab tak **Server Owner** aapko `/adminwhitelist add` se whitelist nahi karega, tab tak aap moderation commands use nahi kar sakte!'
          )
        ],
        ephemeral: true
      });
    }

    const amount = interaction.options.getInteger('amount');
    await interaction.deferReply({ ephemeral: true });

    try {
      const deleted = await interaction.channel.bulkDelete(amount, true);
      return interaction.editReply({
        embeds: [
          createSuccessEmbed(
            'Messages Purged',
            `🧹 Successfully deleted **${deleted.size}** messages from this channel!\n*(Note: Messages older than 14 days cannot be bulk deleted by Discord)*`
          )
        ]
      });
    } catch (err) {
      return interaction.editReply({
        embeds: [createErrorEmbed('Purge Failed', err.message || 'Could not delete messages.')]
      });
    }
  }
};
