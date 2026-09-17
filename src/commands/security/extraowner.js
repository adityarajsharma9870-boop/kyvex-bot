const { SlashCommandBuilder } = require('discord.js');
const securityManager = require('../../utils/securityManager');
const { createAstrialEmbed, createSuccessEmbed, createErrorEmbed } = require('../../utils/embedBuilder');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('extraowner')
    .setDescription('Manage trusted Extra Owners authorized to control Anti-Nuke and bot security')
    .addSubcommand((sub) =>
      sub
        .setName('add')
        .setDescription('Designate a trusted user as an Extra Owner (Server Owner Only)')
        .addUserOption((opt) =>
          opt.setName('user').setDescription('User to appoint as Extra Owner').setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('remove')
        .setDescription('Remove Extra Owner status from a user (Server Owner Only)')
        .addUserOption((opt) =>
          opt.setName('user').setDescription('User to demote from Extra Owner').setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub.setName('list').setDescription('View all appointed Extra Owners')
    ),

  category: 'security',

  async execute(interaction, client) {
    const sub = interaction.options.getSubcommand();
    const config = securityManager.getConfig(interaction.guildId);

    // List subcommand is viewable by all
    if (sub === 'list') {
      const extraOwners = config.extraOwners || [];
      const list = extraOwners.length > 0
        ? extraOwners.map((id, idx) => `\`${idx + 1}.\` <@${id}> (\`${id}\`)`).join('\n')
        : '*No Extra Owners appointed yet.*';

      const embed = createAstrialEmbed()
        .setTitle('👑 Kyvex • Extra Owner Management')
        .setDescription(
          `**Server Owner:** <@${interaction.guild.ownerId}>\n\n` +
          `__**Appointed Extra Owners:**__\n${list}\n\n` +
          `ℹ️ **Privileges:** Extra Owners have full authority to toggle Anti-Nuke, manage whitelists, trigger emergency lockouts, and modify Web Dashboard security controls.`
        );

      return interaction.reply({ embeds: [embed] });
    }

    // Only Server Owner can add or remove Extra Owners!
    if (interaction.user.id !== interaction.guild.ownerId) {
      return interaction.reply({
        embeds: [
          createErrorEmbed(
            'Server Owner Only',
            '⛔ Sirf **Server Owner** hi Extra Owners ko appoint ya remove kar sakta hai!'
          )
        ],
        ephemeral: true
      });
    }

    const targetUser = interaction.options.getUser('user');

    if (sub === 'add') {
      if (targetUser.id === interaction.guild.ownerId) {
        return interaction.reply({
          embeds: [createErrorEmbed('Already Owner', 'Aap already Server Owner hain!')],
          ephemeral: true
        });
      }

      if (targetUser.bot) {
        return interaction.reply({
          embeds: [createErrorEmbed('Invalid Target', 'Bots cannot be appointed as Extra Owners.')],
          ephemeral: true
        });
      }

      if ((config.extraOwners || []).includes(targetUser.id)) {
        return interaction.reply({
          embeds: [createErrorEmbed('Already Appointed', `${targetUser} is already an Extra Owner.`)],
          ephemeral: true
        });
      }

      securityManager.addExtraOwner(interaction.guildId, targetUser.id);
      return interaction.reply({
        embeds: [
          createSuccessEmbed(
            'Extra Owner Appointed',
            `👑 ${targetUser} has been granted **Extra Owner** status!\n\n` +
            `• Can toggle Anti-Nuke, configure web dashboard, and manage whitelists.\n` +
            `• Automatically exempt and immune from Anti-Nuke detection.`
          )
        ]
      });
    }

    if (sub === 'remove') {
      if (!(config.extraOwners || []).includes(targetUser.id)) {
        return interaction.reply({
          embeds: [createErrorEmbed('Not Found', `${targetUser} is not an Extra Owner.`)],
          ephemeral: true
        });
      }

      securityManager.removeExtraOwner(interaction.guildId, targetUser.id);
      return interaction.reply({
        embeds: [
          createSuccessEmbed(
            'Extra Owner Removed',
            `👑 ${targetUser} has been removed from **Extra Owner** status.`
          )
        ]
      });
    }
  }
};
