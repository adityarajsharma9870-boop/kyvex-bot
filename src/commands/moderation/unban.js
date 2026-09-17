const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createSuccessEmbed, createErrorEmbed } = require('../../utils/embedBuilder');
const securityManager = require('../../utils/securityManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unban')
    .setDescription('Unban a user by their User ID')
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addStringOption((opt) =>
      opt.setName('userid').setDescription('Discord User ID to unban').setRequired(true)
    )
    .addStringOption((opt) => opt.setName('reason').setDescription('Reason for unbanning')),

  category: 'moderation',

  async execute(interaction, client) {
    if (!securityManager.protectCommand(interaction, 'MODERATOR')) return;

    const userId = interaction.options.getString('userid').trim();
    const reason = interaction.options.getString('reason') || 'No reason provided';

    try {
      await interaction.guild.bans.remove(userId, `${reason} | Unbanned by ${interaction.user.tag}`);

      const logManager = require('../../utils/logManager');
      await logManager.logModAction(interaction.guild, {
        action: 'UNBAN',
        target: userId,
        moderator: interaction.user,
        reason
      });

      return interaction.reply({
        embeds: [
          createSuccessEmbed(
            'User Unbanned',
            `🔓 Successfully unbanned user ID: \`${userId}\`\n**Reason:** ${reason}`
          )
        ]
      });
    } catch (err) {
      return interaction.reply({
        embeds: [createErrorEmbed('Unban Failed', err.message || 'Could not unban user. Make sure the ID is currently banned.')],
        ephemeral: true
      });
    }
  }
};
