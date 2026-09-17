const https = require('https');

/**
 * Direct HTTPS scraper for YouTube search results (zero third-party dependency breakages)
 * @param {string} query
 * @returns {Promise<Array<{id: string, title: string, views: number, channel: string, duration: string, url: string}>>}
 */
function scrapeYouTubeVideos(query) {
  return new Promise((resolve) => {
    const url = 'https://www.youtube.com/results?search_query=' + encodeURIComponent(query) + '&sp=EgIQAQ%253D%253D';

    const req = https.get(
      url,
      {
        headers: {
          'Accept-Language': 'en-US,en;q=0.9',
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
        }
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            const match = data.match(/var ytInitialData = ({.*?});<\/script>/);
            if (!match) return resolve([]);

            const json = JSON.parse(match[1]);
            const contents =
              json.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents || [];

            const videos = [];
            for (const c of contents) {
              const items = c.itemSectionRenderer?.contents || [];
              for (const it of items) {
                if (it.videoRenderer) {
                  const vr = it.videoRenderer;
                  const id = vr.videoId;
                  const title = vr.title?.runs?.map((r) => r.text).join('') || '';
                  const views = parseInt((vr.viewCountText?.simpleText || '0').replace(/\D/g, ''), 10) || 0;
                  const channel = vr.ownerText?.runs?.[0]?.text || '';
                  const duration = vr.lengthText?.simpleText || '';

                  if (id && title) {
                    videos.push({
                      id,
                      title,
                      views,
                      channel,
                      duration,
                      url: `https://www.youtube.com/watch?v=${id}`
                    });
                  }
                }
              }
            }
            resolve(videos);
          } catch (e) {
            resolve([]);
          }
        });
      }
    );

    req.on('error', () => resolve([]));
    req.setTimeout(8000, () => {
      req.destroy();
      resolve([]);
    });
  });
}

/**
 * Finds the top trending/official YouTube video with highest views, filtering out unwanted DJ/Remixes
 * @param {string} query
 * @returns {Promise<{id: string, title: string, views: number, channel: string, duration: string, url: string}|null>}
 */
async function getBestTrendingTrack(query) {
  const videos = await scrapeYouTubeVideos(query);
  if (!videos || videos.length === 0) return null;

  // Check if user explicitly asked for remix / dj / mashup / slowed
  const wantsRemix = /\b(dj|remix|mashup|slowed|reverb|bass boosted)\b/i.test(query);

  let candidates = videos;
  if (!wantsRemix) {
    // Filter out fan-made DJ remixes, mashups, and slowed versions
    const cleanVideos = videos.filter(
      (v) => !/\b(dj|remix|mashup|slowed|reverb|bass boosted|lofi remix|dance mix)\b/i.test(v.title)
    );
    if (cleanVideos.length > 0) {
      candidates = cleanVideos;
    }
  }

  // Sort candidates by view count descending so the viral/official video with highest views wins
  candidates.sort((a, b) => (b.views || 0) - (a.views || 0));

  return candidates[0] || videos[0];
}

module.exports = {
  scrapeYouTubeVideos,
  getBestTrendingTrack
};
