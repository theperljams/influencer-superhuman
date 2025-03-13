// src/components/Sidebar.tsx

import React, { useEffect, useState, useRef } from 'react';
import { FaChevronDown, FaChevronRight, FaBars } from 'react-icons/fa';
import '../styles/Sidebar.css';
import io from 'socket.io-client';

// Define the shape of a conversation
interface Conversation {
  id: string;
  name: string;
  type: 'channel' | 'private-channel' | 'dm' | 'group-dm';
}

interface Workspace {
  id: string;
  name: string;
  channels: Conversation[];
  dms: Conversation[];
}

interface WorkspaceData {
  name: string;
  channels: Array<{ id: string; name: string; type: 'channel' }>;
  privateChannels: Array<{ id: string; name: string; type: 'private-channel' }>;
  dms: Array<{ id: string; name: string; type: 'dm' }>;
  groupDms: Array<{ 
    id: string; 
    name: string; 
    type: 'group-dm';
    participants: string[];
  }>;
}

interface SidebarProps {
  selectedPlatform: string | null;
  selectedConversation: string | null;
  onSelectPlatform: (platform: string) => void;
  onSelectConversation: (conversationId: string, senderName: string) => void;
  isSidebarExpanded: boolean;
  toggleSidebar: () => void;
}

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
    [key: string]: { 
      platform: boolean;
      workspaces: { 
        [key: string]: { 
          workspace: boolean; 
          channels: boolean; 
          dms: boolean;
          privateChannels: boolean;
          groupDms: boolean;
        }
      };
    }
  }>({});
  const sidebarRef = useRef<HTMLDivElement>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(250);
  const [workspaces, setWorkspaces] = useState<{ [key: string]: WorkspaceData }>({});

  // Initialize expandedSections when workspaces change
  useEffect(() => {
    const initialExpanded: any = {};
    platforms.forEach((platform) => {
      initialExpanded[platform] = {
        platform: false,
        workspaces: {},
      };
      // Initialize workspace sections for each workspace
      Object.keys(workspaces).forEach((workspaceName) => {
        initialExpanded[platform].workspaces[workspaceName] = {
          workspace: false,
          channels: false,
          dms: false,
          privateChannels: false,
          groupDms: false,
        };
      });
    });
    setExpandedSections(initialExpanded);
  }, [platforms, workspaces]); // Add workspaces as dependency

  useEffect(() => {
    const socket = io('http://localhost:3001/frontend', {
      transports: ['websocket'],
      upgrade: false,
      reconnection: true,
      forceNew: true,
      path: '/socket.io'
    });

    socket.on('connect', () => {
      console.log('Connected to WebSocket server');
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    socket.on('workspaceUpdate', (data: WorkspaceData) => {
      setWorkspaces(prev => ({
        ...prev,
        [selectedPlatform || 'Slack']: data
      }));
    });

    return () => {
      socket.disconnect();
    };
  }, [selectedPlatform]);

  const toggleSection = (
    platform: string,
    section: 'platform' | 'workspace' | 'channels' | 'dms' | 'privateChannels' | 'groupDms',
    workspaceName?: string
  ) => {
    setExpandedSections(prev => {
      const newState = { ...prev };
      if (section === 'platform') {
        newState[platform].platform = !prev[platform].platform;
      } else if (workspaceName) {
        newState[platform].workspaces[workspaceName][section] = 
          !prev[platform].workspaces[workspaceName][section];
      }
      return newState;
    });
  };

  const handleConversationClick = (platform: string, conversation: { id: string; name: string; type: string }) => {
    onSelectConversation(conversation.id, conversation.name);
    if (!isSidebarExpanded) {
      toggleSidebar();
    }
  };

  const startResizing = (e: React.MouseEvent) => {
    setIsResizing(true);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', stopResizing);
  };

  const stopResizing = () => {
    setIsResizing(false);
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', stopResizing);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isResizing && sidebarRef.current) {
      const newWidth = e.clientX;
      if (newWidth >= 60 && newWidth <= 600) { // Min and max width
        setSidebarWidth(newWidth);
      }
    }
  };

  return (
    <div 
      ref={sidebarRef}
      className={`sidebar ${isSidebarExpanded ? 'expanded' : 'collapsed'}`}
      style={{ 
        width: isSidebarExpanded ? `${sidebarWidth}px` : '60px',
        transition: isResizing ? 'none' : 'width 0.3s ease'
      }}
    >
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
                <ul className="workspace-list">
                  {Object.entries(workspaces).map(([name, workspace]) => (
                    <li key={name} className="workspace-item">
                      <div
                        className="workspace-header"
                        onClick={() => toggleSection(platform, 'workspace', name)}
                      >
                        <span>{name}</span>
                        <span className="icon">
                          {expandedSections[platform]?.workspaces[name]?.workspace ? 
                            <FaChevronDown /> : <FaChevronRight />}
                        </span>
                      </div>

                      {expandedSections[platform]?.workspaces[name]?.workspace && (
                        <>
                          {/* Channels Section */}
                          <div
                            className="section-header"
                            onClick={() => toggleSection(platform, 'channels', name)}
                          >
                            <span>Channels</span>
                            <span className="icon">
                              {expandedSections[platform]?.workspaces[name]?.channels ? 
                                <FaChevronDown /> : <FaChevronRight />}
                            </span>
                          </div>
                          {expandedSections[platform]?.workspaces[name]?.channels && (
                            <ul className="conversation-list">
                              {workspace.channels.map((channel) => (
                                <li
                                  key={channel.id}
                                  className={`conversation-item ${
                                    channel.id === selectedConversation ? 'selected' : ''
                                  }`}
                                  onClick={() => handleConversationClick(platform, { ...channel, type: 'channel' })}
                                >
                                  # {channel.name}
                                </li>
                              ))}
                            </ul>
                          )}

                          {/* DMs Section */}
                          <div
                            className="section-header"
                            onClick={() => toggleSection(platform, 'dms', name)}
                          >
                            <span>Direct Messages</span>
                            <span className="icon">
                              {expandedSections[platform]?.workspaces[name]?.dms ? 
                                <FaChevronDown /> : <FaChevronRight />}
                            </span>
                          </div>
                          {expandedSections[platform]?.workspaces[name]?.dms && (
                            <ul className="conversation-list">
                              {workspace.dms.map((dm) => (
                                <li
                                  key={dm.id}
                                  className={`conversation-item ${
                                    dm.id === selectedConversation ? 'selected' : ''
                                  }`}
                                  onClick={() => handleConversationClick(platform, { ...dm, type: 'dm' })}
                                >
                                  @ {dm.name}
                                </li>
                              ))}
                            </ul>
                          )}

                          {/* Private Channels Section */}
                          <div
                            className="section-header"
                            onClick={() => toggleSection(platform, 'privateChannels', name)}
                          >
                            <span>Private Channels</span>
                            <span className="icon">
                              {expandedSections[platform]?.workspaces[name]?.privateChannels ? 
                                <FaChevronDown /> : <FaChevronRight />}
                            </span>
                          </div>
                          {expandedSections[platform]?.workspaces[name]?.privateChannels && (
                            <ul className="conversation-list">
                              {workspace.privateChannels.map((channel) => (
                                <li
                                  key={channel.id}
                                  className={`conversation-item ${
                                    channel.id === selectedConversation ? 'selected' : ''
                                  }`}
                                  onClick={() => handleConversationClick(platform, channel)}
                                >
                                  🔒 {channel.name}
                                </li>
                              ))}
                            </ul>
                          )}

                          {/* Group DMs Section */}
                          <div
                            className="section-header"
                            onClick={() => toggleSection(platform, 'groupDms', name)}
                          >
                            <span>Group DMs</span>
                            <span className="icon">
                              {expandedSections[platform]?.workspaces[name]?.groupDms ? 
                                <FaChevronDown /> : <FaChevronRight />}
                            </span>
                          </div>
                          {expandedSections[platform]?.workspaces[name]?.groupDms && (
                            <ul className="conversation-list">
                              {workspace.groupDms.map((dm) => (
                                <li
                                  key={dm.id}
                                  className={`conversation-item ${
                                    dm.id === selectedConversation ? 'selected' : ''
                                  }`}
                                  onClick={() => handleConversationClick(platform, dm)}
                                >
                                  👥 {dm.participants.join(', ')}
                                </li>
                              ))}
                            </ul>
                          )}
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </li>
        ))}
      </ul>

      {/* Add resize handle */}
      <div 
        className="resize-handle"
        onMouseDown={startResizing}
      />
    </div>
  );
};

export default Sidebar;
