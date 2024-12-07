// src/components/ChatWindow.tsx

import React, { useState, useEffect, useRef } from 'react';
import { FaArrowLeft, FaArrowRight } from 'react-icons/fa';
import '../styles/ChatWindow.css';

interface ChatWindowProps {
  conversationId: string | null;
}

// Mock data for messages from senders
const mockMessages: { [key: string]: { sender: string; text: string }[] } = {
  'John Doe': [
    { sender: 'John Doe', text: 'Hey! How are you?' },
    { sender: 'John Doe', text: 'Are you available for a meeting tomorrow?' },
    { sender: 'John Doe', text: 'Please let me know your availability.' },
  ],
  'Marketing Channel': [
    { sender: 'Marketing', text: 'New campaign launched today!' },
    { sender: 'Marketing', text: 'Check out the latest analytics report.' },
  ],
  'Support': [
    { sender: 'Support', text: 'Your issue has been resolved.' },
  ],
  // Add more mock conversations as needed
};

// Mock data for suggested responses
const suggestedResponses: string[] = [
  'Sure, let me check.',
  'Can you provide more details?',
  'I will get back to you shortly.',
];

const ChatWindow: React.FC<ChatWindowProps> = ({ conversationId }) => {
  const [messageIndex, setMessageIndex] = useState<number>(0);
  const [newMessage, setNewMessage] = useState<string>('');
  const [messages, setMessages] = useState<{ sender: string; text: string }[]>([]);
  
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Scroll to the current message when messageIndex changes
  const scrollToCurrentMessage = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToCurrentMessage();
  }, [messageIndex, messages]);

  // Update messages when conversationId changes
  useEffect(() => {
    if (conversationId && mockMessages[conversationId]) {
      setMessages(mockMessages[conversationId]);
      setMessageIndex(mockMessages[conversationId].length > 0 ? 0 : -1);
      setNewMessage('');
    } else {
      setMessages([]);
      setMessageIndex(-1);
      setNewMessage('');
    }
  }, [conversationId]);

  const handleSend = () => {
    if (newMessage.trim() === '') return;

    // Since user messages are not to be displayed, we simply clear the text box
    // In a real application, you'd handle sending the message to the backend here

    // Clear the text box
    setNewMessage('');
  };

  const handleSuggestedResponse = (response: string) => {
    setNewMessage(response); // Populate the text box with the suggested response
  };

  const currentMessage = messageIndex !== -1 ? messages[messageIndex] : null;

  const handlePrev = () => {
    if (messageIndex > 0) {
      setMessageIndex(messageIndex - 1);
    }
  };

  const handleNext = () => {
    if (messageIndex < messages.length - 1) {
      setMessageIndex(messageIndex + 1);
    }
  };

  // Helper function to determine if the textarea should expand
  const isExpanded = (text: string): boolean => {
    return text.length > 50;
  };

  // Get sender's name for the header
  const senderName = conversationId ? messages[0]?.sender || 'Sender' : '';

  return (
    <div className="chat-window">
      {conversationId ? (
        <>
          {/* Header with Sender's Name */}
          <div className="chat-header">
            <h2>{senderName}</h2>
          </div>

          {/* Sender's Messages Display with Navigation Arrows */}
          {currentMessage ? (
            <div className="sender-messages-container">
              {messages.length > 1 && (
                <button
                  className="nav-button"
                  onClick={handlePrev}
                  disabled={messageIndex === 0}
                  aria-label="Previous Message"
                >
                  <FaArrowLeft />
                </button>
              )}
              <div className="sender-message">
                <p>{currentMessage.text}</p>
              </div>
              {messages.length > 1 && (
                <button
                  className="nav-button"
                  onClick={handleNext}
                  disabled={messageIndex === messages.length - 1}
                  aria-label="Next Message"
                >
                  <FaArrowRight />
                </button>
              )}
            </div>
          ) : (
            <div className="no-messages">
              <p>No messages available.</p>
            </div>
          )}

          {/* Suggested Responses */}
          <div className="suggested-responses">
            {suggestedResponses.map((response, index) => (
              <button
                key={index}
                className="suggested-response-button"
                onClick={() => handleSuggestedResponse(response)}
              >
                {response}
              </button>
            ))}
          </div>

          {/* Expandable Text Box with Send Button */}
          <div className="message-input-container">
            <textarea
              className="message-input"
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
