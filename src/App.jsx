import { Analytics } from '@vercel/analytics/react';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import AppRoutes from './routes/AppRoutes';

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: { fontSize: '13px', borderRadius: '8px', fontFamily: 'Inter, sans-serif' },
            success: { iconTheme: { primary: '#00685f', secondary: '#fff' } },
            error:   { iconTheme: { primary: '#b91c1c', secondary: '#fff' } },
          }}
        />
        <AppRoutes />
        <Analytics />
      </SocketProvider>
    </AuthProvider>
  );
}