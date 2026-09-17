const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { createSuccessEmbed, createErrorEmbed } = require('../../utils/embedBuilder');
const securityManager = require('../../utils/securityManager');
const warningManager = require('../../utils/warningManager');
const logManager = require('../../utils/logManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Issue a formal warning to a server member')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((opt) => opt.setName('user').setDescription('Member to warn').setRequired(true))
    .addStringOption((opt) => opt.setName('reason').setDescription('Reason for the warning').setRequired(true)),

  category: 'moderation',

  async execute(interaction, client) {
    if (!securityManager.protectCommand(interaction, 'MODERATOR')) return;

    const targetUser = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason');

    if (targetUser.id === interaction.guild.ownerId) {
      return interaction.reply({
        embeds: [createErrorEmbed('Action Denied', 'You cannot warn the Server Owner.')],
        ephemeral: true
      });
    }

    if (targetUser.id === interaction.user.id) {
      return interaction.reply({
        embeds: [createErrorEmbed('Action Denied', 'You cannot warn yourself.')],
        ephemeral: true
      });
    }

    const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
    if (targetMember) {
      if (targetMember.roles.highest.position >= interaction.member.roles.highest.position && interaction.user.id !== interaction.guild.ownerId) {
        return interaction.reply({
          embeds: [createErrorEmbed('Hierarchy Error', 'You cannot warn a member with a role equal to or higher than yours.')],
          ephemeral: true
        });
      }
    }

    // 1. Add warning to persistent storage
    const { warning, totalWarnings } = warningManager.addWarning(
      interaction.guild.id,
      targetUser.id,
      interaction.user.id,
      reason,
      'Manual Moderator Warning'
    );

    // 2. Check progressive punishment
    const punishment = warningManager.resolveProgressivePunishment(totalWarnings);
    let punishmentDetails = `Strike #${totalWarnings} recorded`;

    if (targetMember && targetMember.manageable) {
      try {
        if (punishment.type === 'timeout' && punishment.durationMs > 0) {
          await targetMember.timeout(punishment.durationMs, `[OG EMPIRE] Exceeded strike threshold (${totalWarnings} warnings)`);
          punishmentDetails += ` • Escalated to ${punishment.label}`;
        } else if (punishment.type === 'kick') {
          await targetMember.kick(`[OG EMPIRE] Exceeded strike threshold (${totalWarnings} warnings)`);
          punishmentDetails += ` • Escalated to ${punishment.label}`;
        } else if (punishment.type === 'ban') {
          await targetMember.ban({ reason: `[OG EMPIRE] Exceeded strike threshold (${totalWarnings} warnings)` });
          punishmentDetails += ` • Escalated to ${punishment.label}`;
        }
      } catch (e) {
        punishmentDetails += ` • (Escalation failed: ${e.message})`;
      }
    }

    // 3. DM user
    try {
      await targetUser.send({
        embeds: [
          new EmbedBuilder()
            .setColor('#f59e0b')
            .setTitle(`⚠️ Warning Received • [${interaction.guild.name}]`)
            .setDescription(
              `You received a formal warning from moderator **${interaction.user.tag}**.\n\n` +
              `• **Reason:** \`${reason}\`\n` +
              `• **Your Total Warnings:** \`${totalWarnings}\`\n` +
              `• **Action / Escalation:** \`${punishmentDetails}\``
            )
            .setTimestamp()
        ]
      }).catch(() => {});
    } catch (e) {}

    // 4. Log moderation action
    await logManager.logModAction(interaction.guild, {
      action: 'WARN',
      target: targetUser,
      moderator: interaction.user,
      reason,
      details: punishmentDetails
    });

    return interaction.reply({
      embeds: [
        createSuccessEmbed(
          'Member Warned',
          `⚠️ Successfully warned **${targetUser.tag}** (\`${targetUser.id}\`)\n` +
          `• **Reason:** ${reason}\n` +
          `• **Total Warnings:** \`${totalWarnings}\`\n` +
          `• **Status:** ${punishmentDetails}`
        )
      ]
    });
  }
};
