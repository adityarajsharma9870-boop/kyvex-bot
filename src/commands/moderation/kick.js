const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createSuccessEmbed, createErrorEmbed } = require('../../utils/embedBuilder');
const securityManager = require('../../utils/securityManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Kick a member from the server')
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    .addUserOption((opt) => opt.setName('user').setDescription('Member to kick').setRequired(true))
    .addStringOption((opt) => opt.setName('reason').setDescription('Reason for the kick')),

  category: 'moderation',

  async execute(interaction, client) {
    if (!securityManager.protectCommand(interaction, 'MODERATOR')) return;

    const targetUser = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    if (targetUser.id === interaction.guild.ownerId) {
      return interaction.reply({
        embeds: [createErrorEmbed('Action Denied', 'You cannot kick the Server Owner.')],
        ephemeral: true
      });
    }

    const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
    if (!targetMember) {
      return interaction.reply({
        embeds: [createErrorEmbed('Member Not Found', 'This user is not currently in this server.')],
        ephemeral: true
      });
    }

    if (targetMember.roles.highest.position >= interaction.guild.members.me.roles.highest.position) {
      return interaction.reply({
        embeds: [createErrorEmbed('Hierarchy Error', 'My highest role is lower than or equal to this user’s highest role.')],
        ephemeral: true
      });
    }

    try {
      await targetMember.kick(`${reason} | Kicked by ${interaction.user.tag}`);

      const logManager = require('../../utils/logManager');
      await logManager.logModAction(interaction.guild, {
        action: 'KICK',
        target: targetUser,
        moderator: interaction.user,
        reason
      });

      return interaction.reply({
        embeds: [
          createSuccessEmbed(
            'Member Kicked',
            `👢 Successfully kicked **${targetUser.tag}** (\`${targetUser.id}\`)\n**Reason:** ${reason}`
          )
        ]
      });
    } catch (err) {
      return interaction.reply({
        embeds: [createErrorEmbed('Kick Failed', err.message || 'Could not kick user.')],
        ephemeral: true
      });
    }
  }
};
