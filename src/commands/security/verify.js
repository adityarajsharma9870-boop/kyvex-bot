const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
const verificationManager = require('../../utils/verificationManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('verify')
    .setDescription('Verify your account to access channels on this server')
    .setDMPermission(false),

  async execute(interaction, client) {
    const { guild, member } = interaction;
    await interaction.deferReply({ ephemeral: true });

    const config = verificationManager.getConfig(guild.id);
    if (!config || !config.enabled || !config.roleId) {
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor('#ef4444')
            .setTitle('⚠️ Verification Inactive')
            .setDescription('Verification has not been configured on this server yet.')
        ]
      });
    }

    const role = guild.roles.cache.get(config.roleId);
    if (!role) {
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor('#ef4444')
            .setTitle('❌ Role Not Found')
            .setDescription('The configured verification role does not exist on this server.')
        ]
      });
    }

    if (member.roles.cache.has(role.id)) {
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor('#38bdf8')
            .setTitle('ℹ️ Already Verified')
            .setDescription(`You are already verified in **${guild.name}**! You already have the ${role} role.`)
        ]
      });
    }

    const botMember = guild.members.me;
    if (!botMember.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor('#ef4444')
            .setTitle('❌ Permission Error')
            .setDescription('The bot lacks the `Manage Roles` permission.')
        ]
      });
    }

    if (role.position >= botMember.roles.highest.position) {
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor('#ef4444')
            .setTitle('❌ Role Hierarchy Error')
            .setDescription(`The role ${role} is higher than the bot's highest role.`)
        ]
      });
    }

    try {
      await member.roles.add(role, 'Slash Command Verification');
      config.verifiedCount = (config.verifiedCount || 0) + 1;
      verificationManager.updateConfig(guild.id, { verifiedCount: config.verifiedCount });

      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor('#00ff88')
            .setTitle('✅ Verification Successful!')
            .setDescription(`Welcome to **${guild.name}**, ${interaction.user}!\nYou have been granted the **${role.name}** role.`)
            .setTimestamp()
        ]
      });
    } catch (err) {
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor('#ef4444')
            .setTitle('❌ Verification Failed')
            .setDescription(`Could not assign role: \`${err.message}\``)
        ]
      });
    }
  }
};
