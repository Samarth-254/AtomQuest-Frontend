import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export const useSocketContext = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [lastEvent, setLastEvent] = useState(null);

  useEffect(() => {
    if (!user?.id) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      return;
    }

    const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    const socketUrl = backendUrl.replace(/\/api\/?$/, '');

    const newSocket = io(socketUrl, {
      withCredentials: true,
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      newSocket.emit('join_user_room', user.id);
      
      if (user.role === 'MANAGER') {
        newSocket.emit('join_manager_room', user.id);
      }
      if (user.role === 'ADMIN') {
        newSocket.emit('join_admin_room');
      }
    });

    const handleEvent = (event, data) => {
      setLastEvent({ event, data, timestamp: Date.now() });

      // Trigger custom browser event so any listening component can refresh
      const customEvent = new CustomEvent('app_socket_event', { detail: { event, data } });
      window.dispatchEvent(customEvent);
    };

    newSocket.on('new_notification', (data) => {
      toast(data.message, {
        icon: '🔔',
        duration: 5000
      });
      handleEvent('new_notification', data);
    });

    newSocket.on('goal_submitted', (data) => handleEvent('goal_submitted', data));
    newSocket.on('goal_approved', (data) => handleEvent('goal_approved', data));
    newSocket.on('goal_returned', (data) => handleEvent('goal_returned', data));
    newSocket.on('sheet_reopened', (data) => handleEvent('sheet_reopened', data));
    newSocket.on('sheet_rejected', (data) => handleEvent('sheet_rejected', data));
    newSocket.on('checkin_completed', (data) => handleEvent('checkin_completed', data));
    
    newSocket.on('shared_goal_updated', (data) => {
      handleEvent('shared_goal_updated', data);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [user]);

  return (
    <SocketContext.Provider value={{ socket, lastEvent }}>
      {children}
    </SocketContext.Provider>
  );
};
