// src/App.tsx

import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import ChatWindow from './components/ChatWindow';
import './styles/App.css'; // Create this for overall styling

const App: React.FC = () => {
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [senderName, setSenderName] = useState<string | null>(null);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState<boolean>(true);

  const handleSelectPlatform = (platform: string) => {
    setSelectedPlatform(platform);
    setSelectedConversation(null);
    setSenderName(null);
  };

  const handleSelectConversation = (conversationId: string, senderName: string) => {
    setSelectedConversation(conversationId);
    setSenderName(senderName);
  };

  const toggleSidebar = () => {
    setIsSidebarExpanded((prev) => !prev);
  };

  return (
    <div className="app-container">
      <Sidebar
        selectedPlatform={selectedPlatform}
        selectedConversation={selectedConversation}
        onSelectPlatform={handleSelectPlatform}
        onSelectConversation={handleSelectConversation}
        isSidebarExpanded={isSidebarExpanded}
        toggleSidebar={toggleSidebar}
      />
      <ChatWindow
        selectedConversation={selectedConversation}
        senderName={senderName}
      />
    </div>
  );
};

export default App;
