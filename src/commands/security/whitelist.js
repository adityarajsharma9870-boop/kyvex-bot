const { SlashCommandBuilder } = require('discord.js');
const securityManager = require('../../utils/securityManager');
const { createAstrialEmbed, createSuccessEmbed, createErrorEmbed } = require('../../utils/embedBuilder');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('whitelist')
    .setDescription('Manage trusted administrators authorized to bypass Anti-Nuke')
    .addSubcommand((sub) =>
      sub
        .setName('add')
        .setDescription('Authorize a trusted admin (Owner Only)')
        .addUserOption((opt) =>
          opt.setName('user').setDescription('User to whitelist').setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('remove')
        .setDescription('Remove authorization from an admin (Owner Only)')
        .addUserOption((opt) =>
          opt.setName('user').setDescription('User to remove from whitelist').setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub.setName('list').setDescription('View all whitelisted administrators')
    ),

  category: 'security',

  async execute(interaction, client) {
    const sub = interaction.options.getSubcommand();
    const config = securityManager.getConfig(interaction.guildId);

    // List is viewable by anyone or admins
    if (sub === 'list') {
      const list = config.whitelist.length > 0
        ? config.whitelist.map((id, index) => `\`${index + 1}.\` <@${id}> (\`${id}\`)`).join('\n')
        : '*No additional administrators whitelisted yet.*';

      const embed = createAstrialEmbed()
        .setTitle('🛡️ OG EMPIRE • Whitelisted Administrators')
        .setDescription(
          `**Server Owner (Permanent):** <@${interaction.guild.ownerId}>\n\n` +
          `__**Authorized Whitelist:**__\n${list}\n\n` +
          `*Users on this list can perform channel/role management, bot invites, and bans without triggering Anti-Nuke.*`
        );

      return interaction.reply({ embeds: [embed] });
    }

    // Only Server Owner or Extra Owner can add or remove from whitelist!
    if (!securityManager.isOwnerOrExtraOwner(interaction.guild, interaction.user.id)) {
      return interaction.reply({
        embeds: [
          createErrorEmbed(
            'Owner Only Command',
            '⛔ Sirf **Server Owner** ya **Extra Owner** hi Anti-Nuke Whitelist manage kar sakte hain!'
          )
        ],
        ephemeral: true
      });
    }

    const targetUser = interaction.options.getUser('user');

    if (sub === 'add') {
      if (targetUser.id === interaction.guild.ownerId) {
        return interaction.reply({
          embeds: [createErrorEmbed('Already Immune', 'The Server Owner is permanently immune and whitelisted.')],
          ephemeral: true
        });
      }

      if (targetUser.bot) {
        return interaction.reply({
          embeds: [createErrorEmbed('Invalid Target', 'You cannot add bot accounts to the user whitelist.')],
          ephemeral: true
        });
      }

      if (config.whitelist.includes(targetUser.id)) {
        return interaction.reply({
          embeds: [createErrorEmbed('Already Whitelisted', `${targetUser} is already on the Anti-Nuke Whitelist.`)],
          ephemeral: true
        });
      }

      securityManager.addWhitelist(interaction.guildId, targetUser.id);
      return interaction.reply({
        embeds: [
          createSuccessEmbed(
            'Admin Whitelisted',
            `✅ ${targetUser} has been **added to the Anti-Nuke Whitelist**.\nThey are now authorized to manage channels, roles, and moderation settings.`
          )
        ]
      });
    }

    if (sub === 'remove') {
      if (!config.whitelist.includes(targetUser.id)) {
        return interaction.reply({
          embeds: [createErrorEmbed('Not Whitelisted', `${targetUser} is not on the Anti-Nuke Whitelist.`)],
          ephemeral: true
        });
      }

      securityManager.removeWhitelist(interaction.guildId, targetUser.id);
      return interaction.reply({
        embeds: [
          createSuccessEmbed(
            'Admin Removed',
            `❌ ${targetUser} has been **removed from the Anti-Nuke Whitelist**.\nEven if they have an Administrator role, any destructive actions they take will be intercepted.`
          )
        ]
      });
    }
  }
};
