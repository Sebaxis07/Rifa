import { io } from 'socket.io-client';

const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const apiUrl = import.meta.env.VITE_API_URL || '';
const socketUrl = apiUrl || window.location.origin;

const socket = io(socketUrl, {
  autoConnect: false,
  reconnection: isLocal,
  reconnectionAttempts: isLocal ? Infinity : 2,
  timeout: 4000
});

export default socket;
