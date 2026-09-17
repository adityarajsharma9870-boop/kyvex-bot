const { 
  SlashCommandBuilder, 
  PermissionFlagsBits, 
  EmbedBuilder, 
  PermissionsBitField 
} = require('discord.js');
const logger = require('../../utils/logger');

function createProgressBar(current, total, barLength = 12) {
  if (total <= 0) return '░'.repeat(barLength);
  const percentage = Math.min(1, Math.max(0, current / total));
  const progress = Math.round(barLength * percentage);
  const emptyProgress = barLength - progress;
  return '█'.repeat(progress) + '░'.repeat(emptyProgress);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('massrole')
    .setDescription('Mass-assign or mass-remove a role for all server members')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .setDMPermission(false)
    // Subcommand: add
    .addSubcommand((sub) =>
      sub
        .setName('add')
        .setDescription('Assign a role to all members in the server at once')
        .addRoleOption((opt) =>
          opt
            .setName('role')
            .setDescription('The role to assign to everyone')
            .setRequired(true)
        )
        .addStringOption((opt) =>
          opt
            .setName('target')
            .setDescription('Who should receive the role?')
            .setRequired(false)
            .addChoices(
              { name: '👥 Humans Only (Recommended)', value: 'humans' },
              { name: '🌐 Everyone (Humans + Bots)', value: 'all' },
              { name: '🤖 Bots Only', value: 'bots' }
            )
        )
    )
    // Subcommand: remove
    .addSubcommand((sub) =>
      sub
        .setName('remove')
        .setDescription('Remove a role from all members in the server at once')
        .addRoleOption((opt) =>
          opt
            .setName('role')
            .setDescription('The role to remove from everyone')
            .setRequired(true)
        )
        .addStringOption((opt) =>
          opt
            .setName('target')
            .setDescription('Who should lose the role?')
            .setRequired(false)
            .addChoices(
              { name: '👥 Humans Only (Recommended)', value: 'humans' },
              { name: '🌐 Everyone (Humans + Bots)', value: 'all' },
              { name: '🤖 Bots Only', value: 'bots' }
            )
        )
    ),

  async execute(interaction, client) {
    const { guild, options, member } = interaction;
    const sub = options.getSubcommand();
    const role = options.getRole('role');
    const targetType = options.getString('target') || 'humans';

    // 1. Permission checks
    if (!member.permissions.has(PermissionsBitField.Flags.ManageRoles) && !member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#ef4444')
            .setTitle('⛔ Access Denied')
            .setDescription('You need the `Manage Roles` permission to use mass role operations.')
        ],
        ephemeral: true
      });
    }

    // 2. Bot Permission checks
    const botMember = guild.members.me;
    if (!botMember.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#ef4444')
            .setTitle('❌ Missing Permission')
            .setDescription('The bot needs the `Manage Roles` permission.')
        ],
        ephemeral: true
      });
    }

    // 3. Role hierarchy & managed checks
    if (role.managed) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#ef4444')
            .setTitle('❌ Managed Role')
            .setDescription(`The role ${role} is automatically managed by an integration/bot and cannot be assigned manually.`)
        ],
        ephemeral: true
      });
    }

    if (role.id === guild.id) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#ef4444')
            .setTitle('❌ Invalid Role')
            .setDescription('You cannot modify the `@everyone` default role.')
        ],
        ephemeral: true
      });
    }

    if (role.position >= botMember.roles.highest.position) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#ef4444')
            .setTitle('❌ Role Hierarchy Error')
            .setDescription(`The role ${role} is higher than or equal to the bot's highest role. Please move the bot's role **above** ${role} in Server Settings &rarr; Roles.`)
        ],
        ephemeral: true
      });
    }

    if (interaction.user.id !== guild.ownerId && role.position >= member.roles.highest.position) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#ef4444')
            .setTitle('❌ Role Hierarchy Error')
            .setDescription(`You cannot modify ${role} because it is higher than or equal to your own highest role.`)
        ],
        ephemeral: true
      });
    }

    await interaction.deferReply();

    // 4. Fetch all members
    const statusMsg = await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor('#ff2449')
          .setTitle('⏳ Fetching Guild Members...')
          .setDescription(`Loading all server members from Discord Gateway. Please hold on...`)
      ]
    });

    let allMembers;
    try {
      allMembers = await guild.members.fetch();
    } catch (e) {
      allMembers = guild.members.cache;
    }

    // 5. Filter target members
    let candidateMembers = [];
    if (targetType === 'humans') {
      candidateMembers = allMembers.filter((m) => !m.user.bot);
    } else if (targetType === 'bots') {
      candidateMembers = allMembers.filter((m) => m.user.bot);
    } else {
      candidateMembers = allMembers;
    }

    const membersArray = Array.from(candidateMembers.values());
    const isAdd = sub === 'add';

    // Filter members needing change
    const toProcess = membersArray.filter((m) => (isAdd ? !m.roles.cache.has(role.id) : m.roles.cache.has(role.id)));
    const alreadyCorrect = membersArray.length - toProcess.length;

    if (toProcess.length === 0) {
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor('#38bdf8')
            .setTitle('ℹ️ No Changes Needed')
            .setDescription(
              isAdd
                ? `All **${membersArray.length}** target members (${targetType}) already have the ${role} role.`
                : `None of the **${membersArray.length}** target members (${targetType}) currently have the ${role} role.`
            )
        ]
      });
    }

    // 6. Execute Mass Role with rate limit pacing and progress updates
    const startTime = Date.now();
    let processed = 0;
    let successCount = 0;
    let failedCount = 0;
    let lastProgressUpdate = Date.now();

    const targetLabel = targetType === 'humans' ? 'Humans' : targetType === 'bots' ? 'Bots' : 'Everyone';

    const buildProgressEmbed = (current, total) => {
      const pct = Math.round((current / total) * 100);
      const bar = createProgressBar(current, total);
      return new EmbedBuilder()
        .setColor('#ff2449')
        .setTitle(`⚡ Mass Role in Progress (${isAdd ? 'Adding' : 'Removing'})`)
        .setDescription(
          `**Target Role:** ${role}\n` +
          `**Target Filter:** \`${targetLabel}\`\n\n` +
          `**Progress:** \`[${bar}]\` **${pct}%** (${current}/${total})\n\n` +
          `• **Successful:** \`${successCount}\`\n` +
          `• **Skipped (Already Set):** \`${alreadyCorrect}\`\n` +
          `• **Failed:** \`${failedCount}\``
        )
        .setFooter({ text: 'Rate-limit protected execution • Kyvex' });
    };

    // Initial progress display
    await interaction.editReply({ embeds: [buildProgressEmbed(0, toProcess.length)] }).catch(() => {});

    for (const targetMember of toProcess) {
      try {
        if (isAdd) {
          await targetMember.roles.add(role, `Mass Role Add by ${interaction.user.tag}`);
        } else {
          await targetMember.roles.remove(role, `Mass Role Remove by ${interaction.user.tag}`);
        }
        successCount++;
      } catch (err) {
        logger.warn(`Failed to ${isAdd ? 'add' : 'remove'} role for ${targetMember.user.tag}:`, err.message);
        failedCount++;
      }

      processed++;

      // Update progress every 3 seconds or on completion
      const now = Date.now();
      if (now - lastProgressUpdate > 3000 || processed === toProcess.length) {
        lastProgressUpdate = now;
        await interaction.editReply({ embeds: [buildProgressEmbed(processed, toProcess.length)] }).catch(() => {});
      }

      // Safe delay between role modifications (280ms)
      await new Promise((resolve) => setTimeout(resolve, 280));
    }

    const durationSeconds = ((Date.now() - startTime) / 1000).toFixed(1);

    // 7. Final Success Embed
    const finalEmbed = new EmbedBuilder()
      .setColor('#00ff88')
      .setTitle(`✅ Mass Role Operation Complete!`)
      .setDescription(
        `**Action:** Role ${isAdd ? 'Added' : 'Removed'}\n` +
        `**Target Role:** ${role}\n` +
        `**Scope:** \`${targetLabel}\` (${membersArray.length} members scanned)\n\n` +
        `**Summary:**\n` +
        `• **Modified:** \`${successCount} members\`\n` +
        `• **Skipped:** \`${alreadyCorrect} members\`\n` +
        `• **Failed:** \`${failedCount} members\`\n` +
        `• **Time Elapsed:** \`${durationSeconds}s\``
      )
      .setFooter({ text: `Executed by ${interaction.user.tag} • Kyvex` })
      .setTimestamp();

    await interaction.editReply({ embeds: [finalEmbed] });

    logger.info(`[MASSROLE] Guild [${guild.name}] ${isAdd ? 'Added' : 'Removed'} ${role.name} for ${successCount} members in ${durationSeconds}s`);
  }
};
