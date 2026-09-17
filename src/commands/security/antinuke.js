const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const securityManager = require('../../utils/securityManager');
const { createAstrialEmbed, createSuccessEmbed, createErrorEmbed } = require('../../utils/embedBuilder');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('antinuke')
    .setDescription('Configure OG EMPIRE Anti-Nuke System')
    .addSubcommand((sub) =>
      sub.setName('enable').setDescription('Enable 24/7 Anti-Nuke defense matrix')
    )
    .addSubcommand((sub) =>
      sub.setName('disable').setDescription('Disable Anti-Nuke defense matrix')
    )
    .addSubcommand((sub) =>
      sub.setName('status').setDescription('View current Anti-Nuke security status')
    ),

  category: 'security',

  async execute(interaction, client) {
    // Only Server Owner or Extra Owner can toggle anti-nuke
    if (!securityManager.isOwnerOrExtraOwner(interaction.guild, interaction.user.id)) {
      return interaction.reply({
        embeds: [createErrorEmbed('Permission Denied', 'Sirf **Server Owner** ya **Extra Owner** hi Anti-Nuke system ko manage kar sakte hain!')],
        ephemeral: true
      });
    }

    const sub = interaction.options.getSubcommand();
    const config = securityManager.getConfig(interaction.guildId);

    if (sub === 'enable') {
      securityManager.setAntiNuke(interaction.guildId, true);
      return interaction.reply({
        embeds: [
          createSuccessEmbed(
            'Anti-Nuke Activated',
            '🛡️ **OG EMPIRE Anti-Nuke Defense is now ACTIVE!**\n\n' +
            '• Any unwhitelisted administrator attempting to delete channels, delete roles, mass ban, kick, or invite bots will be **instantly banned/quarantined**.\n' +
            '• Actions will be reverted automatically.\n' +
            '• Managed by Server Owner & Extra Owners.'
          )
        ]
      });
    }

    if (sub === 'disable') {
      securityManager.setAntiNuke(interaction.guildId, false);
      return interaction.reply({
        embeds: [
          createSuccessEmbed(
            'Anti-Nuke Deactivated',
            '⚠️ **OG EMPIRE Anti-Nuke has been DISABLED.** Server actions will no longer be intercepted.'
          )
        ]
      });
    }

    if (sub === 'status') {
      const isEnabled = config.antiNuke;
      const extraOwners = (config.extraOwners || []).length > 0
        ? config.extraOwners.map((id) => `<@${id}>`).join(', ')
        : '*None set*';
      const whitelistedUsers = config.whitelist.length > 0
        ? config.whitelist.map((id) => `<@${id}>`).join(', ')
        : '*No additional users whitelisted (Owner only)*';
      const logChannel = config.logChannel ? `<#${config.logChannel}>` : '*Not Set (Use `/setlogchannel`)*';

      const embed = createAstrialEmbed()
        .setTitle('🛡️ OG EMPIRE • Anti-Nuke Security Status')
        .setDescription(
          `**System Status:** ${isEnabled ? '🟢 **ACTIVE & ARMED**' : '🔴 **DISABLED**'}\n` +
          `**Server Owner:** <@${interaction.guild.ownerId}>\n` +
          `**Extra Owners:** ${extraOwners}\n` +
          `**Punishment Mode:** \`${config.punishment.toUpperCase()}\`\n` +
          `**Security Log Channel:** ${logChannel}\n\n` +
          `__**Whitelisted Administrators:**__\n${whitelistedUsers}\n\n` +
          `*Note: Users with Discord Administrator role who are not on this whitelist are BLOCKED from destructive actions.*`
        )
        .addFields([
          { name: 'Anti-Channel Delete', value: '`Enabled`', inline: true },
          { name: 'Anti-Role Delete', value: '`Enabled`', inline: true },
          { name: 'Anti-Mass Ban', value: '`Enabled`', inline: true },
          { name: 'Anti-Bot Add', value: '`Enabled`', inline: true },
          { name: 'Anti-Webhook Nuke', value: '`Enabled`', inline: true },
          { name: 'Anti-Guild Update', value: '`Enabled`', inline: true }
        ]);

      return interaction.reply({ embeds: [embed] });
    }
  }
};
