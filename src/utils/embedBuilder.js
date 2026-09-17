const { EmbedBuilder } = require('discord.js');
const config = require('../config');

/**
 * Generates an ASCII / Emoji progress bar for playback.
 * @param {number} current - Current position in seconds or milliseconds
 * @param {number} total - Total duration in seconds or milliseconds
 * @param {number} size - Total characters in the bar
 * @returns {string} - e.g. "🔘▬▬▬▬▬▬▬▬▬▬▬▬"
 */
function createProgressBar(current, total, size = 14) {
  if (!total || total === 0 || isNaN(total)) {
    return '🔘' + '▬'.repeat(size - 1);
  }
  const progress = Math.min(Math.max(current / total, 0), 1);
  const progressChars = Math.round(size * progress);
  const emptyChars = size - progressChars;

  const bar = '▬'.repeat(Math.max(0, progressChars - 1)) + '🔘' + '▬'.repeat(Math.max(0, emptyChars));
  return bar;
}

/**
 * Creates the signature Astrial "Now Playing" embed
 */
function createNowPlayingEmbed(song, queue) {
  const currentFormatted = queue ? queue.formattedCurrentTime : '00:00';
  const totalFormatted = song.formattedDuration || 'Live Stream';
  const currentTime = queue ? queue.currentTime : 0;
  const totalTime = song.duration || 0;
  const progressBar = createProgressBar(currentTime, totalTime);

  const loopModes = ['Off', 'Track', 'Queue'];
  const loopStatus = queue ? loopModes[queue.repeatMode] || 'Off' : 'Off';
  const autoplayStatus = queue && queue.autoplay ? 'Enabled' : 'Disabled';
  const activeFilters = queue && queue.filters.names.length > 0 ? queue.filters.names.join(', ') : 'None';

  const clientUser = queue?.distube?.client?.user;
  const avatarUrl = clientUser?.displayAvatarURL({ dynamic: true }) || null;

  return new EmbedBuilder()
    .setColor(config.embedColor)
    .setAuthor({
      name: 'Now Playing ♪',
      iconURL: avatarUrl || undefined
    })
    .setTitle(song.name ? (song.name.length > 60 ? song.name.substring(0, 57) + '...' : song.name) : 'Unknown Title')
    .setURL(song.url || 'https://discord.com')
    .setThumbnail(song.thumbnail || null)
    .setDescription(
      `**Artist / Channel:** ${song.uploader?.name || 'Unknown'}\n` +
      `**Duration:** \`${currentFormatted} / ${totalFormatted}\`\n\n` +
      `\`${currentFormatted}\` ${progressBar} \`${totalFormatted}\`\n`
    )
    .addFields([
      { name: '👤 Requested By', value: song.user ? `${song.user}` : 'Unknown', inline: true },
      { name: '🔊 Volume', value: `\`${queue ? queue.volume : 70}%\``, inline: true },
      { name: '🔁 Loop', value: `\`${loopStatus}\``, inline: true },
      { name: '📻 Autoplay', value: `\`${autoplayStatus}\``, inline: true },
      { name: '🎛️ Filter', value: `\`${activeFilters}\``, inline: true },
      { name: '📋 Queue Size', value: `\`${queue ? queue.songs.length : 1} songs\``, inline: true }
    ])
    .setFooter({
      text: config.footerText,
      iconURL: avatarUrl || undefined
    })
    .setTimestamp();
}

/**
 * Creates standard info/success embed
 */
function createSuccessEmbed(title, description) {
  return new EmbedBuilder()
    .setColor(config.embedColor)
    .setTitle(`✅ ${title}`)
    .setDescription(description || '')
    .setFooter({ text: config.footerText });
}

/**
 * Creates standard error embed
 */
function createErrorEmbed(title, description) {
  return new EmbedBuilder()
    .setColor('#E74C3C')
    .setTitle(`❌ ${title}`)
    .setDescription(description || '')
    .setFooter({ text: config.footerText });
}

/**
 * Creates standard general Kyvex embed
 */
function createKyvexEmbed() {
  return new EmbedBuilder()
    .setColor(config.embedColor)
    .setFooter({ text: config.footerText })
    .setTimestamp();
}

const createAstrialEmbed = createKyvexEmbed;

module.exports = {
  createProgressBar,
  createNowPlayingEmbed,
  createSuccessEmbed,
  createErrorEmbed,
  createKyvexEmbed,
  createAstrialEmbed
};
