const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { createSuccessEmbed, createErrorEmbed } = require('../../utils/embedBuilder');
const securityManager = require('../../utils/securityManager');
const warningManager = require('../../utils/warningManager');
const logManager = require('../../utils/logManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warnings')
    .setDescription('View or clear warnings for a server member')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((opt) => opt.setName('user').setDescription('Target member').setRequired(true))
    .addStringOption((opt) =>
      opt
        .setName('action')
        .setDescription('Action to take (view or clear)')
        .addChoices(
          { name: 'View Warnings History', value: 'view' },
          { name: 'Clear All Warnings', value: 'clear' }
        )
    ),

  category: 'moderation',

  async execute(interaction, client) {
    if (!securityManager.protectCommand(interaction, 'MODERATOR')) return;

    const targetUser = interaction.options.getUser('user');
    const action = interaction.options.getString('action') || 'view';

    const warnings = warningManager.getWarnings(interaction.guild.id, targetUser.id);

    if (action === 'clear') {
      const removed = warningManager.clearWarnings(interaction.guild.id, targetUser.id);

      await logManager.logModAction(interaction.guild, {
        action: 'CLEAR_WARNINGS',
        target: targetUser,
        moderator: interaction.user,
        reason: `Cleared ${removed} warnings`
      });

      return interaction.reply({
        embeds: [
          createSuccessEmbed(
            'Warnings Cleared',
            `🧹 Successfully cleared **${removed}** warning(s) for **${targetUser.tag}** (\`${targetUser.id}\`).`
          )
        ]
      });
    }

    // Action === 'view'
    if (warnings.length === 0) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#10b981')
            .setTitle(`📜 Warnings • ${targetUser.tag}`)
            .setDescription(`✅ **${targetUser.tag}** has a completely clean record with **0 warnings**.`)
            .setFooter({ text: 'OG EMPIRE Security Matrix' })
            .setTimestamp()
        ],
        ephemeral: true
      });
    }

    const embed = new EmbedBuilder()
      .setColor('#f59e0b')
      .setTitle(`📜 Warning Record • ${targetUser.tag} (${warnings.length} Strikes)`)
      .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
      .setDescription(
        warnings
          .slice(0, 15)
          .map((w, idx) => {
            const dateStr = `<t:${Math.floor(w.timestamp / 1000)}:R>`;
            return `**${idx + 1}. [${w.id}]** • ${dateStr}\n` +
                   `• **Reason:** \`${w.reason}\`\n` +
                   `• **Mod:** <@${w.moderatorId}> | **Action:** \`${w.actionTaken}\``;
          })
          .join('\n\n')
      )
      .setFooter({ text: `Total Active Warnings: ${warnings.length}` })
      .setTimestamp();

    return interaction.reply({
      embeds: [embed],
      ephemeral: true
    });
  }
};
