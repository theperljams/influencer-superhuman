// src/index.ts

import express from 'express';
import http from 'http';
import { Server, Socket } from 'socket.io';
import axios, { AxiosResponse } from 'axios';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*', // Adjust this in production to restrict origins
    methods: ['GET', 'POST']
  }
});

// Port configuration
const PORT = process.env.PORT || 5000;

// External API Endpoint (to be implemented separately)
const EXTERNAL_API_ENDPOINT = process.env.EXTERNAL_API_ENDPOINT || 'http://localhost:8000/generate';

// Logging Middleware
io.use((socket: Socket, next) => {
  console.log(`New client connected: ${socket.id}`);
  next();
});

// Socket.IO Connection Event
io.on('connection', (socket: Socket) => {
  console.log(`Client connected: ${socket.id}`);

  // Listen for 'new_message' events from messaging client
  socket.on('new_message', async (data: { sender_name: string; content: string }) => {
    const { sender_name, content } = data;
    console.log(`Received new_message from ${sender_name}: "${content}"`);

    // try {
    //   // Make API call to external endpoint to generate responses
    //   const apiResponse: AxiosResponse<{ responses: string[] }> = await axios.post(EXTERNAL_API_ENDPOINT, { query: content, user_id: "pearl@easyspeak-aac.com", name: "", timestamp: 0 }, {
    //     headers: {
    //       'Content-Type': 'application/json'
    //     },
    //     timeout: 5000 // 5 seconds timeout
    //   });

    //   if (apiResponse.status === 200 && Array.isArray(apiResponse.data.responses)) {
    //     const responses = apiResponse.data.responses;
    //     if (responses.length === 0) {
    //       throw new Error('No responses returned from external API.');
    //     }

    //     // Emit 'response_to_send' events back to messaging client
    //     responses.forEach(response => {
    //       socket.emit('response_to_send', { response });
    //       console.log(`Emitted response_to_send: "${response}"`);
    //     });
    //   } else {
    //     throw new Error(`Unexpected response structure: ${JSON.stringify(apiResponse.data)}`);
    //   }
    // } catch (error) {
    //   if (error instanceof Error) {
    //     console.error('Error calling external API endpoint:', error.message);
    //   } else {
    //     console.error('Error calling external API endpoint:', error);
    //   }

      // Optionally, emit a default response or notify the messaging client of the failure
      const defaultResponses = [
        `Sorry, I couldn't process your message: "${content}"`,
        `Can you please elaborate on "${content}"?`,
        `I'm here to help with "${content}".`
      ];

      defaultResponses.forEach(response => {
        socket.emit('response_to_send', { response });
        console.log(`Emitted default response_to_send: "${response}"`);
      });
  });

  // Listen for 'send_message' events from frontend
  socket.on('send_message', (data: { message: string }) => {
    const { message } = data;
    console.log(`Received send_message from frontend: "${message}"`);

    // Emit a 'send_message_to_client' event to the messaging client
    // Assuming messaging client is connected and listening for this event
    socket.emit('send_message_to_client', { message });
    console.log(`Relayed message to messaging client: "${message}"`);
  });

  // Handle client disconnect
  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

// Remove the dummy API Endpoint
// If you have other endpoints, include them here

// Start the server
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
