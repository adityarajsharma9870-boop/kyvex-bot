const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createSuccessEmbed, createErrorEmbed } = require('../../utils/embedBuilder');
const securityManager = require('../../utils/securityManager');
const logManager = require('../../utils/logManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Bulk delete messages from the channel with optional user filter')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addIntegerOption((opt) =>
      opt
        .setName('amount')
        .setDescription('Number of messages to delete (1 - 100)')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(100)
    )
    .addUserOption((opt) => opt.setName('user').setDescription('Filter messages to only delete from this user')),

  category: 'moderation',

  async execute(interaction, client) {
    if (!securityManager.protectCommand(interaction, 'MODERATOR')) return;

    const amount = interaction.options.getInteger('amount');
    const filterUser = interaction.options.getUser('user');

    await interaction.deferReply({ ephemeral: true });

    try {
      let messagesToDelete;
      if (filterUser) {
        const fetched = await interaction.channel.messages.fetch({ limit: 100 });
        const userMessages = fetched.filter((m) => m.author.id === filterUser.id);
        messagesToDelete = Array.from(userMessages.values()).slice(0, amount);
      } else {
        messagesToDelete = amount;
      }

      const deleted = await interaction.channel.bulkDelete(messagesToDelete, true);

      // Log moderation action
      await logManager.logModAction(interaction.guild, {
        action: 'CLEAR_MESSAGES',
        target: interaction.channel.name,
        moderator: interaction.user,
        reason: filterUser ? `Cleared messages from ${filterUser.tag}` : `Cleared ${deleted.size} messages`,
        details: `Deleted ${deleted.size} messages in #${interaction.channel.name}`
      });

      return interaction.editReply({
        embeds: [
          createSuccessEmbed(
            'Messages Cleared',
            `🧹 Successfully deleted **${deleted.size}** message(s) from ${interaction.channel}!` +
            (filterUser ? `\n• **Filtered by User:** <@${filterUser.id}> (\`${filterUser.tag}\`)` : '') +
            `\n*(Note: Messages older than 14 days cannot be bulk deleted by Discord)*`
          )
        ]
      });
    } catch (err) {
      return interaction.editReply({
        embeds: [createErrorEmbed('Clear Failed', err.message || 'Could not delete messages.')]
      });
    }
  }
};
