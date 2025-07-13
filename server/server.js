import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  maxHttpBufferSize: 1e7
});

app.use(cors());

const MESSAGES_PER_PAGE = 15;

let onlineUsers = {};
let userRooms = {};
let roomMessages = {
  general: [],
  sports: [],
  tech: [],
  random: []
};

app.get('/', (req, res) => {
  res.send('Chat server running...');
});

io.on('connection', (socket) => {
  console.log(`🔌 Connected: ${socket.id}`);

  socket.on('login', (username) => {
    socket.username = username;
    onlineUsers[socket.id] = username;
    userRooms[socket.id] = 'general';
    socket.join('general');

    io.to('general').emit('onlineUsers', getUsersInRoom('general'));
    socket.broadcast.to('general').emit('notification', `${username} joined general chat`);

    sendRecentMessages(socket, 'general');
  });

  socket.on('joinRoom', (room) => {
    const prevRoom = userRooms[socket.id];
    socket.leave(prevRoom);
    socket.join(room);
    userRooms[socket.id] = room;

    socket.emit('notification', `Switched to room: ${room}`);
    io.to(room).emit('onlineUsers', getUsersInRoom(room));

    sendRecentMessages(socket, room);
  });

  socket.on('loadMore', ({ room, page }) => {
    const messages = roomMessages[room] || [];
    const start = Math.max(0, messages.length - MESSAGES_PER_PAGE * (page + 1));
    const end = messages.length - MESSAGES_PER_PAGE * page;
    const older = messages.slice(start, end);
    socket.emit('olderMessages', older);
  });

  socket.on('chatMessage', ({ text, room }) => {
    const msg = {
      sender: socket.username,
      text,
      timestamp: new Date().toISOString(),
      room
    };
    roomMessages[room].push(msg);
    io.to(room).emit('chatMessage', msg);
  });

  socket.on('uploadFile', ({ file, fileName, room }) => {
    const msg = {
      sender: socket.username,
      file,
      fileName,
      timestamp: new Date().toISOString(),
      room
    };
    roomMessages[room].push(msg);
    io.to(room).emit('fileMessage', msg);
  });

  socket.on('typing', (room) => {
    socket.broadcast.to(room).emit('typing', socket.username);
  });

  socket.on('stopTyping', (room) => {
    socket.broadcast.to(room).emit('stopTyping', socket.username);
  });

  socket.on('reactMessage', ({ messageId, reaction, room }) => {
    io.to(room).emit('messageReaction', {
      messageId,
      user: socket.username,
      reaction
    });
  });

  socket.on('disconnect', () => {
    const username = socket.username;
    const room = userRooms[socket.id];
    delete onlineUsers[socket.id];
    delete userRooms[socket.id];
    io.to(room).emit('onlineUsers', getUsersInRoom(room));
    if (username) {
      socket.broadcast.to(room).emit('notification', `${username} left the chat`);
    }
    console.log(`❌ Disconnected: ${socket.id}`);
  });
});

function getUsersInRoom(room) {
  return Object.entries(userRooms)
    .filter(([_, r]) => r === room)
    .map(([id]) => onlineUsers[id]);
}

function sendRecentMessages(socket, room) {
  const all = roomMessages[room] || [];
  const recent = all.slice(-MESSAGES_PER_PAGE);
  socket.emit('initialMessages', recent);
}

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
