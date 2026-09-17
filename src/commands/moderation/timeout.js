const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createSuccessEmbed, createErrorEmbed } = require('../../utils/embedBuilder');
const securityManager = require('../../utils/securityManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('timeout')
    .setDescription('Timeout (mute) a member in the server')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((opt) => opt.setName('user').setDescription('Member to timeout').setRequired(true))
    .addIntegerOption((opt) =>
      opt
        .setName('minutes')
        .setDescription('Kitne minute ka timeout dena hai (e.g. 5, 10, 15, 30, 60, 120)')
        .setRequired(false)
        .setMinValue(1)
        .setMaxValue(40320)
    )
    .addStringOption((opt) =>
      opt
        .setName('duration')
        .setDescription('Quick duration presets')
        .setRequired(false)
        .addChoices(
          { name: '1 Minute', value: '60' },
          { name: '5 Minutes', value: '300' },
          { name: '10 Minutes', value: '600' },
          { name: '15 Minutes', value: '900' },
          { name: '30 Minutes', value: '1800' },
          { name: '1 Hour (60 Min)', value: '3600' },
          { name: '6 Hours (360 Min)', value: '21600' },
          { name: '1 Day (24 Hours)', value: '86400' },
          { name: '1 Week (7 Days)', value: '604800' }
        )
    )
    .addStringOption((opt) => opt.setName('reason').setDescription('Reason for timeout')),

  category: 'moderation',

  async execute(interaction, client) {
    if (!securityManager.protectCommand(interaction, 'MODERATOR')) return;

    const targetUser = interaction.options.getUser('user');
    const minutesOpt = interaction.options.getInteger('minutes');
    const durationOpt = interaction.options.getString('duration');

    let seconds = 300; // Default 5 minutes if not specified
    if (minutesOpt) {
      seconds = minutesOpt * 60;
    } else if (durationOpt) {
      seconds = parseInt(durationOpt, 10);
    }

    const reason = interaction.options.getString('reason') || 'No reason provided';

    if (targetUser.id === interaction.guild.ownerId) {
      return interaction.reply({
        embeds: [createErrorEmbed('Action Denied', 'You cannot timeout the Server Owner.')],
        ephemeral: true
      });
    }

    const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
    if (!targetMember) {
      return interaction.reply({
        embeds: [createErrorEmbed('Member Not Found', 'This user is not in this server.')],
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
      await targetMember.timeout(seconds * 1000, `${reason} | Timed out by ${interaction.user.tag}`);

      const logManager = require('../../utils/logManager');
      await logManager.logModAction(interaction.guild, {
        action: 'TIMEOUT',
        target: targetUser,
        moderator: interaction.user,
        duration: `${seconds >= 3600 ? seconds / 3600 + ' hour(s)' : seconds / 60 + ' minute(s)'}`,
        reason
      });

      return interaction.reply({
        embeds: [
          createSuccessEmbed(
            'Member Timed Out',
            `🔇 Successfully timed out **${targetUser.tag}** for **${seconds >= 3600 ? seconds / 3600 + ' hour(s)' : seconds / 60 + ' minute(s)'}**.\n**Reason:** ${reason}`
          )
        ]
      });
    } catch (err) {
      return interaction.reply({
        embeds: [createErrorEmbed('Timeout Failed', err.message || 'Could not timeout user.')],
        ephemeral: true
      });
    }
  }
};
