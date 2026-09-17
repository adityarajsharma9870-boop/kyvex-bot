const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createSuccessEmbed, createErrorEmbed } = require('../../utils/embedBuilder');
const securityManager = require('../../utils/securityManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Ban a member from the server')
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addUserOption((opt) => opt.setName('user').setDescription('Member to ban').setRequired(true))
    .addStringOption((opt) => opt.setName('reason').setDescription('Reason for the ban')),

  category: 'moderation',

  async execute(interaction, client) {
    if (!securityManager.protectCommand(interaction, 'MODERATOR')) return;

    const targetUser = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    if (targetUser.id === interaction.guild.ownerId) {
      return interaction.reply({
        embeds: [createErrorEmbed('Action Denied', 'You cannot ban the Server Owner.')],
        ephemeral: true
      });
    }

    const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
    if (targetMember) {
      if (targetMember.roles.highest.position >= interaction.guild.members.me.roles.highest.position) {
        return interaction.reply({
          embeds: [createErrorEmbed('Hierarchy Error', 'My highest role is lower than or equal to this user’s highest role.')],
          ephemeral: true
        });
      }
    }

    try {
      await interaction.guild.bans.create(targetUser.id, {
        reason: `${reason} | Banned by ${interaction.user.tag}`
      });

      const logManager = require('../../utils/logManager');
      await logManager.logModAction(interaction.guild, {
        action: 'BAN',
        target: targetUser,
        moderator: interaction.user,
        reason
      });

      return interaction.reply({
        embeds: [
          createSuccessEmbed(
            'Member Banned',
            `🔨 Successfully banned **${targetUser.tag}** (\`${targetUser.id}\`)\n**Reason:** ${reason}`
          )
        ]
      });
    } catch (err) {
      return interaction.reply({
        embeds: [createErrorEmbed('Ban Failed', err.message || 'Could not ban user.')],
        ephemeral: true
      });
    }
  }
};
