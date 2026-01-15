const ytdl = require('ytdl-core');
const yts = require('yt-search');

// Helper function to format duration
const formatDuration = (seconds) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
};

// Helper to estimate file size
const estimateSize = (durationSeconds, bitrate) => {
  // Formula: (bitrate * duration) / 8 = size in kilobits
  const sizeKB = (bitrate * durationSeconds) / 8;
  if (sizeKB > 1024) {
    return (sizeKB / 1024).toFixed(2) + ' MB';
  }
  return Math.ceil(sizeKB) + ' KB';
};

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Handle OPTIONS request for CORS
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { url, quality = '128' } = req.query;
    
    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'YouTube URL is required',
        example: '/api/download/ytmp3?url=https://youtube.com/watch?v=VIDEO_ID&quality=128'
      });
    }

    // Validate YouTube URL
    if (!ytdl.validateURL(url)) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid YouTube URL' 
      });
    }

    // Get video info
    const info = await ytdl.getInfo(url);
    const videoId = info.videoDetails.videoId;
    
    // Available qualities (bitrates)
    const availableQualities = [
      { value: '64', label: '64kbps' },
      { value: '128', label: '128kbps' },
      { value: '192', label: '192kbps' },
      { value: '256', label: '256kbps' },
      { value: '320', label: '320kbps' }
    ];
    
    // Validate and get selected quality
    const selectedQuality = availableQualities.find(q => q.value === quality) || availableQualities[1];
    
    // Get audio formats
    const audioFormats = ytdl.filterFormats(info.formats, 'audioonly');
    const highestAudio = audioFormats[0];
    
    // Create download URL (using external service pattern)
    // Note: In production, you might want to use a real conversion service
    const downloadUrl = `https://loader.to/api/download/?url=${encodeURIComponent(url)}&format=mp3&quality=${selectedQuality.value}`;
    
    // Alternative: Use y2mate style URL
    const y2mateStyleUrl = `https://api.y2mate.guru/api/convert?url=${encodeURIComponent(url)}&format=mp3&quality=${selectedQuality.value}`;
    
    // Prepare response
    const response = {
      success: true,
      developer: "Your Name",
      format: "mp3",
      videoId: videoId,
      videoInfo: {
        id: videoId,
        title: info.videoDetails.title,
        author: info.videoDetails.author.name,
        channel: info.videoDetails.author.user,
        duration: {
          seconds: parseInt(info.videoDetails.lengthSeconds),
          formatted: formatDuration(info.videoDetails.lengthSeconds)
        },
        thumbnail: {
          default: info.videoDetails.thumbnails[0]?.url,
          medium: info.videoDetails.thumbnails[1]?.url,
          high: info.videoDetails.thumbnails[info.videoDetails.thumbnails.length - 1]?.url
        },
        views: info.videoDetails.viewCount,
        uploadDate: info.videoDetails.uploadDate,
        description: info.videoDetails.description?.substring(0, 150) + (info.videoDetails.description?.length > 150 ? '...' : ''),
        category: info.videoDetails.category,
        isLive: info.videoDetails.isLiveContent,
        keywords: info.videoDetails.keywords || []
      },
      downloadOptions: {
        selectedQuality: selectedQuality.label,
        estimatedSize: estimateSize(info.videoDetails.lengthSeconds, parseInt(selectedQuality.value)),
        allQualities: availableQualities.map(q => ({
          quality: q.label,
          value: q.value,
          size: estimateSize(info.videoDetails.lengthSeconds, parseInt(q.value)),
          url: `/api/download/ytmp3?url=${encodeURIComponent(url)}&quality=${q.value}`
        }))
      },
      downloadData: {
        url: downloadUrl,
        alternativeUrl: y2mateStyleUrl,
        directStream: highestAudio?.url || null,
        note: "Use the provided URL for download. For direct streaming, use the directStream URL if available."
      },
      apiInfo: {
        timestamp: new Date().toISOString(),
        responseTime: Date.now() - (req.startTime || Date.now()),
        apiVersion: "2.0.0"
      }
    };

    res.json(response);

  } catch (error) {
    console.error('Error processing request:', error);
    
    // Specific error handling
    if (error.message.includes('Video unavailable')) {
      return res.status(404).json({
        success: false,
        error: 'Video not found or unavailable',
        message: 'The requested video might be private, deleted, or not accessible'
      });
    }
    
    if (error.message.includes('Invalid URL')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid YouTube URL format'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to process your request',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined,
      tip: 'Please check the URL and try again. If the problem persists, the video might be restricted.'
    });
  }
};
