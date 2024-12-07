// src/components/Sidebar.tsx

import React, { useEffect, useState } from 'react';
import { FaChevronDown, FaChevronRight, FaBars } from 'react-icons/fa';
import '../styles/Sidebar.css';

interface SidebarProps {
  selectedPlatform: string | null;
  selectedConversation: string | null;
  onSelectPlatform: (platform: string) => void;
  onSelectConversation: (conversationId: string) => void;
  isSidebarExpanded: boolean; // New prop
  toggleSidebar: () => void; // New prop
}

// Mock conversations data
const mockConversations: { [key: string]: string[] } = {
  Slack: ['John Doe', 'Marketing Channel', 'Support'],
  Discord: ['Gaming Server', 'Study Group', 'Dev Chat'],
  Teams: ['Project A', 'HR Chat', 'Random'],
};

const Sidebar: React.FC<SidebarProps> = ({
  selectedPlatform,
  selectedConversation,
  onSelectPlatform,
  onSelectConversation,
  isSidebarExpanded, // Destructure the new prop
  toggleSidebar, // Destructure the new prop
}) => {
  const [platforms] = useState<string[]>(['Slack', 'Discord', 'Teams']);
  const [expandedPlatforms, setExpandedPlatforms] = useState<{
    [key: string]: boolean;
  }>({});

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
              className={`platform-item ${
                platform === selectedPlatform ? 'selected' : ''
              }`}
              onClick={() => {
                onSelectPlatform(platform);
                if (!isSidebarExpanded) {
                  toggleSidebar(); // Expand sidebar when a platform is selected
                }
              }}
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
                    key={conversation}
                    className={`conversation-item ${
                      conversation === selectedConversation ? 'selected' : ''
                    }`}
                    onClick={() => onSelectConversation(conversation)}
                  >
                    {conversation}
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
