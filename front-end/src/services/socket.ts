import { io, Socket } from 'socket.io-client';

class SocketService {
  private static instance: Socket | null = null;
  private static isInitialized = false;

  public static getSocket(): Socket {
    if (!this.instance || !this.isInitialized) {
      this.instance = io('http://localhost:3001/frontend', {
        transports: ['websocket'],
        upgrade: false,
        forceNew: false, // Changed to false to prevent multiple connections
        path: '/socket.io'
      });
      
      this.isInitialized = true;
      
      // Add global error handling
      this.instance.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
      });
    }
    return this.instance;
  }

  public static disconnect() {
    if (this.instance && this.isInitialized) {
      this.instance.disconnect();
      this.instance = null;
      this.isInitialized = false;
    }
  }
}

export default SocketService; 