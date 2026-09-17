const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createSuccessEmbed, createErrorEmbed } = require('../../utils/embedBuilder');
const securityManager = require('../../utils/securityManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('untimeout')
    .setDescription('Remove timeout from a member')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((opt) => opt.setName('user').setDescription('Member to untimeout').setRequired(true))
    .addStringOption((opt) => opt.setName('reason').setDescription('Reason')),

  category: 'moderation',

  async execute(interaction, client) {
    if (!securityManager.protectCommand(interaction, 'MODERATOR')) return;

    const targetUser = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
    if (!targetMember) {
      return interaction.reply({
        embeds: [createErrorEmbed('Member Not Found', 'This user is not in this server.')],
        ephemeral: true
      });
    }

    try {
      await targetMember.timeout(null, `${reason} | Timeout removed by ${interaction.user.tag}`);
      return interaction.reply({
        embeds: [
          createSuccessEmbed(
            'Timeout Removed',
            `🔊 Successfully removed timeout from **${targetUser.tag}**.\n**Reason:** ${reason}`
          )
        ]
      });
    } catch (err) {
      return interaction.reply({
        embeds: [createErrorEmbed('Untimeout Failed', err.message || 'Could not remove timeout.')],
        ephemeral: true
      });
    }
  }
};
