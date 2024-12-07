// src/components/ChatWindow.tsx

import React, { useState, useEffect, useRef } from 'react';
import { FaArrowLeft, FaArrowRight } from 'react-icons/fa';
import '../styles/ChatWindow.css';
import { io, Socket } from 'socket.io-client';

interface ChatWindowProps {
  conversationId: string | null;
}

// Define the structure of a message
interface Message {
  sender: string;
  text: string;
  timestamp: string; // Optional: Add timestamp if needed
}

const ChatWindow: React.FC<ChatWindowProps> = ({ conversationId }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState<string>('');
  const [currentMessageIndex, setCurrentMessageIndex] = useState<number>(-1);
  const [socket, setSocket] = useState<Socket | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Scroll to the latest message
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Initialize Socket.IO connection
  useEffect(() => {
    const newSocket = io('http://localhost:5000'); // Replace with your backend URL if different
    setSocket(newSocket);

    // Listen for 'response_to_send' events from the backend
    newSocket.on('response_to_send', (data: { response: string }) => {
      const responseMessage: Message = {
        sender: 'Auto-responder',
        text: data.response,
        timestamp: new Date().toISOString(),
      };
      setMessages((prevMessages) => [...prevMessages, responseMessage]);
    });

    // Listen for 'send_message_to_client' events from the backend
    newSocket.on('send_message_to_client', (data: { message: string }) => {
      const userMessage: Message = {
        sender: 'You',
        text: data.message,
        timestamp: new Date().toISOString(),
      };
      setMessages((prevMessages) => [...prevMessages, userMessage]);
    });

    // Clean up the socket connection on component unmount
    return () => {
      newSocket.disconnect();
    };
  }, []);

  // Update messages when conversationId changes
  useEffect(() => {
    if (conversationId) {
      // Clear existing messages when a new conversation is selected
      setMessages([]);
      setNewMessage('');
      setCurrentMessageIndex(-1);
    }
  }, [conversationId]);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = () => {
    if (newMessage.trim() === '' || !socket) return;

    // Create a message object for the user
    const userMessage: Message = {
      sender: 'You',
      text: newMessage.trim(),
      timestamp: new Date().toISOString(),
    };

    // Emit the message to the backend
    socket.emit('send_message', { message: userMessage.text });

    // Add the message to the local state
    setMessages((prevMessages) => [...prevMessages, userMessage]);

    // Clear the input field
    setNewMessage('');
  };

  const handleSuggestedResponse = (response: string) => {
    setNewMessage(response); // Populate the input with the suggested response
  };

  const handlePrev = () => {
    if (currentMessageIndex > 0) {
      setCurrentMessageIndex(currentMessageIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentMessageIndex < messages.length - 1) {
      setCurrentMessageIndex(currentMessageIndex + 1);
    }
  };

  // Determine if the textarea should expand based on message length
  const isExpanded = (text: string): boolean => {
    return text.length > 50;
  };

  return (
    <div className="chat-window">
      {conversationId ? (
        <>
          {/* Header with Sender's Name */}
          <div className="chat-header">
            <h2>Chat</h2> {/* You can customize this to display the conversation name */}
          </div>

          {/* Messages Display with Navigation Arrows */}
          {messages.length > 0 ? (
            <div className="messages-container">
              {/* Navigation Arrows */}
              <div className="navigation-buttons">
                <button
                  className="nav-button"
                  onClick={handlePrev}
                  disabled={currentMessageIndex <= 0}
                  aria-label="Previous Message"
                >
                  <FaArrowLeft />
                </button>
                <button
                  className="nav-button"
                  onClick={handleNext}
                  disabled={currentMessageIndex >= messages.length - 1}
                  aria-label="Next Message"
                >
                  <FaArrowRight />
                </button>
              </div>

              {/* Display Current Message */}
              {currentMessageIndex !== -1 && messages[currentMessageIndex] ? (
                <div className="message">
                  <div className="sender">{messages[currentMessageIndex].sender}:</div>
                  <div className="text">{messages[currentMessageIndex].text}</div>
                </div>
              ) : (
                <div className="no-messages">No messages to display.</div>
              )}
            </div>
          ) : (
            <div className="no-messages">No messages in this conversation.</div>
          )}

          {/* Suggested Responses */}
          <div className="suggested-responses">
            {messages.length > 0 && (
              <>
                {/** You can customize the suggested responses based on the latest message */}
                <button
                  className="suggested-response-button"
                  onClick={() => handleSuggestedResponse('Sure, let me check.')}
                >
                  Sure, let me check.
                </button>
                <button
                  className="suggested-response-button"
                  onClick={() => handleSuggestedResponse('Can you provide more details?')}
                >
                  Can you provide more details?
                </button>
                <button
                  className="suggested-response-button"
                  onClick={() => handleSuggestedResponse('I will get back to you shortly.')}
                >
                  I will get back to you shortly.
                </button>
              </>
            )}
          </div>

          {/* Expandable Text Box with Send Button */}
          <div className="message-input-container">
            <textarea
              className={`message-input ${isExpanded(newMessage) ? 'expanded' : ''}`}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message..."
              rows={isExpanded(newMessage) ? 3 : 1}
            />
            <button className="send-button" onClick={handleSend}>
              Send
            </button>
          </div>

          {/* Scroll Anchor */}
          <div ref={messagesEndRef} />
        </>
      ) : (
        <div className="no-conversation">
          <h2>Select a conversation to start chatting</h2>
        </div>
      )}
    </div>
  );
};

export default ChatWindow;
