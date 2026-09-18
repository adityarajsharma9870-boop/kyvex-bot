const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createSuccessEmbed, createErrorEmbed } = require('../../utils/embedBuilder');
const securityManager = require('../../utils/securityManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('nuke')
    .setDescription('Recreate this channel cleanly and wipe all messages (Owner / Whitelist Only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  category: 'moderation',

  async execute(interaction, client) {
    const isWhitelisted = securityManager.isWhitelisted(interaction.guild, interaction.user.id);
    if (!isWhitelisted) {
      return interaction.reply({
        embeds: [
          createErrorEmbed(
            'Administrator Whitelist Required',
            '⛔ Aapke paas chahe **Administrator** role ho, lekin jab tak **Server Owner** aapko `/whitelist add` se whitelist nahi karega, tab tak aap koi action nahi le sakte!'
          )
        ],
        ephemeral: true
      });
    }

    const channel = interaction.channel;
    const position = channel.position;

    try {
      await interaction.reply({ content: '💣 Nuking and recreating channel...', ephemeral: true });

      const newChannel = await channel.clone({
        reason: `[Kyvex NUKE] Recreated by ${interaction.user.tag}`
      });

      await newChannel.setPosition(position);
      await channel.delete(`[Kyvex NUKE] Deleted by ${interaction.user.tag}`);

      await newChannel.send({
        embeds: [
          createSuccessEmbed(
            'Channel Nuked & Recreated',
            `💥 This channel has been completely wiped and recreated cleanly by ${interaction.user}!\n*All previous messages and spams have been purged.*`
          )
        ]
      });
    } catch (err) {
      return interaction.followUp({
        embeds: [createErrorEmbed('Nuke Failed', err.message || 'Could not recreate channel.')],
        ephemeral: true
      }).catch(() => {});
    }
  }
};
