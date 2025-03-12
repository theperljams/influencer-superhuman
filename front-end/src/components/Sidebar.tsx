// src/components/Sidebar.tsx

import React, { useEffect, useState } from 'react';
import { FaChevronDown, FaChevronRight, FaBars } from 'react-icons/fa';
import '../styles/Sidebar.css';

// Define the shape of a conversation
interface Conversation {
  id: string;
  senderName: string;
  type: 'channel' | 'dm';
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
const mockConversations: { [key: string]: { channels: Conversation[], dms: Conversation[] } } = {
  Slack: {
    channels: [
      { id: 'channel-1', senderName: 'general', type: 'channel' },
      { id: 'channel-2', senderName: 'random', type: 'channel' },
      { id: 'channel-3', senderName: 'development', type: 'channel' },
    ],
    dms: [
      { id: 'dm-1', senderName: 'andrew', type: 'dm' },
      { id: 'dm-2', senderName: 'sarah', type: 'dm' },
      { id: 'dm-3', senderName: 'mike', type: 'dm' },
    ],
  },
};

const Sidebar: React.FC<SidebarProps> = ({
  selectedPlatform,
  selectedConversation,
  onSelectPlatform,
  onSelectConversation,
  isSidebarExpanded,
  toggleSidebar,
}) => {
  const [platforms] = useState<string[]>(['Slack']);
  const [expandedSections, setExpandedSections] = useState<{
    [key: string]: { platform: boolean; channels: boolean; dms: boolean }
  }>({});

  useEffect(() => {
    const initialExpanded: { [key: string]: { platform: boolean; channels: boolean; dms: boolean } } = {};
    platforms.forEach((platform) => {
      initialExpanded[platform] = { platform: false, channels: false, dms: false };
    });
    setExpandedSections(initialExpanded);
  }, [platforms]);

  const toggleSection = (platform: string, section: 'platform' | 'channels' | 'dms') => {
    setExpandedSections((prev) => ({
      ...prev,
      [platform]: {
        ...prev[platform],
        [section]: !prev[platform]?.[section],
      },
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
            <div className="platform-item">
              <div
                className="platform-header"
                onClick={() => toggleSection(platform, 'platform')}
              >
                {isSidebarExpanded && <span>{platform}</span>}
                <span className="icon">
                  {expandedSections[platform]?.platform ? <FaChevronDown /> : <FaChevronRight />}
                </span>
              </div>
              
              {expandedSections[platform]?.platform && isSidebarExpanded && (
                <>
                  {/* Channels Section */}
                  <div
                    className="section-header"
                    onClick={() => toggleSection(platform, 'channels')}
                  >
                    <span>Channels</span>
                    <span className="icon">
                      {expandedSections[platform]?.channels ? <FaChevronDown /> : <FaChevronRight />}
                    </span>
                  </div>
                  {expandedSections[platform]?.channels && (
                    <ul className="conversation-list">
                      {mockConversations[platform].channels.map((channel) => (
                        <li
                          key={channel.id}
                          className={`conversation-item ${
                            channel.id === selectedConversation ? 'selected' : ''
                          }`}
                          onClick={() => handleConversationClick(platform, channel)}
                        >
                          # {channel.senderName}
                        </li>
                      ))}
                    </ul>
                  )}

                  {/* DMs Section */}
                  <div
                    className="section-header"
                    onClick={() => toggleSection(platform, 'dms')}
                  >
                    <span>Direct Messages</span>
                    <span className="icon">
                      {expandedSections[platform]?.dms ? <FaChevronDown /> : <FaChevronRight />}
                    </span>
                  </div>
                  {expandedSections[platform]?.dms && (
                    <ul className="conversation-list">
                      {mockConversations[platform].dms.map((dm) => (
                        <li
                          key={dm.id}
                          className={`conversation-item ${
                            dm.id === selectedConversation ? 'selected' : ''
                          }`}
                          onClick={() => handleConversationClick(platform, dm)}
                        >
                          @ {dm.senderName}
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Sidebar;
