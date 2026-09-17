const { 
  SlashCommandBuilder, 
  PermissionFlagsBits, 
  ChannelType, 
  EmbedBuilder,
  PermissionsBitField
} = require('discord.js');
const verificationManager = require('../../utils/verificationManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('verification')
    .setDescription('Configure and deploy the server verification system (Verify button + role assignment)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false)
    // Subcommand: setup
    .addSubcommand((sub) =>
      sub
        .setName('setup')
        .setDescription('Deploy a new verification panel to a channel')
        .addChannelOption((opt) =>
          opt
            .setName('channel')
            .setDescription('The channel where the verification message will be posted')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
        .addRoleOption((opt) =>
          opt
            .setName('role')
            .setDescription('The role granted to users when they click Verify')
            .setRequired(true)
        )
        .addStringOption((opt) =>
          opt
            .setName('description')
            .setDescription('Custom description for the verification embed')
            .setRequired(false)
        )
        .addStringOption((opt) =>
          opt
            .setName('button_text')
            .setDescription('Label on the verify button (default: "Verify")')
            .setRequired(false)
        )
        .addStringOption((opt) =>
          opt
            .setName('banner_url')
            .setDescription('Custom image banner URL (leave empty to use default cyberpunk banner)')
            .setRequired(false)
        )
        .addStringOption((opt) =>
          opt
            .setName('color')
            .setDescription('Hex color for embed (e.g. #2b7fff or #ff2449)')
            .setRequired(false)
        )
    )
    // Subcommand: status
    .addSubcommand((sub) =>
      sub
        .setName('status')
        .setDescription('View current verification configuration and statistics')
    )
    // Subcommand: send
    .addSubcommand((sub) =>
      sub
        .setName('send')
        .setDescription('Resend the verification panel using saved configuration')
        .addChannelOption((opt) =>
          opt
            .setName('channel')
            .setDescription('Target channel (leave empty for previously configured channel)')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(false)
        )
    )
    // Subcommand: disable
    .addSubcommand((sub) =>
      sub
        .setName('disable')
        .setDescription('Disable the verification system')
    ),

  async execute(interaction, client) {
    const { guild, options, member } = interaction;
    const sub = options.getSubcommand();

    // Check administrator or manage guild permissions
    if (!member.permissions.has(PermissionsBitField.Flags.Administrator) && !member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#ef4444')
            .setTitle('⛔ Access Denied')
            .setDescription('You need the `Administrator` or `Manage Server` permission to configure the verification system.')
        ],
        ephemeral: true
      });
    }

    if (sub === 'setup') {
      await interaction.deferReply({ ephemeral: true });

      const channel = options.getChannel('channel');
      const role = options.getRole('role');
      const description = options.getString('description');
      const buttonText = options.getString('button_text') || 'Verify';
      const bannerUrl = options.getString('banner_url');
      const color = options.getString('color') || '#2b7fff';

      // Verify Bot Permissions
      const botMember = guild.members.me;
      if (!botMember.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor('#ef4444')
              .setTitle('❌ Missing Permission')
              .setDescription('The bot needs the `Manage Roles` permission to assign roles to verified users.')
          ]
        });
      }

      if (role.position >= botMember.roles.highest.position) {
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor('#ef4444')
              .setTitle('❌ Role Hierarchy Error')
              .setDescription(`The role ${role} is placed higher than or equal to the bot's highest role. Please drag the bot's role **above** ${role} in Server Settings &rarr; Roles.`)
          ]
        });
      }

      // Check channel send permissions
      const channelPerms = channel.permissionsFor(botMember);
      if (!channelPerms.has(PermissionsBitField.Flags.SendMessages) || !channelPerms.has(PermissionsBitField.Flags.EmbedLinks)) {
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor('#ef4444')
              .setTitle('❌ Channel Permissions Error')
              .setDescription(`The bot cannot send messages or embeds in ${channel}. Please adjust channel permissions.`)
          ]
        });
      }

      try {
        const sentMessage = await verificationManager.deployPanel(guild, channel, role, {
          description,
          buttonText,
          bannerUrl,
          embedColor: color
        });

        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor('#00ff88')
              .setTitle('✅ Verification Panel Deployed!')
              .setDescription(`The verification panel has been successfully posted in ${channel}!\n\n**Settings:**\n• **Target Role:** ${role}\n• **Button Label:** \`${buttonText}\`\n• **Message ID:** \`${sentMessage.id}\``)
              .setFooter({ text: 'Members can now click the Verify button to get access.' })
          ]
        });
      } catch (err) {
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor('#ef4444')
              .setTitle('❌ Deployment Error')
              .setDescription(`Failed to deploy verification panel: \`${err.message}\``)
          ]
        });
      }
    }

    if (sub === 'status') {
      const config = verificationManager.getConfig(guild.id);
      const role = config.roleId ? guild.roles.cache.get(config.roleId) : null;
      const channel = config.channelId ? guild.channels.cache.get(config.channelId) : null;

      const embed = new EmbedBuilder()
        .setColor('#ff2449')
        .setTitle('🛡️ Verification System Status')
        .setDescription(`Current configuration for **${guild.name}**:`)
        .addFields(
          { name: 'Status', value: config.enabled ? '🟢 **Enabled**' : '🔴 **Disabled**', inline: true },
          { name: 'Verified Role', value: role ? `${role}` : '`None configured`', inline: true },
          { name: 'Channel', value: channel ? `${channel}` : '`None`', inline: true },
          { name: 'Button Text', value: `\`${config.buttonText || 'Verify'}\``, inline: true },
          { name: 'Total Verified', value: `\`${config.verifiedCount || 0} members\``, inline: true },
          { name: 'Message ID', value: config.messageId ? `\`${config.messageId}\`` : '`None`', inline: true }
        )
        .setFooter({ text: 'Kyvex Security Suite' })
        .setTimestamp();

      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (sub === 'send') {
      await interaction.deferReply({ ephemeral: true });
      const config = verificationManager.getConfig(guild.id);

      if (!config.roleId) {
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor('#ef4444')
              .setTitle('❌ Verification Not Configured')
              .setDescription('Please run `/verification setup` first to configure the role and channel.')
          ]
        });
      }

      const targetChannel = options.getChannel('channel') || (config.channelId ? guild.channels.cache.get(config.channelId) : interaction.channel);
      if (!targetChannel) {
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor('#ef4444')
              .setTitle('❌ Channel Error')
              .setDescription('Could not locate a valid channel to send the panel to.')
          ]
        });
      }

      const role = guild.roles.cache.get(config.roleId);
      if (!role) {
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor('#ef4444')
              .setTitle('❌ Role Error')
              .setDescription('The configured verification role does not exist.')
          ]
        });
      }

      try {
        await verificationManager.deployPanel(guild, targetChannel, role, config);
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor('#00ff88')
              .setTitle('✅ Panel Resent')
              .setDescription(`Verification panel has been posted in ${targetChannel}!`)
          ]
        });
      } catch (err) {
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor('#ef4444')
              .setTitle('❌ Error')
              .setDescription(`Failed to resend panel: \`${err.message}\``)
          ]
        });
      }
    }

    if (sub === 'disable') {
      verificationManager.updateConfig(guild.id, { enabled: false });
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#f59e0b')
            .setTitle('⚠️ Verification Disabled')
            .setDescription('Verification has been disabled for this server. Button clicks will no longer assign roles until re-enabled.')
        ],
        ephemeral: true
      });
    }
  }
};
