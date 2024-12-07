// src/App.tsx

import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import ChatWindow from './components/ChatWindow';
import './App.css';

const App: React.FC = () => {
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState<boolean>(true); // Sidebar toggle state

  const toggleSidebar = () => {
    setIsSidebarExpanded((prev) => !prev);
  };

  return (
    <div className="app-container">
      <Sidebar
        selectedPlatform={selectedPlatform}
        selectedConversation={selectedConversation}
        onSelectPlatform={(platform) => {
          setSelectedPlatform(platform);
          setSelectedConversation(null); // Reset conversation when platform changes
        }}
        onSelectConversation={setSelectedConversation}
        isSidebarExpanded={isSidebarExpanded} // Pass the state
        toggleSidebar={toggleSidebar} // Pass the toggle function
      />
      <ChatWindow conversationId={selectedConversation} />
    </div>
  );
};

export default App;
