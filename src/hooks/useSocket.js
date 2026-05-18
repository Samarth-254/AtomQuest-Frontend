import { useEffect } from 'react';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';

let socket = null;

export const useSocket = (user, onEventReceived) => {
  useEffect(() => {
    if (!user?.id) return;
    const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    const socketUrl = backendUrl.replace(/\/api\/?$/, '');

    socket = io(socketUrl, {
      withCredentials: true,
      transports: ['websocket', 'polling']
    });

    socket.on('connect', () => {

      socket.emit('join_user_room', user.id);

      if (user.role === 'MANAGER') {
        socket.emit('join_manager_room', user.id);
      }

      if (user.role === 'ADMIN') {
        socket.emit('join_admin_room');
      }
    });

    socket.on('new_notification', (data) => {
      toast(data.message, {
        icon: '🔔',
        duration: 5000
      });
      if (onEventReceived) {
        onEventReceived('new_notification', data);
      }
    });

    socket.on('goal_submitted', (data) => {
      if (onEventReceived) onEventReceived('goal_submitted', data);
    });

    socket.on('goal_approved', (data) => {
      if (onEventReceived) onEventReceived('goal_approved', data);
    });

    socket.on('goal_returned', (data) => {
      if (onEventReceived) onEventReceived('goal_returned', data);
    });

    socket.on('sheet_reopened', (data) => {
      if (onEventReceived) onEventReceived('sheet_reopened', data);
    });

    socket.on('sheet_rejected', (data) => {
      if (onEventReceived) onEventReceived('sheet_rejected', data);
    });

    socket.on('shared_goal_updated', (data) => {
      if (onEventReceived) onEventReceived('shared_goal_updated', data);
    });

    socket.on('checkin_completed', (data) => {
      if (onEventReceived) onEventReceived('checkin_completed', data);
    });

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [user, onEventReceived]);

  return socket;
};
