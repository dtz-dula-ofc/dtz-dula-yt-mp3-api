const yts = require('yt-search');

const formatDuration = (duration) => {
  if (!duration) return '00:00';
  if (typeof duration === 'object' && duration.seconds) {
    const secs = duration.seconds;
    const hours = Math.floor(secs / 3600);
    const minutes = Math.floor((secs % 3600) / 60);
    const seconds = Math.floor(secs % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
  return duration;
};

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const { q, limit = 10, page = 1 } = req.query;
    
    if (!q) {
      return res.status(400).json({
        success: false,
        error: 'Search query is required',
        example: '/api/search?q=never+gonna+give+you+up&limit=10'
      });
    }

    const searchResults = await yts(q);
    const startIdx = (parseInt(page) - 1) * parseInt(limit);
    const endIdx = startIdx + parseInt(limit);
    const paginatedVideos = searchResults.videos.slice(startIdx, endIdx);
    
    const formattedResults = paginatedVideos.map(video => ({
      id: video.videoId,
      title: video.title,
      author: {
        name: video.author.name,
        url: video.author.url
      },
      duration: {
        timestamp: video.timestamp || video.duration?.timestamp || '00:00',
        seconds: video.seconds || video.duration?.seconds || 0,
        formatted: formatDuration(video.duration || video.timestamp)
      },
      thumbnail: {
        default: video.thumbnail,
        medium: video.thumbnail.replace('hqdefault', 'mqdefault'),
        high: video.thumbnail.replace('hqdefault', 'sddefault')
      },
      views: video.views,
      uploaded: video.ago,
      uploadDate: video.uploadDate,
      description: video.description?.substring(0, 100) + (video.description?.length > 100 ? '...' : ''),
      url: video.url,
      mp3DownloadUrl: `/api/download/ytmp3?url=${encodeURIComponent(video.url)}&quality=128`
    }));

    const response = {
      success: true,
      developer: "Your Name",
      query: q,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalResults: searchResults.videos.length,
        totalPages: Math.ceil(searchResults.videos.length / parseInt(limit)),
        hasNextPage: endIdx < searchResults.videos.length,
        hasPrevPage: startIdx > 0
      },
      results: formattedResults,
      apiInfo: {
        timestamp: new Date().toISOString(),
        responseTime: Date.now() - (req.startTime || Date.now())
      }
    };

    res.json(response);

  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({
      success: false,
      error: 'Search failed',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
