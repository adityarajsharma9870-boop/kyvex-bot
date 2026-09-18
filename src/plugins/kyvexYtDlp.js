const { PlayableExtractorPlugin, DisTubeError, Playlist, Song } = require('distube');
const { json, download } = require('@distube/yt-dlp');
const fs = require('fs');
const path = require('path');

class KyvexYtDlpSong extends Song {
  constructor(plugin, info, options = {}) {
    super(
      {
        plugin,
        source: info.extractor || 'youtube',
        playFromSource: true,
        id: info.id,
        name: info.title || info.fulltitle || 'Kyvex Track',
        url: info.webpage_url || info.original_url || `https://www.youtube.com/watch?v=${info.id}`,
        isLive: Boolean(info.is_live),
        thumbnail: info.thumbnail || (info.thumbnails && info.thumbnails[0] ? info.thumbnails[0].url : null),
        duration: info.is_live ? 0 : (info.duration || 0),
        uploader: {
          name: info.uploader || info.channel || 'YouTube Official',
          url: info.uploader_url || info.channel_url || ''
        },
        views: info.view_count || 0,
        likes: info.like_count || 0,
        dislikes: info.dislike_count || 0,
        reposts: info.repost_count || 0,
        ageRestricted: Boolean(info.age_limit && info.age_limit >= 18)
      },
      options
    );
  }
}

class KyvexYtDlpPlugin extends PlayableExtractorPlugin {
  constructor({ update } = {}) {
    super();
    if (update ?? true) {
      download().catch(() => void 0);
    }
    this.cookiesPath = path.join(process.cwd(), 'cookies.txt');
  }

  init(distube) {
    super.init(distube);
    if (this.distube.plugins[this.distube.plugins.length - 1] !== this) {
      console.warn(`[${this.constructor.name}] Placing plugin as fallback extractor in DisTube.`);
    }
  }

  validate() {
    return true;
  }

  getFlags(additional = {}) {
    const flags = {
      dumpSingleJson: true,
      noWarnings: true,
      extractorArgs: 'youtube:player_client=android,ios',
      preferFreeFormats: true,
      skipDownload: true,
      simulate: true,
      ...additional
    };

    if (fs.existsSync(this.cookiesPath)) {
      flags.cookies = this.cookiesPath;
    } else if (process.env.YOUTUBE_COOKIE) {
      try {
        fs.writeFileSync(this.cookiesPath, process.env.YOUTUBE_COOKIE);
        flags.cookies = this.cookiesPath;
      } catch (e) {}
    }

    return flags;
  }

  async resolve(url, options) {
    let flags = this.getFlags();

    let info;
    try {
      info = await json(url, flags);
    } catch (err) {
      // If android,ios encounters an issue, retry with web,ios fallback
      try {
        flags = this.getFlags({ extractorArgs: 'youtube:player_client=web,ios' });
        info = await json(url, flags);
      } catch (secondErr) {
        const errMsg = secondErr.stderr || secondErr.message || err.stderr || err.message || `${err}`;
        throw new DisTubeError('YTDLP_ERROR', errMsg);
      }
    }

    if (Array.isArray(info.entries)) {
      if (info.entries.length === 0) {
        throw new DisTubeError('YTDLP_ERROR', 'The playlist is empty');
      }
      return new Playlist(
        {
          source: info.extractor || 'youtube',
          songs: info.entries.map((entry) => new KyvexYtDlpSong(this, entry, options)),
          id: `${info.id}`,
          name: info.title || 'YouTube Playlist',
          url: info.webpage_url || url,
          thumbnail: info.thumbnails?.[0]?.url || null
        },
        options
      );
    }

    return new KyvexYtDlpSong(this, info, options);
  }

  async getStreamURL(song) {
    if (!song.url) {
      throw new DisTubeError('YTDLP_PLUGIN_INVALID_SONG', 'Cannot get stream url from invalid song.');
    }

    let flags = this.getFlags({ format: 'ba/ba*' });

    let info;
    try {
      info = await json(song.url, flags);
    } catch (err) {
      try {
        flags = this.getFlags({ format: 'ba/ba*', extractorArgs: 'youtube:player_client=web,ios' });
        info = await json(song.url, flags);
      } catch (secondErr) {
        const errMsg = secondErr.stderr || secondErr.message || err.stderr || err.message || `${err}`;
        throw new DisTubeError('YTDLP_ERROR', errMsg);
      }
    }

    if (Array.isArray(info.entries)) {
      throw new DisTubeError('YTDLP_ERROR', 'Cannot get stream URL of an entire playlist');
    }

    return info.url;
  }

  getRelatedSongs() {
    return [];
  }
}

module.exports = {
  KyvexYtDlpPlugin,
  KyvexYtDlpSong
};
