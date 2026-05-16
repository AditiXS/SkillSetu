require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const sequelize = require('./config/database');
const seedDatabase = require('./config/seed');

// Import models (sets up associations)
require('./models');

// Import routes
const authRoutes = require('./routes/authRoutes');
const profileRoutes = require('./routes/profileRoutes');
const communityRoutes = require('./routes/communityRoutes');
const userRoutes = require('./routes/users');
const sessionRoutes = require('./routes/sessions');
const messageRoutes = require('./routes/messages');
const ratingRoutes = require('./routes/ratings');
const creditRoutes = require('./routes/credits');
const notificationRoutes = require('./routes/notifications');
const adminRoutes = require('./routes/admin');

const app = express();
const server = http.createServer(app);

// CORS — allow Railway domains, localhost, and the configured FRONTEND_URL
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  process.env.FRONTEND_URL,
].filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    // Allow any railway.app subdomain or explicitly allowed origins
    if (allowedOrigins.includes(origin) || origin.endsWith('.railway.app')) {
      return callback(null, true);
    }
    callback(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
};

// Socket.io setup
const io = new Server(server, {
  cors: { origin: corsOptions.origin, methods: ['GET', 'POST'] },
});

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


// Routes
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/community', communityRoutes);
app.use('/api/users', userRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/ratings', ratingRoutes);
app.use('/api/credits', creditRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'SkillSetu API is running', timestamp: new Date().toISOString() });
});

// Socket.io — real-time chat
const onlineUsers = new Map();

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join', (userId) => {
    onlineUsers.set(userId, socket.id);
    socket.userId = userId;
    io.emit('online_users', Array.from(onlineUsers.keys()));
  });

  socket.on('join_session', (sessionId) => {
    socket.join(`session_${sessionId}`);
  });

  socket.on('send_message', (data) => {
    io.to(`session_${data.sessionId}`).emit('new_message', data);
  });

  socket.on('typing', (data) => {
    socket.to(`session_${data.sessionId}`).emit('user_typing', data);
  });

  socket.on('stop_typing', (data) => {
    socket.to(`session_${data.sessionId}`).emit('user_stop_typing', data);
  });

  socket.on('session_started', (data) => {
    // Broadcast to everyone else in the session room so their UI flips to active
    socket.to(`session_${data.sessionId}`).emit('session_started', data);
  });

  socket.on('session_ended', (data) => {
    // Broadcast to everyone else in the session room
    socket.to(`session_${data.sessionId}`).emit('session_ended', data);
  });

  // ── WebRTC signaling relay ────────────────────────────────────────────────
  // The server is just a relay — it passes messages between the two peers.
  // All media stays peer-to-peer; only signaling goes through the server.
  socket.on('webrtc_call_start',     (data) => socket.to(`session_${data.sessionId}`).emit('webrtc_incoming_call',  data));
  socket.on('webrtc_call_accept',    (data) => socket.to(`session_${data.sessionId}`).emit('webrtc_call_accepted',  data));
  socket.on('webrtc_call_reject',    (data) => socket.to(`session_${data.sessionId}`).emit('webrtc_call_rejected',  data));
  socket.on('webrtc_offer',          (data) => socket.to(`session_${data.sessionId}`).emit('webrtc_offer',          data));
  socket.on('webrtc_answer',         (data) => socket.to(`session_${data.sessionId}`).emit('webrtc_answer',         data));
  socket.on('webrtc_ice_candidate',  (data) => socket.to(`session_${data.sessionId}`).emit('webrtc_ice_candidate',  data));
  socket.on('webrtc_call_end',       (data) => socket.to(`session_${data.sessionId}`).emit('webrtc_call_ended',     data));
  // ─────────────────────────────────────────────────────────────────────────

  socket.on('disconnect', () => {
    if (socket.userId) {
      onlineUsers.delete(socket.userId);
      io.emit('online_users', Array.from(onlineUsers.keys()));
    }
    console.log('User disconnected:', socket.id);
  });
});

// Start server
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Only attempt to create database if we are NOT using a single connection string
    if (!process.env.DATABASE_URL) {
      try {
        const mysql = require('mysql2/promise');
        const connection = await mysql.createConnection({
          host: process.env.DB_HOST,
          port: process.env.DB_PORT,
          user: process.env.DB_USER,
          password: process.env.DB_PASSWORD,
        });
        await connection.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME}\`;`);
        await connection.end();
        console.log('📦 Database ensured');
      } catch (dbErr) {
        console.log('⚠️ Could not auto-create database (may already exist or insufficient permissions)');
      }
    }

    await sequelize.authenticate();
    console.log('✅ Database connected successfully.');

    // Sync models
    await sequelize.sync({ alter: true });
    console.log('✅ Database synced.');

    // Seed data
    await seedDatabase();

    server.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('❌ Unable to connect to MySQL:', err.message);
    console.log('\n📌 Make sure MySQL is running and check .env credentials.\n');
    process.exit(1);
  }
};

if (require.main === module) {
  startServer();
}

module.exports = { app, server, startServer };
