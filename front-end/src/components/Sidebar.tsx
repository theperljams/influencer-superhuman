// src/components/Sidebar.tsx

import React, { useEffect, useState } from 'react';
import { FaChevronDown, FaChevronRight, FaBars } from 'react-icons/fa';
import '../styles/Sidebar.css';

// Define the shape of a conversation
interface Conversation {
  id: string;
  senderName: string;
}

interface SidebarProps {
  selectedPlatform: string | null;
  selectedConversation: string | null;
  onSelectPlatform: (platform: string) => void;
  onSelectConversation: (conversationId: string, senderName: string) => void;
  isSidebarExpanded: boolean;
  toggleSidebar: () => void;
}

// Mock conversations data
const mockConversations: { [key: string]: Conversation[] } = {
  Instagram: [
    { id: 'insta-1', senderName: 'andrew' },
    { id: 'insta-2', senderName: 'Savannah' },
    { id: 'insta-3', senderName: 'Jared' },
  ],
  X: [
    { id: 'x-1', senderName: 'Alex' },
    { id: 'x-2', senderName: 'Taylor' },
    { id: 'x-3', senderName: 'Morgan' },
  ],
};

const Sidebar: React.FC<SidebarProps> = ({
  selectedPlatform,
  selectedConversation,
  onSelectPlatform,
  onSelectConversation,
  isSidebarExpanded,
  toggleSidebar,
}) => {
  const [platforms] = useState<string[]>(['Instagram', 'X']);
  const [expandedPlatforms, setExpandedPlatforms] = useState<{ [key: string]: boolean }>({});

  // Initialize expanded state when platforms change
  useEffect(() => {
    const initialExpanded: { [key: string]: boolean } = {};
    platforms.forEach((platform) => {
      initialExpanded[platform] = false; // Default to collapsed
    });
    setExpandedPlatforms(initialExpanded);
  }, [platforms]);

  const togglePlatform = (platform: string) => {
    setExpandedPlatforms((prev) => ({
      ...prev,
      [platform]: !prev[platform],
    }));
  };

  const handleConversationClick = (platform: string, conversation: Conversation) => {
    onSelectConversation(conversation.id, conversation.senderName);
    if (!isSidebarExpanded) {
      toggleSidebar(); // Expand sidebar when a conversation is selected
    }
  };

  return (
    <div className={`sidebar ${isSidebarExpanded ? 'expanded' : 'collapsed'}`}>
      {/* Sidebar Header with Toggle Button */}
      <div className="sidebar-header">
        {isSidebarExpanded && <h3>Platforms</h3>}
        <button
          className="toggle-button"
          onClick={toggleSidebar}
          aria-label={isSidebarExpanded ? 'Collapse Sidebar' : 'Expand Sidebar'}
        >
          <FaBars />
        </button>
      </div>

      {/* Platform List */}
      <ul className="platform-list">
        {platforms.map((platform) => (
          <li key={platform}>
            <div
              className={`platform-item ${platform === selectedPlatform ? 'selected' : ''}`}
              onClick={() => onSelectPlatform(platform)}
            >
              <div
                className="platform-header"
                onClick={(e) => {
                  e.stopPropagation(); // Prevent platform selection when toggling
                  togglePlatform(platform);
                }}
                role="button"
                aria-expanded={expandedPlatforms[platform]}
                tabIndex={0}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    togglePlatform(platform);
                  }
                }}
              >
                {/* Optionally, add platform icons here */}
                {isSidebarExpanded && <span>{platform}</span>}
                <span className="icon">
                  {expandedPlatforms[platform] ? <FaChevronDown /> : <FaChevronRight />}
                </span>
              </div>
            </div>
            {expandedPlatforms[platform] && isSidebarExpanded && (
              <ul className="conversation-list">
                {mockConversations[platform].map((conversation) => (
                  <li
                    key={conversation.id}
                    className={`conversation-item ${
                      conversation.id === selectedConversation ? 'selected' : ''
                    }`}
                    onClick={() => handleConversationClick(platform, conversation)}
                  >
                    {conversation.senderName}
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Sidebar;
