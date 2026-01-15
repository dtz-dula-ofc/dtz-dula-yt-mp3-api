const express = require('express');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'YouTube MP3 Downloader API',
    developer: 'Your Name',
    version: '2.0.0',
    endpoints: {
      mp3Download: '/api/download/ytmp3?url=YOUTUBE_URL&quality=128',
      videoInfo: '/api/video/info?url=YOUTUBE_URL',
      search: '/api/search?q=QUERY&limit=10',
      health: '/api/health'
    },
    example: '/api/download/ytmp3?url=https://youtube.com/watch?v=dQw4w9WgXcQ&quality=192',
    note: 'Replace "Your Name" with your actual name in the response'
  });
});

// API routes
app.get('/api', (req, res) => {
  res.json({
    status: 'active',
    service: 'YouTube MP3 Downloader API',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    availableEndpoints: [
      'GET /api/download/ytmp3',
      'GET /api/video/info',
      'GET /api/search',
      'GET /api/health'
    ]
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Export for Vercel serverless function
module.exports = app;
