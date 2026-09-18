const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  ComponentType
} = require('discord.js');
const securityManager = require('../../utils/securityManager');
const { createSuccessEmbed, createErrorEmbed } = require('../../utils/embedBuilder');
const config = require('../../config');

const WHITELIST_MODULES = [
  { id: 'antiBan', label: 'Anti Ban', emoji: '🔨', desc: 'Bypass member banning protection' },
  { id: 'antiUnban', label: 'Anti Unban', emoji: '🔓', desc: 'Bypass member unbanning protection' },
  { id: 'antiKick', label: 'Anti Kick', emoji: '👢', desc: 'Bypass member kicking protection' },
  { id: 'antiPrune', label: 'Anti Member Prune', emoji: '🧹', desc: 'Bypass mass member pruning' },
  { id: 'antiBotAdd', label: 'Anti Bot Add', emoji: '🤖', desc: 'Bypass unauthorized bot additions' },
  { id: 'antiChannelCreate', label: 'Anti Channel Create', emoji: '📁', desc: 'Bypass channel creation limits' },
  { id: 'antiChannelDelete', label: 'Anti Channel Delete', emoji: '🗑️', desc: 'Bypass channel deletion protection' },
  { id: 'antiChannelUpdate', label: 'Anti Channel Update', emoji: '⚙️', desc: 'Bypass channel settings modifications' },
  { id: 'antiRoleCreate', label: 'Anti Role Create', emoji: '🎭', desc: 'Bypass role creation protection' },
  { id: 'antiRoleDelete', label: 'Anti Role Delete', emoji: '❌', desc: 'Bypass role deletion protection' },
  { id: 'antiRoleUpdate', label: 'Anti Role Update', emoji: '📝', desc: 'Bypass role hierarchy & permissions edits' },
  { id: 'antiMemberUpdate', label: 'Anti Member Update', emoji: '👤', desc: 'Bypass member role changes' },
  { id: 'antiEmojiCreate', label: 'Anti Emoji/Sticker Create', emoji: '😀', desc: 'Bypass custom emoji/sticker creation' },
  { id: 'antiEmojiDelete', label: 'Anti Emoji/Sticker Delete', emoji: '🚫', desc: 'Bypass emoji/sticker deletion' },
  { id: 'antiEmojiUpdate', label: 'Anti Emoji/Sticker Update', emoji: '🎨', desc: 'Bypass emoji/sticker edits' },
  { id: 'antiEveryonePing', label: 'Anti Everyone/Here Ping', emoji: '📢', desc: 'Bypass @everyone & @here mention filters' },
  { id: 'antiRolePing', label: 'Anti Role Ping', emoji: '🔔', desc: 'Bypass mass role mentions' },
  { id: 'antiIntegration', label: 'Anti Integration', emoji: '🧩', desc: 'Bypass app/webhook integrations' },
  { id: 'antiGuildUpdate', label: 'Anti Guild Update', emoji: '🛡️', desc: 'Bypass server vanity, name & icon changes' },
  { id: 'antiWebhookCreate', label: 'Anti Webhook Create', emoji: '🌐', desc: 'Bypass webhook creation protection' },
  { id: 'antiWebhookDelete', label: 'Anti Webhook Delete', emoji: '🔌', desc: 'Bypass webhook deletion protection' },
  { id: 'antiWebhookUpdate', label: 'Anti Webhook Update', emoji: '⚡', desc: 'Bypass webhook token/channel updates' }
];

function buildWhitelistEmbed(guild, targetUser, permissions = {}) {
  const lines = WHITELIST_MODULES.map((mod) => {
    const isAllowed = permissions[mod.id] === true;
    const indicator = isAllowed ? '🟩 ✅' : '🟥 ❌';
    return `│ ${indicator} : **${mod.label}**`;
  });

  const embed = new EmbedBuilder()
    .setColor(config.embedColor || '#ff2449')
    .setTitle('Whitelist Configuration for Current Server')
    .setDescription(
      `${lines.join('\n')}\n\n` +
      `│ **Target:** <@${targetUser.id}>`
    )
    .setThumbnail(guild.iconURL({ dynamic: true }) || 'https://cdn.discordapp.com/embed/avatars/0.png')
    .setFooter({ text: 'Powered by Kyvex Development' })
    .setTimestamp();

  return embed;
}

function buildActionComponents(targetUserId, permissions = {}, disabled = false) {
  // 1. Select Menu with all 22 modules
  const selectOptions = WHITELIST_MODULES.map((mod) => {
    const isAllowed = permissions[mod.id] === true;
    return {
      label: mod.label,
      value: mod.id,
      description: isAllowed ? 'Currently: ALLOWED (Click to Deny)' : 'Currently: BLOCKED (Click to Allow)',
      emoji: isAllowed ? '✅' : '❌'
    };
  });

  const selectRow = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`wl_select_${targetUserId}`)
      .setPlaceholder('⚙️ Toggle an Anti-Nuke module bypass...')
      .addOptions(selectOptions)
      .setDisabled(disabled)
  );

  // 2. Button Row
  const buttonRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`wl_all_${targetUserId}`)
      .setLabel('Whitelist All')
      .setEmoji('🟢')
      .setStyle(ButtonStyle.Success)
      .setDisabled(disabled),
    new ButtonBuilder()
      .setCustomId(`wl_none_${targetUserId}`)
      .setLabel('Revoke All')
      .setEmoji('🔴')
      .setStyle(ButtonStyle.Danger)
      .setDisabled(disabled),
    new ButtonBuilder()
      .setCustomId(`wl_remove_${targetUserId}`)
      .setLabel('Remove Whitelist')
      .setEmoji('🗑️')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(disabled),
    new ButtonBuilder()
      .setCustomId(`wl_close_${targetUserId}`)
      .setLabel('Save & Close')
      .setEmoji('💾')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(disabled)
  );

  return [selectRow, buttonRow];
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('whitelist')
    .setDescription('Interactive Anti-Nuke Whitelist Manager with granular permission controls')
    .addSubcommand((sub) =>
      sub
        .setName('config')
        .setDescription('Configure granular Anti-Nuke bypass permissions for a user')
        .addUserOption((opt) =>
          opt.setName('user').setDescription('Target administrator to configure').setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('add')
        .setDescription('Instantly grant full Anti-Nuke whitelist bypass to a user')
        .addUserOption((opt) =>
          opt.setName('user').setDescription('User to whitelist with full bypass').setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('remove')
        .setDescription('Remove a user from the Anti-Nuke whitelist')
        .addUserOption((opt) =>
          opt.setName('user').setDescription('User to remove').setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub.setName('list').setDescription('View all whitelisted users and their active permissions')
    )
    .addSubcommand((sub) =>
      sub.setName('reset').setDescription('Reset all whitelist data for this server (Owner Only)')
    ),

  category: 'security',

  async execute(interaction, client) {
    const sub = interaction.options.getSubcommand();
    const guild = interaction.guild;
    const guildConfig = securityManager.getConfig(guild.id);

    // 1. List Subcommand (Viewable by everyone)
    if (sub === 'list') {
      const list = guildConfig.adminWhitelist || guildConfig.whitelist || [];
      const details = guildConfig.whitelistDetails || {};

      if (list.length === 0) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(config.embedColor || '#ff2449')
              .setTitle('🛡️ Kyvex • Whitelisted Administrators')
              .setDescription(
                `**Server Owner (Permanent Immunity):** <@${guild.ownerId}>\n\n` +
                `*No administrators have been whitelisted yet. Use \`/whitelist config @user\` to configure permissions.*`
              )
              .setFooter({ text: 'Powered by Kyvex Development' })
          ]
        });
      }

      const formatted = list.map((id, index) => {
        const userDetails = details[id];
        const grantedCount = userDetails?.permissions
          ? Object.values(userDetails.permissions).filter(Boolean).length
          : 22; // Default full bypass if not specified
        return `\`${index + 1}.\` <@${id}> (\`${id}\`) — **${grantedCount}/22 Modules Allowed**`;
      }).join('\n');

      const embed = new EmbedBuilder()
        .setColor(config.embedColor || '#ff2449')
        .setTitle('🛡️ Kyvex • Whitelisted Administrators')
        .setDescription(
          `**Server Owner (Permanent Immunity):** <@${guild.ownerId}>\n\n` +
          `__**Active Whitelisted Members (${list.length}):**__\n${formatted}\n\n` +
          `💡 *Tip: Run \`/whitelist config @user\` to change permissions for any user in real-time.*`
        )
        .setFooter({ text: 'Powered by Kyvex Development' })
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    }

    // 2. Owner / Extra Owner Authorization Check
    if (!securityManager.isOwnerOrExtraOwner(guild, interaction.user.id)) {
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

    // 3. Reset Subcommand
    if (sub === 'reset') {
      securityManager.resetWhitelist(guild.id);
      return interaction.reply({
        embeds: [
          createSuccessEmbed(
            'Whitelist Cleared',
            '🗑️ Sabhi whitelisted users aur permission configurations successfully reset kar diye gaye hain.'
          )
        ]
      });
    }

    const targetUser = interaction.options.getUser('user');

    if (targetUser.id === guild.ownerId) {
      return interaction.reply({
        embeds: [createErrorEmbed('Owner Already Immune', 'Server Owner permanently immune aur supreme whitelisted hai.')],
        ephemeral: true
      });
    }

    if (targetUser.bot) {
      return interaction.reply({
        embeds: [createErrorEmbed('Invalid Target', 'Bot accounts ko user whitelist me add nahi kiya ja sakta.')],
        ephemeral: true
      });
    }

    // 4. Remove Subcommand
    if (sub === 'remove') {
      const list = guildConfig.adminWhitelist || guildConfig.whitelist || [];
      if (!list.includes(targetUser.id)) {
        return interaction.reply({
          embeds: [createErrorEmbed('Not Whitelisted', `${targetUser} whitelist list me nahi hai.`)],
          ephemeral: true
        });
      }

      securityManager.removeAdminWhitelist(guild.id, targetUser.id);
      return interaction.reply({
        embeds: [
          createSuccessEmbed(
            'Whitelist Removed',
            `❌ ${targetUser} ko whitelist se remove kar diya gaya hai. Ab unki koi bhi destructive action intercept hogi.`
          )
        ]
      });
    }

    // 5. Add Subcommand (Quick Full Whitelist)
    if (sub === 'add') {
      const allPerms = {};
      WHITELIST_MODULES.forEach((m) => { allPerms[m.id] = true; });

      securityManager.saveWhitelistUser(guild.id, targetUser.id, allPerms, {
        username: targetUser.username,
        displayName: targetUser.displayName,
        avatar: targetUser.displayAvatarURL({ dynamic: true })
      });

      const embed = buildWhitelistEmbed(guild, targetUser, allPerms);
      const components = buildActionComponents(targetUser.id, allPerms);

      return interaction.reply({
        content: `✅ ${targetUser} has been **fully whitelisted** with all 22 Anti-Nuke bypass permissions!`,
        embeds: [embed],
        components
      });
    }

    // 6. Config Subcommand (Interactive Configuration Matrix)
    if (sub === 'config') {
      const currentDetails = guildConfig.whitelistDetails?.[targetUser.id];
      let permissions = currentDetails?.permissions ? { ...currentDetails.permissions } : null;

      // If user is whitelisted without specific details, default all to true; otherwise default all to false
      if (!permissions) {
        const isAlreadyWhitelisted = (guildConfig.adminWhitelist || guildConfig.whitelist || []).includes(targetUser.id);
        permissions = {};
        WHITELIST_MODULES.forEach((m) => {
          permissions[m.id] = isAlreadyWhitelisted;
        });
      }

      const initialEmbed = buildWhitelistEmbed(guild, targetUser, permissions);
      const initialComponents = buildActionComponents(targetUser.id, permissions);

      const response = await interaction.reply({
        embeds: [initialEmbed],
        components: initialComponents,
        fetchReply: true
      });

      // Collector for real-time Discord interaction
      const collector = response.createMessageComponentCollector({
        filter: (i) => i.user.id === interaction.user.id,
        time: 5 * 60 * 1000 // 5 minutes active
      });

      collector.on('collect', async (i) => {
        const customId = i.customId;

        // Toggle Single Module via Select Menu
        if (i.isStringSelectMenu() && customId.startsWith('wl_select_')) {
          const selectedModule = i.values[0];
          permissions[selectedModule] = !permissions[selectedModule];

          securityManager.saveWhitelistUser(guild.id, targetUser.id, permissions, {
            username: targetUser.username,
            displayName: targetUser.displayName,
            avatar: targetUser.displayAvatarURL({ dynamic: true })
          });

          const updatedEmbed = buildWhitelistEmbed(guild, targetUser, permissions);
          const updatedComponents = buildActionComponents(targetUser.id, permissions);

          await i.update({
            embeds: [updatedEmbed],
            components: updatedComponents
          });
          return;
        }

        // Whitelist All (Grant all 22)
        if (customId.startsWith('wl_all_')) {
          WHITELIST_MODULES.forEach((m) => { permissions[m.id] = true; });

          securityManager.saveWhitelistUser(guild.id, targetUser.id, permissions, {
            username: targetUser.username,
            displayName: targetUser.displayName,
            avatar: targetUser.displayAvatarURL({ dynamic: true })
          });

          const updatedEmbed = buildWhitelistEmbed(guild, targetUser, permissions);
          const updatedComponents = buildActionComponents(targetUser.id, permissions);

          await i.update({
            content: `🟢 All 22 Anti-Nuke modules enabled for ${targetUser}!`,
            embeds: [updatedEmbed],
            components: updatedComponents
          });
          return;
        }

        // Revoke All (Deny all 22)
        if (customId.startsWith('wl_none_')) {
          WHITELIST_MODULES.forEach((m) => { permissions[m.id] = false; });

          securityManager.saveWhitelistUser(guild.id, targetUser.id, permissions, {
            username: targetUser.username,
            displayName: targetUser.displayName,
            avatar: targetUser.displayAvatarURL({ dynamic: true })
          });

          const updatedEmbed = buildWhitelistEmbed(guild, targetUser, permissions);
          const updatedComponents = buildActionComponents(targetUser.id, permissions);

          await i.update({
            content: `🔴 All Anti-Nuke bypass permissions revoked for ${targetUser}!`,
            embeds: [updatedEmbed],
            components: updatedComponents
          });
          return;
        }

        // Remove from Whitelist
        if (customId.startsWith('wl_remove_')) {
          securityManager.removeAdminWhitelist(guild.id, targetUser.id);
          collector.stop('removed');

          await i.update({
            content: `🗑️ ${targetUser} has been completely removed from the server whitelist.`,
            embeds: [],
            components: []
          });
          return;
        }

        // Save & Close
        if (customId.startsWith('wl_close_')) {
          collector.stop('closed');

          const finalEmbed = buildWhitelistEmbed(guild, targetUser, permissions);
          const disabledComponents = buildActionComponents(targetUser.id, permissions, true);

          await i.update({
            content: `💾 Whitelist configuration saved for ${targetUser}!`,
            embeds: [finalEmbed],
            components: disabledComponents
          });
        }
      });

      collector.on('end', async (_, reason) => {
        if (reason !== 'removed' && reason !== 'closed') {
          try {
            const disabledComponents = buildActionComponents(targetUser.id, permissions, true);
            await response.edit({ components: disabledComponents });
          } catch (e) {}
        }
      });
    }
  }
};
