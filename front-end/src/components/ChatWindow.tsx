import React, { useState, useEffect, useRef } from 'react';
import { FaArrowLeft, FaArrowRight } from 'react-icons/fa';
import io from 'socket.io-client';
import '../styles/ChatWindow.css';

interface ChatWindowProps {
  selectedConversation: string | null;
  conversationId: string | null;
}

interface Message {
  sender: string;
  text: string;
  responses: string[];
}

const ChatWindow: React.FC<ChatWindowProps> = ({ conversationId }) => {
  const [messageIndex, setMessageIndex] = useState<number>(0);
  const [newMessage, setNewMessage] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Socket connection reference
  const socketRef = useRef<any>(null);

  // Scroll to the current message when messageIndex changes
  const scrollToCurrentMessage = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToCurrentMessage();
  }, [messageIndex, messages]);

  useEffect(() => {
    // Initialize Socket.IO client for the frontend namespace
    socketRef.current = io('http://localhost:5000/frontend');

    // Listen for 'newMessage' event
    socketRef.current.on('newMessage', (data: any) => {
      console.log('Received newMessage:', data);

      const { message, sender, responses, timestamp } = data;
      const newMessage: Message = {
        sender,
        text: message,
        responses,
      };

      // Only add the message if the sender matches the current conversationId
      if (conversationId && sender === conversationId) {
        setMessages((prevMessages) => {
          const updatedMessages = [...prevMessages, newMessage];
          return updatedMessages;
        });

        // Automatically set the index to the latest message if it's new
        setMessageIndex((messages.length ?? 0) - 1);
      }
    });

    // Clean up the socket connection on unmount
    return () => {
      socketRef.current.disconnect();
    };
  }, [conversationId]);

  const handleSend = () => {
    if (newMessage.trim() === '') return;

    // Emit the new message to the backend
    socketRef.current.emit('messageFromFrontend', {
      message: newMessage,
      sender: 'You', // Adjust the sender name as needed
    });

    // Clear the input field
    setNewMessage('');
  };

  const handleSuggestedResponse = (response: string) => {
    setNewMessage(response); // Populate the text box with the suggested response
  };

  const currentMessage = messages[messageIndex] || null;

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

  const isExpanded = (text: string): boolean => {
    return text.length > 50;
  };

  const senderName = conversationId || 'Sender';

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
          {currentMessage && (
            <div className="suggested-responses">
              {currentMessage.responses.map((response, index) => (
                <button
                  key={index}
                  className="suggested-response-button"
                  onClick={() => handleSuggestedResponse(response)}
                >
                  {response}
                </button>
              ))}
            </div>
          )}
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
