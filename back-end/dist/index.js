"use strict";
// server.js
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const cors_1 = __importDefault(require("cors"));
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const llm_1 = require("./llm");
const db_1 = require("./db");
dotenv_1.default.config();
const app = (0, express_1.default)();
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Create HTTP server
const server = http_1.default.createServer(app);
// Initialize Socket.IO server with namespaces
const io = new socket_io_1.Server(server, {
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
// Update the message queue initialization
let messageQueue = [];
// Handle connections in the Messaging namespace
messagingNamespace.on('connection', (socket) => {
    console.log('Messaging client connected:', socket.id);
    socket.on('newMessage', (data) => __awaiter(void 0, void 0, void 0, function* () {
        const { content, timestamp, user_id, hashed_sender_name } = data;
        console.log("Received newMessage:", data);
        try {
            const generatedResponses = yield (0, llm_1.processChatCompletion)(content, user_id, hashed_sender_name, timestamp);
            if (!generatedResponses || generatedResponses.length === 0) {
                socket.emit('error', { error: 'Failed to generate responses.' });
                return;
            }
            // Add message to queue with dummy responses
            messageQueue.push({
                message: content,
                timestamp: timestamp,
                responses: generatedResponses,
                hashed_sender_name: hashed_sender_name,
            });
            // Send to frontend
            frontendNamespace.emit('newMessage', {
                message: content,
                timestamp: timestamp,
                responses: generatedResponses,
                hashed_sender_name: hashed_sender_name,
            });
            socket.emit('ack', { message: 'Message processed and stored in queue.' });
        }
        catch (error) {
            console.error('Error processing message:', error);
            socket.emit('error', { error: 'An error occurred while processing the message.' });
        }
    }));
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
    socket.on('workspaceUpdate', (data) => {
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
    socket.on('sendSelectedResponse', (data) => {
        const { selected_response, curr_message, message_timestamp } = data;
        console.log("Sending response to Slack:", selected_response);
        // After sending to Slack, emit a confirmation
        socket.emit('slackMessageSent', {
            message: 'Message successfully sent to Slack',
            timestamp: message_timestamp
        });
    });
    socket.on('messageSent', (data) => {
        console.log('Message sent status from Slack:', data);
        // Forward to frontend
        frontendNamespace.emit('messageSent', data);
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
        }
        else {
            QAPair = `message: ${currMessage} response: ${selected_response}`;
        }
        let hashed_sender_name = "default_sender"; // Default value
        if (messageTimestamp) {
            // Retrieve the message from the queue to get hashed_sender_name
            const messageItem = messageQueue.find((item) => item.timestamp === messageTimestamp);
            if (messageItem) {
                hashed_sender_name = messageItem.hashed_sender_name;
                // Insert the Q&A pair into the database
                (0, db_1.insertQAPair)("pearl@easyspeak-aac.com", QAPair, "pearl_message_test", messageTimestamp, hashed_sender_name);
                console.log("QAPair inserted into database: ", QAPair);
            }
            else {
                console.error('Message not found in queue for timestamp:', messageTimestamp);
            }
            // Remove the message from the queue
            messageQueue = messageQueue.filter((item) => item.timestamp !== messageTimestamp);
        }
        else {
            // Insert the Q&A pair into the database
            (0, db_1.insertQAPair)("pearl@easyspeak-aac.com", QAPair, "pearl_message_test", Date.now(), hashed_sender_name);
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
