import React, { useState, useEffect, useRef } from 'react';
import { FaArrowLeft, FaArrowRight } from 'react-icons/fa';
import io from 'socket.io-client';
import '../styles/ChatWindow.css';
import SocketService from '../services/socket';

interface ChatWindowProps {
  selectedConversation: string | null;
  senderName: string | null;
}

interface Message {
  message: string;
  responses: string[];
  timestamp: number;
  sender: string;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ selectedConversation, senderName }) => {
  const [messageIndex, setMessageIndex] = useState<number>(0);
  const [newMessage, setNewMessage] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [status, setStatus] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const socketRef = useRef<any>(null);
  const [isSendingState, setIsSendingState] = useState<boolean>(false);

  const scrollToCurrentMessage = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToCurrentMessage();
  }, [messageIndex, messages]);

  useEffect(() => {
    const socket = SocketService.getSocket();
    socketRef.current = socket;

    // Reset messages when conversation changes
    setMessages([]);
    setMessageIndex(0);

    socket.on('newMessage', (data: any) => {
      console.log('Received newMessage:', data);
      const { message, timestamp, responses, sender } = data;

      setMessages(prevMessages => {
        if (prevMessages.some(msg => msg.timestamp === timestamp)) {
          return prevMessages;
        }
        
        const newMessages = [...prevMessages, {
          message,
          responses,
          timestamp,
          sender
        }];
        newMessages.sort((a, b) => a.timestamp - b.timestamp);
        
        setTimeout(() => setMessageIndex(newMessages.length - 1), 0);
        
        return newMessages;
      });

      setStatus('New message received');
    });

    socket.on('chatChanged', () => {
      setMessages([]);
      setMessageIndex(0);
      setStatus('Switched to new chat');
    });

    socket.on('error', (data: any) => {
      setStatus(`Error: ${data.error}`);
      console.error('Socket error:', data);
    });

    socket.on('ack', (data: any) => {
      setStatus(data.message);
    });

    return () => {
      socket.off('newMessage');
      socket.off('chatChanged');
      socket.off('error');
      socket.off('ack');
    };
  }, [selectedConversation]); // Re-run effect when conversation changes

  const handleSend = () => {
    if (!newMessage.trim() || isSendingState) return;

    setIsSendingState(true);
    setStatus('Sending message...');

    socketRef.current.emit('submitSelectedResponse', {
      selected_response: newMessage,
      currMessage: messages[messageIndex]?.message || '',
      messageTimestamp: messages[messageIndex]?.timestamp || null
    });

    socketRef.current.once('responseSubmitted', () => {
      setNewMessage('');
      setStatus('Message sent');
      setIsSendingState(false);
      
      if (messages[messageIndex]) {
        setMessages(prevMessages => 
          prevMessages.filter(msg => msg.timestamp !== messages[messageIndex].timestamp)
        );
        setMessageIndex(prev => Math.max(0, prev - 1));
      }
    });
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
                <p><strong>{currentMessage.sender}:</strong> {currentMessage.message}</p>
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
              disabled={isSendingState}
            />
            <button 
              className={`send-button ${isSendingState ? 'sending' : ''}`} 
              onClick={handleSend}
              disabled={isSendingState}
            >
              {isSendingState ? 'Sending...' : 'Send'}
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
