const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const { createServer: createViteServer } = require('vite');
const connectDB = require('./config/db');

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

async function startServer() {
  // Create Express app
  const app = express();

  // Body parser
  app.use(express.json());

  // Enable CORS with specific configuration
  app.use(cors({
    origin: true, // Allow any origin in development
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
  }));

  // Route files
  const auth = require('./routes/auth');
  const users = require('./routes/users');
  const students = require('./routes/students');
  const exportRoutes = require('./routes/export');

  // Mount routers
  app.use('/api/auth', auth);
  app.use('/api/users', users);
  app.use('/api/students', students);
  app.use('/api/export', exportRoutes);

  // API Test endpoint
  app.get('/api/test', (req, res) => {
    res.status(200).json({
      success: true,
      message: 'API is working correctly!'
    });
  });

  // Determine environment
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    // In development mode, integrate with Vite development server
    console.log('Starting in DEVELOPMENT mode with integrated Vite server');
    
    // Create Vite server in middleware mode
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });

    // Use Vite's connect instance as middleware
    app.use(vite.middlewares);

    // Handle all other routes with Vite
    app.use('*', async (req, res, next) => {
      if (req.originalUrl.startsWith('/api')) {
        // Skip Vite for API routes and let Express handle it
        return next();
      }
      
      try {
        // Serve index.html through Vite
        const url = req.originalUrl;
        
        // For direct HTML requests, let Vite handle it
        vite.middlewares(req, res, next);
      } catch (e) {
        console.error(e);
        next(e);
      }
    });
  } else {
    // In production mode, serve static assets
    console.log('Starting in PRODUCTION mode with static assets');
    
    // Set static folder
    const buildPath = path.resolve(__dirname, '../dist');
    app.use(express.static(buildPath));

    // For any route that is not an API route, serve the React app
    app.get('*', (req, res) => {
      if (req.url.startsWith('/api')) {
        // Let API routes be handled by the API handlers
        return res.status(404).json({
          success: false,
          error: 'API route not found'
        });
      }
      // Serve the React app for all other routes
      res.sendFile(path.resolve(buildPath, 'index.html'));
    });
  }

  // Error handling middleware (should be after all routes)
  app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  });

  const PORT = process.env.PORT || 3000;

  const server = app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
    console.log(`Visit http://localhost:${PORT} in your browser`);
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (err) => {
    console.error(`Error: ${err.message}`);
    // Close server & exit process
    server.close(() => process.exit(1));
  });
}

// Start the server
startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
}); 