const { SlashCommandBuilder } = require('discord.js');
const { createErrorEmbed, createSuccessEmbed } = require('../../utils/embedBuilder');
const { getBestTrendingTrack } = require('../../utils/youtubeSearch');
const { SoundCloudPlugin } = require('@distube/soundcloud');

const scPlugin = new SoundCloudPlugin();

module.exports = {
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('Play a song or playlist from YouTube, Spotify, SoundCloud, or URL')
    .addStringOption((option) =>
      option
        .setName('query')
        .setDescription('Song title, artist, or music URL (YouTube, Spotify, SoundCloud, etc.)')
        .setRequired(true)
    ),

  category: 'music',

  async execute(interaction, client) {
    const voiceChannel = interaction.member.voice.channel;
    if (!voiceChannel) {
      return interaction.reply({
        embeds: [createErrorEmbed('Voice Channel Required', 'You must be connected to a voice channel to play music!')],
        ephemeral: true
      });
    }

    const botVoiceChannel = interaction.guild.members.me.voice.channel;
    if (botVoiceChannel && botVoiceChannel.id !== voiceChannel.id) {
      return interaction.reply({
        embeds: [createErrorEmbed('Different Voice Channel', `You must be in the same voice channel as me: ${botVoiceChannel}!`)],
        ephemeral: true
      });
    }

    const rawQuery = interaction.options.getString('query').trim();
    await interaction.deferReply();

    const isDirectUrl = rawQuery.startsWith('http://') || rawQuery.startsWith('https://');

    // 1. Direct URL (YouTube, Spotify, SoundCloud, Direct stream link)
    if (isDirectUrl) {
      try {
        await client.distube.play(voiceChannel, rawQuery, {
          member: interaction.member,
          textChannel: interaction.channel,
          message: null
        });

        return interaction.editReply({
          embeds: [
            createSuccessEmbed(
              'Loading Direct Stream',
              `🔗 Streaming URL: **${rawQuery}**\nConnecting to **${voiceChannel.name}**...`
            )
          ]
        });
      } catch (err) {
        console.error('Direct URL playback error:', err);
        return interaction.editReply({
          embeds: [
            createErrorEmbed(
              'Playback Error',
              `Could not play the requested URL: \`${err.message || 'Unknown error'}\``
            )
          ]
        });
      }
    }

    // 2. Query is a Song Name/Search Query -> Smart Trending YouTube Search (Highest Views & Official)
    try {
      const bestVideo = await getBestTrendingTrack(rawQuery);

      if (bestVideo && bestVideo.url) {
        await client.distube.play(voiceChannel, bestVideo.url, {
          member: interaction.member,
          textChannel: interaction.channel,
          message: null
        });

        const formattedViews = bestVideo.views ? Number(bestVideo.views).toLocaleString() : 'Trending';
        const channelName = bestVideo.channel || 'YouTube Official';
        const durationStr = bestVideo.duration || 'Music';

        return interaction.editReply({
          embeds: [
            createSuccessEmbed(
              '🎶 YouTube Track Loaded',
              `▶ **[${bestVideo.title}](${bestVideo.url})**\n\n` +
              `📺 **Channel:** ${channelName} • 👁️ **Views:** ${formattedViews}\n` +
              `⏱️ **Duration:** ${durationStr} • 🔊 **Voice:** ${voiceChannel.name}`
            )
          ]
        });
      }
    } catch (ytErr) {
      console.warn('YouTube search playback attempt failed, switching to SoundCloud fallback:', ytErr?.message || ytErr);
      // Seamlessly fall through to SoundCloud fallback below instead of returning error immediately
    }

    // 3. Fallback: High-Quality SoundCloud Streaming
    try {
      const scResults = await scPlugin.search(rawQuery, 'track', 1);
      if (scResults && scResults.length > 0 && scResults[0].url) {
        await client.distube.play(voiceChannel, scResults[0].url, {
          member: interaction.member,
          textChannel: interaction.channel,
          message: null
        });

        const trackName = scResults[0].name || rawQuery;
        const trackUrl = scResults[0].url;

        return interaction.editReply({
          embeds: [
            createSuccessEmbed(
              '🎶 SoundCloud Track Loaded',
              `▶ **[${trackName}](${trackUrl})**\n\n` +
              `🔊 **Voice Channel:** ${voiceChannel.name} • ⚡ **Stream:** High-Fidelity Audio`
            )
          ]
        });
      }
    } catch (scErr) {
      console.error('SoundCloud fallback search error:', scErr?.message || scErr);
    }

    return interaction.editReply({
      embeds: [
        createErrorEmbed(
          'Track Not Found',
          `Could not stream any matching song for: **${rawQuery}**\n\n*Tip: Try searching with the artist name and song title, or paste a direct Spotify / SoundCloud / YouTube URL!*`
        )
      ]
    });
  }
};
