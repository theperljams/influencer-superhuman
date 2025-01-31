import React, { useState, useEffect, useRef } from 'react';
import { FaArrowLeft, FaArrowRight } from 'react-icons/fa';
import io from 'socket.io-client';
import '../styles/ChatWindow.css';

interface ChatWindowProps {
  selectedConversation: string | null;
  senderName: string | null;
}

interface Message {
  sender: string;
  text: string;
  responses: string[];
}

const ChatWindow: React.FC<ChatWindowProps> = ({ selectedConversation, senderName }) => {
  const [messageIndex, setMessageIndex] = useState<number>(0);
  const [newMessage, setNewMessage] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const socketRef = useRef<any>(null);

  const scrollToCurrentMessage = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToCurrentMessage();
  }, [messageIndex, messages]);

  useEffect(() => {
    socketRef.current = io('http://localhost:5000/frontend');

    socketRef.current.on('newMessage', (data: any) => {
      console.log('Received newMessage:', data);

      const { message, sender, responses } = data;
      const newMessage: Message = {
        sender,
        text: message,
        responses,
      };

      if (selectedConversation && sender === selectedConversation) {
        setMessages((prevMessages) => [...prevMessages, newMessage]);
        setMessageIndex((messages.length ?? 0) - 1);
      }
    });

    return () => {
      socketRef.current.disconnect();
    };
  }, [selectedConversation]);

  const handleSend = () => {
    if (newMessage.trim() === '') return;

    socketRef.current.emit('messageFromFrontend', {
      message: newMessage,
      sender: 'You',
    });

    setNewMessage('');
  };

  const handleSuggestedResponse = (response: string) => {
    setNewMessage(response);
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

  const displayName = senderName || 'Unknown Sender';

  return (
    <div className="chat-window">
      {selectedConversation ? (
        <>
          <div className="chat-header">
            <h2>{displayName}</h2>
          </div>
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
                <p><strong>{currentMessage.sender}:</strong> {currentMessage.text}</p>
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
