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
    const healthCheck = {
      status: 'healthy',
      service: 'YouTube MP3 Downloader API',
      developer: 'Your Name',
      version: '2.0.0',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      endpoints: {
        'GET /api/download/ytmp3': 'active',
        'GET /api/video/info': 'active',
        'GET /api/search': 'active',
        'GET /api/health': 'active'
      },
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        memoryUsage: process.memoryUsage()
      }
    };

    res.json(healthCheck);

  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};
