// src/components/Sidebar.tsx

import React, { useEffect, useState, useRef } from 'react';
import { FaChevronDown, FaChevronRight, FaBars } from 'react-icons/fa';
import '../styles/Sidebar.css';
import io from 'socket.io-client';
import SocketService from '../services/socket';

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
  dms: Array<{ id: string; name: string; type: 'dm' }>;
  privateChannels: Array<{ id: string; name: string; type: 'private' }>;
  groupDms: Array<{ id: string; name: string; participants: string[]; type: 'group' }>;
}

interface ExpandedState {
  platform: boolean;
  workspace: { [key: string]: boolean };
  channels: { [key: string]: boolean };
  dms: { [key: string]: boolean };
  privateChannels: { [key: string]: boolean };
  groupDms: { [key: string]: boolean };
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
  const [expandedState, setExpandedState] = useState<ExpandedState>({
    platform: false,
    workspace: {},
    channels: {},
    dms: {},
    privateChannels: {},
    groupDms: {}
  });
  const [workspaces, setWorkspaces] = useState<{ [key: string]: WorkspaceData }>({});
  const [status, setStatus] = useState<string>('');
  const sidebarRef = useRef<HTMLDivElement>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(250);

  // Remove the useEffect for expandedSections initialization

  useEffect(() => {
    const socket = SocketService.getSocket();
    
    socket.on('connect', () => {
      console.log('Connected to WebSocket server');
      setStatus('Connected');
    });

    socket.on('workspaceUpdate', (data: WorkspaceData) => {
      console.log('Received workspace update:', data);
      setWorkspaces(prev => ({
        ...prev,
        [data.name]: data
      }));
      setStatus('Workspace updated');
    });

    socket.on('error', (error: any) => {
      console.error('Socket error:', error);
      setStatus(`Error: ${error.message}`);
    });

    socket.on('disconnect', (reason: string) => {
      console.log('Disconnected:', reason);
      setStatus(`Disconnected: ${reason}`);
    });

    return () => {
      // Only remove listeners, don't disconnect
      socket.off('connect');
      socket.off('workspaceUpdate');
      socket.off('error');
      socket.off('disconnect');
    };
  }, []);

  const toggleSection = (
    section: 'platform' | 'workspace' | 'channels' | 'dms' | 'privateChannels' | 'groupDms',
    id?: string
  ) => {
    console.log('Toggling:', section, id);
    setExpandedState(prev => {
      if (section === 'platform') {
        return { ...prev, platform: !prev.platform };
      }
      if (id) {
        return {
          ...prev,
          [section]: {
            ...prev[section],
            [id]: !prev[section][id]
          }
        };
      }
      return prev;
    });
  };

  const handleConversationClick = (
    platform: string, 
    conversation: { 
      id: string; 
      name: string; 
      type: 'channel' | 'private' | 'dm' | 'group';
      participants?: string[];
    }
  ) => {
    console.log('=== Frontend Conversation Selection Flow ===');
    
    console.log('Emitting selectConversation event:', conversation);
    const socket = SocketService.getSocket();
    socket.emit('selectConversation', {
      id: conversation.id,
      name: conversation.name,
      type: conversation.type
    }, '/frontend');
    console.log('Event emitted to backend');

    console.log('Updating local state...');
    onSelectConversation(conversation.id, conversation.name);
    
    if (!isSidebarExpanded) {
      console.log('Expanding sidebar...');
      toggleSidebar();
    }
    
    console.log('Conversation selection complete');
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
      <div className="sidebar-header">
        {isSidebarExpanded && (
          <>
            <h3>Platforms</h3>
            <span className="status-indicator">{status}</span>
          </>
        )}
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
                onClick={() => toggleSection('platform')}
              >
                {isSidebarExpanded && <span>{platform}</span>}
                <span className="icon">
                  {expandedState.platform ? <FaChevronDown /> : <FaChevronRight />}
                </span>
              </div>
              
              {expandedState.platform && isSidebarExpanded && (
                <ul className="workspace-list">
                  {Object.entries(workspaces).map(([name, workspace]) => (
                    <li key={name} className="workspace-item">
                      <div
                        className="workspace-header"
                        onClick={() => toggleSection('workspace', name)}
                      >
                        <span>{name}</span>
                        <span className="icon">
                          {expandedState.workspace[name] ? <FaChevronDown /> : <FaChevronRight />}
                        </span>
                      </div>

                      {expandedState.workspace[name] && (
                        <>
                          {/* Channels Section */}
                          <div
                            className="section-header"
                            onClick={() => toggleSection('channels', name)}
                          >
                            <span>Channels</span>
                            <span className="icon">
                              {expandedState.channels[name] ? <FaChevronDown /> : <FaChevronRight />}
                            </span>
                          </div>
                          {expandedState.channels[name] && (
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
                            onClick={() => toggleSection('dms', name)}
                          >
                            <span>Direct Messages</span>
                            <span className="icon">
                              {expandedState.dms[name] ? <FaChevronDown /> : <FaChevronRight />}
                            </span>
                          </div>
                          {expandedState.dms[name] && (
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

                          {/* Add after the DMs section */}
                          <div
                            className="section-header"
                            onClick={() => toggleSection('privateChannels', name)}
                          >
                            <span>Private Channels</span>
                            <span className="icon">
                              {expandedState.privateChannels[name] ? <FaChevronDown /> : <FaChevronRight />}
                            </span>
                          </div>
                          {expandedState.privateChannels[name] && (
                            <ul className="conversation-list">
                              {workspace.privateChannels?.map((channel) => (
                                <li
                                  key={channel.id}
                                  className={`conversation-item ${
                                    channel.id === selectedConversation ? 'selected' : ''
                                  }`}
                                  onClick={() => handleConversationClick(platform, { ...channel, type: 'private' })}
                                >
                                  🔒 {channel.name}
                                </li>
                              ))}
                            </ul>
                          )}

                          <div
                            className="section-header"
                            onClick={() => toggleSection('groupDms', name)}
                          >
                            <span>Group DMs</span>
                            <span className="icon">
                              {expandedState.groupDms[name] ? <FaChevronDown /> : <FaChevronRight />}
                            </span>
                          </div>
                          {expandedState.groupDms[name] && (
                            <ul className="conversation-list">
                              {workspace.groupDms?.map((dm) => (
                                <li
                                  key={dm.id}
                                  className={`conversation-item ${
                                    dm.id === selectedConversation ? 'selected' : ''
                                  }`}
                                  onClick={() => handleConversationClick(platform, { ...dm, type: 'group' })}
                                >
                                  👥 {dm.name}
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
