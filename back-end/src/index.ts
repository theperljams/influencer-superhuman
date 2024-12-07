// server.js

import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server } from 'socket.io';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO server
const io = new Server(server, {
  cors: {
    origin: '*', // Replace with your Front End's URL in production
    methods: ['GET', 'POST'],
  },
});

// Namespaces
const messagingNamespace = io.of('/messaging');
const frontendNamespace = io.of('/frontend');

// Mock data for responses
const mockResponses = ["Sure!", "Let me check on that.", "Can you clarify?"];

// Handle connections in the Messaging namespace
messagingNamespace.on('connection', (socket) => {
  console.log(`Messaging Client connected: ${socket.id}`);

  // Handle new messages from messaging clients
  socket.on('newMessage', (data) => {
    const { message, sender } = data;

    if (!message || !sender) {
      socket.emit('error', { error: 'Missing "message" or "sender" in "newMessage" event.' });
      return;
    }

    console.log(`Received message: "${message}" from sender: "${sender}"`);

    // Generate mock responses
    const generatedResponses = mockResponses;

    // Emit message and responses to the Front End
    frontendNamespace.emit('newMessage', { message, sender, responses: generatedResponses });

    // Emit message and responses back to the messaging client
    socket.emit('messageResponses', { message, sender, responses: generatedResponses });
  });

  // Handle messages sent from the front end to messaging clients
  socket.on('messageFromFrontend', (data) => {
    const { message, sender } = data;

    if (!message || !sender) {
      socket.emit('error', { error: 'Missing "message" or "sender" in "messageFromFrontend" event.' });
      return;
    }

    console.log(`Message from Frontend to Messaging Client: "${message}" from "${sender}"`);

    // Broadcast the message to all messaging clients
    messagingNamespace.emit('frontendMessage', { message, sender });
  });

  socket.on('disconnect', () => {
    console.log(`Messaging Client disconnected: ${socket.id}`);
  });
});

// Handle connections in the Frontend namespace
frontendNamespace.on('connection', (socket) => {
  console.log(`Frontend connected: ${socket.id}`);

  socket.on('disconnect', () => {
    console.log(`Frontend disconnected: ${socket.id}`);
  });
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
