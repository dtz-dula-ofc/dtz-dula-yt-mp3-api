const ytdl = require('ytdl-core');

const formatDuration = (seconds) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
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
    const { url, id } = req.query;
    let videoUrl = url;
    
    if (!videoUrl && id) {
      videoUrl = `https://www.youtube.com/watch?v=${id}`;
    }
    
    if (!videoUrl) {
      return res.status(400).json({
        success: false,
        error: 'YouTube URL or ID is required',
        example: '/api/video/info?url=https://youtube.com/watch?v=VIDEO_ID'
      });
    }

    if (!ytdl.validateURL(videoUrl)) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid YouTube URL' 
      });
    }

    const info = await ytdl.getInfo(videoUrl);
    
    // Get available formats
    const formats = {
      audio: ytdl.filterFormats(info.formats, 'audioonly').map(f => ({
        itag: f.itag,
        mimeType: f.mimeType,
        bitrate: f.audioBitrate,
        quality: f.audioQuality || 'Unknown',
        size: f.contentLength ? `${(f.contentLength / 1024 / 1024).toFixed(2)} MB` : 'Unknown',
        url: f.url
      })),
      video: ytdl.filterFormats(info.formats, 'videoonly').map(f => ({
        itag: f.itag,
        mimeType: f.mimeType,
        quality: f.qualityLabel,
        fps: f.fps,
        size: f.contentLength ? `${(f.contentLength / 1024 / 1024).toFixed(2)} MB` : 'Unknown'
      })),
      audioWithVideo: ytdl.filterFormats(info.formats, 'audioandvideo').map(f => ({
        itag: f.itag,
        mimeType: f.mimeType,
        quality: f.qualityLabel,
        audioBitrate: f.audioBitrate,
        size: f.contentLength ? `${(f.contentLength / 1024 / 1024).toFixed(2)} MB` : 'Unknown'
      }))
    };

    const response = {
      success: true,
      developer: "Your Name",
      videoInfo: {
        id: info.videoDetails.videoId,
        title: info.videoDetails.title,
        author: {
          name: info.videoDetails.author.name,
          id: info.videoDetails.author.id,
          url: info.videoDetails.author.channel_url,
          subscriberCount: info.videoDetails.author.subscriber_count,
          verified: info.videoDetails.author.verified
        },
        duration: {
          seconds: parseInt(info.videoDetails.lengthSeconds),
          formatted: formatDuration(info.videoDetails.lengthSeconds)
        },
        thumbnails: info.videoDetails.thumbnails.map((t, i) => ({
          url: t.url,
          width: t.width,
          height: t.height,
          quality: t.quality
        })),
        statistics: {
          views: info.videoDetails.viewCount,
          likes: info.videoDetails.likes,
          averageRating: info.videoDetails.averageRating
        },
        metadata: {
          uploadDate: info.videoDetails.uploadDate,
          publishDate: info.videoDetails.publishDate,
          category: info.videoDetails.category,
          isLive: info.videoDetails.isLiveContent,
          isFamilySafe: info.videoDetails.isFamilySafe,
          isUnlisted: info.videoDetails.isUnlisted,
          isPrivate: info.videoDetails.isPrivate,
          hasCaptions: info.videoDetails.hasCaptions,
          keywords: info.videoDetails.keywords || []
        },
        description: info.videoDetails.description
      },
      availableFormats: formats,
      relatedVideos: info.related_videos ? info.related_videos.slice(0, 5).map(v => ({
        id: v.id || v.videoId,
        title: v.title,
        author: v.author,
        duration: v.length_seconds ? formatDuration(v.length_seconds) : 'Unknown',
        views: v.view_count
      })) : [],
      apiInfo: {
        timestamp: new Date().toISOString(),
        apiVersion: "2.0.0"
      }
    };

    res.json(response);

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch video information',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
