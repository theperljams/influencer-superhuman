// server.js

import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import http from 'http';
import { Server } from 'socket.io';
import { processChatCompletion } from './llm';
import { insertQAPair } from './db';

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO server with namespaces
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:3000"],
    methods: ["GET", "POST"],
    credentials: true,
    allowedHeaders: ["*"]
  },
  // WebSocket settings
  transports: ['websocket'],
  allowUpgrades: false,
  pingInterval: 10000,
  pingTimeout: 5000,
  cookie: false,
  // Path settings
  path: '/socket.io'
});

// Configure namespaces
const messagingNamespace = io.of('/messaging');
const frontendNamespace = io.of('/frontend');

// Add this interface near the top of the file, after the imports
interface MessageQueueItem {
  message: string;
  timestamp: number;
  responses: string[];
  hashed_sender_name: string;
}

// Update the message queue initialization
let messageQueue: MessageQueueItem[] = [];

// Add interface for workspace data
interface WorkspaceData {
  name: string;
  channels: Array<{ id: string; name: string }>;
  dms: Array<{ id: string; name: string }>;
}

// Handle connections in the Messaging namespace
messagingNamespace.on('connection', (socket) => {
  console.log('Messaging client connected:', socket.id);

  socket.on('newMessage', async (data) => {
    const { content, timestamp, user_id, hashed_sender_name } = data;
    console.log("Received newMessage:", data);

    try {
      // Comment out real processing
      /*
      const generatedResponses = await processChatCompletion(content, user_id, hashed_sender_name, timestamp);

      if (!generatedResponses || generatedResponses.length === 0) {
        socket.emit('error', { error: 'Failed to generate responses.' });
        return;
      }
      */

      // Emit dummy responses instead
      const dummyResponses = [
        "That's a great question! Let me help you with that.",
        "Here's what I think would work best...",
        "Have you considered trying this approach?"
      ];

      // Add message to queue with dummy responses
      messageQueue.push({
        message: content,
        timestamp: timestamp,
        responses: dummyResponses,
        hashed_sender_name: hashed_sender_name,
      });

      // Send to frontend
      frontendNamespace.emit('newMessage', {
        message: content,
        timestamp: timestamp,
        responses: dummyResponses,
        hashed_sender_name: hashed_sender_name,
      });

      // Comment out DB operations
      /*
      await insertQAPair({
        question: content,
        answer: selectedResponse,
        timestamp: timestamp,
        user_id: user_id
      });
      */

      socket.emit('ack', { message: 'Message processed and stored in queue.' });
    } catch (error) {
      console.error('Error processing message:', error);
      socket.emit('error', { error: 'An error occurred while processing the message.' });
    }
  });

  // Listen for 'chatChanged' event from Messaging Client
  socket.on('chatChanged', (data) => {
    const { new_chat_id } = data;
    console.log(`Chat changed to: ${new_chat_id}`);

    // Optionally, clear the messageQueue if it's specific to a chat
    messageQueue = [];

    // Emit 'chatChanged' event to the Front End
    frontendNamespace.emit('chatChanged', { new_chat_id });

    // Acknowledge the Messaging Client
    socket.emit('ack', { message: 'Chat change processed.' });
  });

  socket.on('workspaceUpdate', (data: WorkspaceData) => {
    console.log('Received workspace update:', data);
    // Forward to frontend namespace
    frontendNamespace.emit('workspaceUpdate', data);
  });

  socket.on('selectConversation', (data) => {
    console.log('=== Backend Conversation Selection Flow ===');
    console.log('Received selectConversation event:', data);
    console.log('Forwarding to frontend namespace...');
    frontendNamespace.emit('selectConversation', data);
    console.log('Event forwarded to frontend');
  });

  socket.on('disconnect', () => {
    console.log(`Messaging Client disconnected: ${socket.id}`);
  });
});

// Handle connections in the Front End namespace
frontendNamespace.on('connection', (socket) => {
  console.log('Frontend client connected:', socket.id);

  socket.on('selectConversation', (data) => {
    console.log('=== Backend Conversation Selection Flow ===');
    console.log('Received selectConversation from frontend:', data);
    console.log('Forwarding to messaging namespace...');
    messagingNamespace.emit('selectConversation', data);
    console.log('Event forwarded to messaging client');
  });

  socket.on('ack', (data) => {
    console.log(data);
  });

  socket.on('submitSelectedResponse', (data) => {
    const { selected_response, currMessage, messageTimestamp } = data;

    console.log("Received submitSelectedResponse:", data);

    // Input validation
    if (!selected_response) {
      socket.emit('error', { error: 'Missing "selected_response".' });
      return;
    }

    console.log(`Selected response: ${selected_response}`);
    console.log(`Current message: ${currMessage}`);

    // Acknowledge the Front End
    socket.emit('responseSubmitted', { message: 'Selected response submitted successfully.' });
    console.log("Response submitted to messaging client.");

    // Send the selected response along with the message to the Messaging Client
    messagingNamespace.emit('sendSelectedResponse', {
      'selected_response': selected_response,
      'curr_message': currMessage,
      'message_timestamp': messageTimestamp,
    });

    let QAPair = "";

    if (!currMessage) {
      QAPair = `started conversation with: ${selected_response}`;
    } else {
      QAPair = `message: ${currMessage} response: ${selected_response}`;
    }

    let hashed_sender_name = "default_sender"; // Default value

    if (messageTimestamp) {
      // Retrieve the message from the queue to get hashed_sender_name
      const messageItem = messageQueue.find(
        (item) => item.timestamp === messageTimestamp
      );

      if (messageItem) {
        hashed_sender_name = messageItem.hashed_sender_name;

        // Insert the Q&A pair into the database
        insertQAPair(
          "pearl@easyspeak-aac.com",
          QAPair,
          "pearl_message_test",
          messageTimestamp,
          hashed_sender_name
        );
        console.log("QAPair inserted into database: ", QAPair);
      } else {
        console.error('Message not found in queue for timestamp:', messageTimestamp);
      }

      // Remove the message from the queue
      messageQueue = messageQueue.filter(
        (item) => item.timestamp !== messageTimestamp
      );
    } else {
      // Insert the Q&A pair into the database
      insertQAPair(
        "pearl@easyspeak-aac.com",
        QAPair,
        "pearl_message_test",
        Date.now(),
        hashed_sender_name
      );
      console.log("QAPair inserted into database: ", QAPair);
    }
  });

  socket.on('disconnect', () => {
    console.log(`Front End disconnected: ${socket.id}`);
  });
});

// Start the server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
