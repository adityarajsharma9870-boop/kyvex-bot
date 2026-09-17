require('dotenv').config();

module.exports = {
  token: process.env.BOT_TOKEN || '',
  clientId: process.env.CLIENT_ID || '',
  clientSecret: process.env.CLIENT_SECRET || '',
  dashboardUrl: process.env.DASHBOARD_URL || 'http://localhost:3000',
  guildId: process.env.GUILD_ID || '',
  defaultVolume: parseInt(process.env.DEFAULT_VOLUME, 10) || 70,
  embedColor: process.env.BOT_EMBED_COLOR || '#ff2449', // Kyvex signature neon red
  footerText: (() => {
    const raw = process.env.BOT_FOOTER_TEXT || '';
    if (!raw || raw.toLowerCase().includes('og empire') || raw.toLowerCase().includes('astrial')) {
      return 'Kyvex • High Quality Music & Cyber-Defense';
    }
    return raw;
  })(),
  icons: {
    play: '▶️',
    pause: '⏸️',
    stop: '⏹️',
    skip: '⏭️',
    loop: '🔁',
    shuffle: '🔀',
    volumeHigh: '🔊',
    volumeLow: '🔉',
    queue: '📜',
    radio: '📻',
    music: '🎵',
    fire: '🔥',
    star: '⭐',
    check: '✅',
    error: '❌',
    gear: '⚙️',
    filter: '🎛️'
  },
  filters: [
    { label: 'Normal (Off)', value: 'off', description: 'Clear all audio filters', emoji: '🎛️' },
    { label: 'Bassboost Low', value: 'bassboost_low', description: 'Slight low-end bass boost', emoji: '🔊' },
    { label: 'Bassboost High', value: 'bassboost_high', description: 'Heavy hard-hitting bass boost', emoji: '💥' },
    { label: '8D / Surround', value: '3d', description: 'Spinning 360 audio effect', emoji: '🎧' },
    { label: 'Nightcore', value: 'nightcore', description: 'Sped up pitch and tempo', emoji: '⚡' },
    { label: 'Vaporwave', value: 'vaporwave', description: 'Slowed down lo-fi retro aesthetic', emoji: '🌊' },
    { label: 'Karaoke', value: 'karaoke', description: 'Removes or attenuates vocals', emoji: '🎤' },
    { label: 'Echo', value: 'echo', description: 'Adds ambient audio echo', emoji: '📢' }
  ]
};
