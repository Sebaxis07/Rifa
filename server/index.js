require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE'] }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Guardar io en app para usarlo en rutas
app.set('io', io);

// Rutas
const auth = require('./routes/auth');
app.use('/api/auth', auth.router);
app.use('/api/rifas', require('./routes/rifas'));
app.use('/api/compras', require('./routes/compras'));
app.use('/api/analytics', require('./routes/analytics'));

// Socket.IO
io.on('connection', (socket) => {
  console.log('🔌 Cliente conectado:', socket.id);

  socket.on('join_rifa', (rifaId) => {
    socket.join(rifaId);
    console.log(`📌 Socket ${socket.id} se unió a rifa: ${rifaId}`);
  });

  socket.on('leave_rifa', (rifaId) => {
    socket.leave(rifaId);
  });

  socket.on('disconnect', () => {
    console.log('❌ Cliente desconectado:', socket.id);
  });
});

// MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB conectado');
    auth.seedAdmin();
  })
  .catch(err => {
    console.error('❌ Error MongoDB:', err.message);
  });

// Start local server if not on Vercel
if (!process.env.VERCEL) {
  server.listen(process.env.PORT || 5000, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${process.env.PORT || 5000}`);
  });
}

module.exports = app;
