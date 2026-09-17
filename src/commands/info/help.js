const {
  SlashCommandBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ComponentType
} = require('discord.js');
const { createAstrialEmbed } = require('../../utils/embedBuilder');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Displays the full Kyvex command directory and help menu'),

  category: 'info',

  async execute(interaction, client) {
    const mainEmbed = createAstrialEmbed()
      .setAuthor({
        name: 'Kyvex • Commands Directory',
        iconURL: client.user.displayAvatarURL({ dynamic: true })
      })
      .setTitle('👑 Welcome to Kyvex Mega Bot')
      .setDescription(
        '**Kyvex** is an all-in-one High Quality Discord Bot featuring **High-Security Anti-Nuke Defense**, **Owner Whitelist Protection**, **Full Moderation Suite**, and **High-Definition Music Playback**!\n\n' +
        'Select a category from the dropdown menu below to view detailed commands.'
      )
      .addFields([
        {
          name: '🛡️ Security & Anti-Nuke (3)',
          value: '`/antinuke`, `/whitelist`, `/setlogchannel`\n*Blocks unauthorized admins from deleting channels, roles, banning, or adding bots!*',
          inline: false
        },
        {
          name: '🔨 Moderation Suite (10)',
          value: '`/ban`, `/unban`, `/kick`, `/timeout`, `/untimeout`, `/purge`, `/lock`, `/unlock`, `/slowmode`, `/nuke`',
          inline: false
        },
        {
          name: '🎶 Music Playback & Effects (15)',
          value: '`/play`, `/pause`, `/resume`, `/skip`, `/stop`, `/queue`, `/nowplaying`, `/volume`, `/loop`, `/shuffle`, `/autoplay`, `/filter`, `/seek`, `/jump`, `/clear`',
          inline: false
        },
        {
          name: '⚙️ Utilities & 24/7 (4)',
          value: '`/247`, `/help`, `/ping`, `/upi`\n*Generate custom UPI payment QR codes with custom amount!*',
          inline: false
        }
      ])
      .setThumbnail(client.user.displayAvatarURL({ dynamic: true }))
      .setFooter({ text: `${config.footerText} • All-in-One Defense & Music` });

    const menu = new StringSelectMenuBuilder()
      .setCustomId('help_category_select')
      .setPlaceholder('📂 Choose a Help Category')
      .addOptions(
        new StringSelectMenuOptionBuilder()
          .setLabel('Overview')
          .setValue('help_overview')
          .setDescription('Main dashboard and bot summary')
          .setEmoji('🏠'),
        new StringSelectMenuOptionBuilder()
          .setLabel('Security & Anti-Nuke')
          .setValue('help_security')
          .setDescription('Anti-nuke toggle, whitelist, and log channel')
          .setEmoji('🛡️'),
        new StringSelectMenuOptionBuilder()
          .setLabel('Moderation Suite')
          .setValue('help_moderation')
          .setDescription('Ban, kick, timeout, purge, lock, and nuke')
          .setEmoji('🔨'),
        new StringSelectMenuOptionBuilder()
          .setLabel('Music Playback')
          .setValue('help_music')
          .setDescription('Playback, queue, volume, loop, shuffle controls')
          .setEmoji('🎶'),
        new StringSelectMenuOptionBuilder()
          .setLabel('Audio Filters')
          .setValue('help_filters')
          .setDescription('Bassboost, 8D audio, Nightcore, and EQ effects')
          .setEmoji('🎛️'),
        new StringSelectMenuOptionBuilder()
          .setLabel('Settings & 24/7')
          .setValue('help_settings')
          .setDescription('24/7 mode, latency, and status commands')
          .setEmoji('⚙️')
      );

    const row = new ActionRowBuilder().addComponents(menu);

    const replyMsg = await interaction.reply({
      embeds: [mainEmbed],
      components: [row],
      fetchReply: true
    });

    const collector = replyMsg.createMessageComponentCollector({
      componentType: ComponentType.StringSelect,
      time: 90000
    });

    collector.on('collect', async (selectInteraction) => {
      if (selectInteraction.user.id !== interaction.user.id) {
        return selectInteraction.reply({
          content: '❌ You cannot control this help menu.',
          ephemeral: true
        });
      }

      const selected = selectInteraction.values[0];
      let newEmbed;

      if (selected === 'help_overview') {
        newEmbed = mainEmbed;
      } else if (selected === 'help_security') {
        newEmbed = createAstrialEmbed()
          .setTitle('🛡️ Security & Anti-Nuke System')
          .setDescription(
            '**Kyvex Anti-Nuke** protects your server from rogue administrators and nukers.\n' +
            'Even if a rogue user has the Discord `Administrator` permission, they **CANNOT** delete channels, delete roles, mass ban, kick, or invite bots unless the Server Owner explicitly whitelists them!'
          )
          .addFields([
            { name: '`/antinuke <enable|disable|status>`', value: 'Turn Anti-Nuke defense ON/OFF or view system security status.' },
            { name: '`/whitelist add <user>`', value: '**Server Owner Only**: Authorize a trusted admin to manage server settings.' },
            { name: '`/whitelist remove <user>`', value: '**Server Owner Only**: Revoke authorization from an admin.' },
            { name: '`/whitelist list`', value: 'View all currently whitelisted administrators.' },
            { name: '`/setlogchannel <channel>`', value: 'Set the channel where real-time security alerts and breach logs are posted.' }
          ]);
      } else if (selected === 'help_moderation') {
        newEmbed = createAstrialEmbed()
          .setTitle('🔨 Full Moderation Suite')
          .setDescription('Powerful moderation tools to manage server members and keep chats clean:')
          .addFields([
            { name: '`/ban <user> [reason]`', value: 'Permanently ban a member from the server.' },
            { name: '`/unban <userid> [reason]`', value: 'Unban a user using their Discord User ID.' },
            { name: '`/kick <user> [reason]`', value: 'Kick a member from the server.' },
            { name: '`/timeout <user> <duration> [reason]`', value: 'Mute/timeout a member (60s, 5m, 10m, 1h, 1d, 7d).' },
            { name: '`/untimeout <user>`', value: 'Remove timeout from a muted member.' },
            { name: '`/purge <amount>`', value: 'Bulk delete up to 100 messages from the channel.' },
            { name: '`/lock` & `/unlock`', value: 'Lock down or unlock the channel for `@everyone`.' },
            { name: '`/slowmode <seconds>`', value: 'Set slowmode cooldown in seconds (0 to disable).' },
            { name: '`/nuke`', value: '**Owner/Whitelist Only**: Recreates the channel cleanly and wipes all previous spam.' }
          ]);
      } else if (selected === 'help_music') {
        newEmbed = createAstrialEmbed()
          .setTitle('🎶 Music Playback Commands')
          .setDescription('All commands for music playback and queue management:')
          .addFields([
            { name: '`/play <query>`', value: 'Play track/playlist from YouTube, Spotify, SoundCloud, or Direct Link.' },
            { name: '`/pause` & `/resume`', value: 'Pause or unpause the current song.' },
            { name: '`/skip`', value: 'Skip to the next song in the queue.' },
            { name: '`/stop`', value: 'Stop playback, clear queue, and leave voice channel.' },
            { name: '`/queue [page]`', value: 'Display queued tracks with interactive pagination.' },
            { name: '`/nowplaying`', value: 'Show current track with live progress bar and controller buttons.' },
            { name: '`/volume <percent>`', value: 'Adjust volume smoothly from 1% to 150%.' },
            { name: '`/loop <mode>`', value: 'Toggle repeating for current track or entire queue.' },
            { name: '`/shuffle`', value: 'Randomize upcoming songs in the queue.' },
            { name: '`/autoplay`', value: 'Enable or disable smart autoplay suggestions.' },
            { name: '`/seek <seconds>`', value: 'Seek to timestamp in the track.' },
            { name: '`/jump <position>`', value: 'Jump directly to a song in the queue.' },
            { name: '`/remove <position>`', value: 'Remove a specific track from queue.' },
            { name: '`/clear`', value: 'Clear all upcoming tracks from queue.' }
          ]);
      } else if (selected === 'help_filters') {
        newEmbed = createAstrialEmbed()
          .setTitle('🎛️ Audio Sound Filters')
          .setDescription('Apply real-time audio enhancements to music playback!\nUse `/filter <effect>` or the interactive controller dropdown menu.')
          .addFields([
            { name: '🔊 Bassboost', value: 'Punchy low-frequency bass boost for hip-hop and EDM.' },
            { name: '🎧 3D / 8D', value: 'Immersive 360-degree rotating audio around your headphones.' },
            { name: '⚡ Nightcore', value: 'Sped up tempo and heightened pitch for energetic beats.' },
            { name: '🌊 Vaporwave', value: 'Slowed down pitch and retro lo-fi nostalgic vibes.' },
            { name: '🎤 Karaoke', value: 'Vocal attenuation to sing along to your favorite songs.' },
            { name: '📢 Echo', value: 'Spatial concert hall echo and reverberation.' },
            { name: '❌ Clear', value: 'Turn off all filters and restore normal audio.' }
          ]);
      } else if (selected === 'help_settings') {
        newEmbed = createAstrialEmbed()
          .setTitle('⚙️ Utilities & 24/7 System')
          .setDescription('Bot utilities, status, and configuration:')
          .addFields([
            { name: '`/247`', value: 'Keep the bot connected in your voice channel 24/7 non-stop.' },
            { name: '`/ping`', value: 'Check bot latency and Discord API WebSocket ping.' },
            { name: '`/upi <upi_id> [amount] [name] [note]`', value: 'Generate instant UPI payment QR code for PhonePe/GPay/Paytm/BHIM.' },
            { name: '`/help`', value: 'Open this interactive help center.' }
          ]);
      }

      await selectInteraction.update({ embeds: [newEmbed], components: [row] });
    });

    collector.on('end', async () => {
      try {
        await interaction.editReply({ components: [] });
      } catch (err) {}
    });
  }
};
