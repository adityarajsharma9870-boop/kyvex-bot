const securityManager = require('../../utils/securityManager');
const whitelistCmd = require('../../commands/security/whitelist');
const extraownerCmd = require('../../commands/security/extraowner');
const { createErrorEmbed } = require('../../utils/embedBuilder');

module.exports = {
  name: 'messageCreate',
  async execute(message, client) {
    if (!message.guild || message.author.bot || message.webhookId) return;

    const content = message.content.trim();
    const prefixes = ['*', '!', '?'];
    const prefix = prefixes.find((p) => content.startsWith(p));
    if (!prefix) return;

    const args = content.slice(prefix.length).trim().split(/ +/);
    const cmd = args.shift().toLowerCase();

    // 1. Prefix command: *whitelist or !whitelist
    if (cmd === 'whitelist' || cmd === 'wl') {
      const guild = message.guild;

      // Check Owner / ExtraOwner
      if (!securityManager.isOwnerOrExtraOwner(guild, message.author.id)) {
        return message.reply({
          embeds: [
            createErrorEmbed(
              'Owner Only Command',
              '⛔ Sirf **Server Owner** ya **Extra Owner** hi Anti-Nuke Whitelist manage kar sakte hain!'
            )
          ]
        }).catch(() => {});
      }

      // Check mentioned user
      const targetUser = message.mentions.users.first() || (args[0] ? await client.users.fetch(args[0]).catch(() => null) : null);

      if (!targetUser) {
        return message.reply({
          embeds: [
            createErrorEmbed(
              'User Required',
              `ℹ️ **Usage:** \`${prefix}whitelist @user\` ya \`/whitelist config user: @user\`\n` +
              `Choose karne ke liye user mention karein taaki full whitelist ya 1-1 karke select menu open ho jaye!`
            )
          ]
        }).catch(() => {});
      }

      if (targetUser.id === guild.ownerId) {
        return message.reply({
          embeds: [createErrorEmbed('Owner Immune', 'Server Owner already permanently immune aur supreme whitelisted hai.')]
        }).catch(() => {});
      }

      const guildConfig = securityManager.getConfig(guild.id);
      const currentDetails = guildConfig.whitelistDetails?.[targetUser.id];
      let permissions = currentDetails?.permissions ? { ...currentDetails.permissions } : null;

      if (!permissions) {
        const isAlreadyWhitelisted = (guildConfig.adminWhitelist || guildConfig.whitelist || []).includes(targetUser.id);
        permissions = {};
        whitelistCmd.WHITELIST_MODULES.forEach((m) => {
          permissions[m.id] = isAlreadyWhitelisted;
        });
      }

      const embed = whitelistCmd.buildWhitelistEmbed(guild, targetUser, permissions);
      const components = whitelistCmd.buildActionComponents(targetUser.id, permissions);

      const replyMsg = await message.reply({
        embeds: [embed],
        components
      }).catch(() => null);

      if (!replyMsg) return;

      const collector = replyMsg.createMessageComponentCollector({
        filter: (i) => i.user.id === message.author.id,
        time: 5 * 60 * 1000
      });

      collector.on('collect', async (i) => {
        const customId = i.customId;

        if (i.isStringSelectMenu() && customId.startsWith('wl_cat_')) {
          const selectedCatId = i.values[0];
          const selectedCat = whitelistCmd.CATEGORIES.find(c => c.id === selectedCatId);

          if (selectedCat) {
            if (selectedCat.type === 'grant_all') {
              whitelistCmd.WHITELIST_MODULES.forEach(m => { permissions[m.id] = true; });
            } else if (selectedCat.type === 'revoke_all') {
              whitelistCmd.WHITELIST_MODULES.forEach(m => { permissions[m.id] = false; });
            } else {
              const allCurrentlyAllowed = selectedCat.modules.every(modId => permissions[modId] === true);
              selectedCat.modules.forEach(modId => {
                permissions[modId] = !allCurrentlyAllowed;
              });
            }

            securityManager.saveWhitelistUser(guild.id, targetUser.id, permissions, {
              username: targetUser.username,
              displayName: targetUser.displayName,
              avatar: targetUser.displayAvatarURL({ dynamic: true })
            });

            const updatedEmbed = whitelistCmd.buildWhitelistEmbed(guild, targetUser, permissions);
            const updatedComponents = whitelistCmd.buildActionComponents(targetUser.id, permissions);

            await i.update({
              embeds: [updatedEmbed],
              components: updatedComponents
            });
          }
          return;
        }

        if (i.isStringSelectMenu() && customId.startsWith('wl_mod_')) {
          const selectedModule = i.values[0];
          permissions[selectedModule] = !permissions[selectedModule];

          securityManager.saveWhitelistUser(guild.id, targetUser.id, permissions, {
            username: targetUser.username,
            displayName: targetUser.displayName,
            avatar: targetUser.displayAvatarURL({ dynamic: true })
          });

          const updatedEmbed = whitelistCmd.buildWhitelistEmbed(guild, targetUser, permissions);
          const updatedComponents = whitelistCmd.buildActionComponents(targetUser.id, permissions);

          await i.update({
            embeds: [updatedEmbed],
            components: updatedComponents
          });
          return;
        }

        if (customId.startsWith('wl_all_')) {
          whitelistCmd.WHITELIST_MODULES.forEach((m) => { permissions[m.id] = true; });
          securityManager.saveWhitelistUser(guild.id, targetUser.id, permissions, {
            username: targetUser.username,
            displayName: targetUser.displayName,
            avatar: targetUser.displayAvatarURL({ dynamic: true })
          });
          const updatedEmbed = whitelistCmd.buildWhitelistEmbed(guild, targetUser, permissions);
          const updatedComponents = whitelistCmd.buildActionComponents(targetUser.id, permissions);
          await i.update({ embeds: [updatedEmbed], components: updatedComponents });
          return;
        }

        if (customId.startsWith('wl_none_')) {
          whitelistCmd.WHITELIST_MODULES.forEach((m) => { permissions[m.id] = false; });
          securityManager.saveWhitelistUser(guild.id, targetUser.id, permissions, {
            username: targetUser.username,
            displayName: targetUser.displayName,
            avatar: targetUser.displayAvatarURL({ dynamic: true })
          });
          const updatedEmbed = whitelistCmd.buildWhitelistEmbed(guild, targetUser, permissions);
          const updatedComponents = whitelistCmd.buildActionComponents(targetUser.id, permissions);
          await i.update({ embeds: [updatedEmbed], components: updatedComponents });
          return;
        }

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

        if (customId.startsWith('wl_close_')) {
          collector.stop('closed');
          const finalEmbed = whitelistCmd.buildWhitelistEmbed(guild, targetUser, permissions);
          const disabledComponents = whitelistCmd.buildActionComponents(targetUser.id, permissions, true);
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
            const disabledComponents = whitelistCmd.buildActionComponents(targetUser.id, permissions, true);
            await replyMsg.edit({ components: disabledComponents });
          } catch (e) {}
        }
      });
    }

    // 2. Prefix command: *extraowner add @user / remove @user
    if (cmd === 'extraowner') {
      const guild = message.guild;
      const sub = args[0]?.toLowerCase();

      if (message.author.id !== guild.ownerId) {
        return message.reply({
          embeds: [createErrorEmbed('Server Owner Only', '⛔ Sirf **Server Owner** hi Extra Owners ko manage kar sakte hain!')]
        }).catch(() => {});
      }

      if (sub === 'add') {
        const targetUser = message.mentions.users.first() || (args[1] ? await client.users.fetch(args[1]).catch(() => null) : null);
        if (!targetUser) return message.reply('❌ Please specify a user to add as Extra Owner: `*extraowner add @user`');

        securityManager.addExtraOwner(guild.id, targetUser.id);
        return message.reply(`👑 <@${targetUser.id}> has been appointed as an **Extra Owner**!`);
      }

      if (sub === 'remove') {
        const targetUser = message.mentions.users.first() || (args[1] ? await client.users.fetch(args[1]).catch(() => null) : null);
        if (!targetUser) return message.reply('❌ Please specify a user to remove: `*extraowner remove @user`');

        securityManager.removeExtraOwner(guild.id, targetUser.id);
        return message.reply(`👑 <@${targetUser.id}> has been removed from **Extra Owner** status.`);
      }

      const cfg = securityManager.getConfig(guild.id);
      const list = (cfg.extraOwners || []).map((id, idx) => `\`${idx + 1}.\` <@${id}>`).join('\n') || '*None*';
      return message.reply(`👑 **Server Owner:** <@${guild.ownerId}>\n**Appointed Extra Owners:**\n${list}`);
    }
  }
};
